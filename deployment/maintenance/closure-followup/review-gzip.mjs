// Two specific upstream repairs, verified against exact live native payloads.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const q=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(q,scan);assert.equal(scan.status,'checked');
const release=read(dir+'/gzip-release.json');assert.equal(release.status,'passed');const rows=overlayRows(release);
const descendants=[];
for(const file of ['sqlite-fts-release.json','urllib3-release.json'])if(fs.existsSync(dir+'/'+file)){const later=read(dir+'/'+file);assert.equal(later.status,'passed');descendants.push(...overlayRows(later));}
const primary=read(dir+'/debian-primary.json');assert(Date.now()-Date.parse(primary.date)<86400000);
const specs=read(new URL('./gzip-specs.json',import.meta.url));
const cache=new Map,decisions=[],proofs=[],skipped=[];
for(const item of q.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.package==='gzip'&&['CVE-2026-41991','CVE-2026-41992'].includes(i.id))){
 try{
  const spec=specs.find(s=>s.containers.includes(item.containers[0]));assert(spec);
  const b=read(dir+'/gzip/'+spec.key+'/build.json'),n=read(dir+'/gzip/'+spec.key+'/native.json');assert(b.passed&&b.configurationUnchanged&&n.passed&&n.nativeStreamsAndIntegrity&&n.nativeGzexeAndZgrep&&n.sharedLibrariesUnchanged);assert.equal(n.imageId,b.imageId);assert.equal(item.installed,b.version);
  for(const name of item.containers){let row=rows.find(r=>r.name===name&&r.newImage===b.imageId);assert(row&&Date.parse(row.completedAt)<=Date.parse(scan.date));for(const next of descendants){if(next.name===name&&next.oldImage===row.newImage){assert(Date.parse(next.completedAt)<=Date.parse(scan.date));row=next;}}assert.equal(row.newImage,item.artifact);assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact);}
  const file=dir+(spec.suite==='noble'?'/gzip-ubuntu/':'/gzip-bookworm/')+'gzip_'+b.version+'_amd64.deb';assert.equal(sha(fs.readFileSync(file)),b.packageSha256);
  if(spec.suite==='bookworm'){
   assert.equal(primary.sources.gzip?.[item.id]?.releases?.sid?.fixed_version,'1.14-1');assert.equal(n.upstreamPassed,30);assert.equal(n.upstreamSkipped,0);
  }else assert(fs.readFileSync(dir+'/gzip-ubuntu/package-index.txt','utf8').includes('SHA256: '+b.packageSha256));
  if(!cache.has(item.artifact)){
   const temp=fs.mkdtempSync('/dev/shm/utilibre-gzip-proof-');const manifest=[];
   try{
    run('dpkg-deb',['-x',file,temp]);
    for(const leaf of fs.readdirSync(temp+'/usr/bin')){
     const path='/usr/bin/'+leaf,stat=fs.lstatSync(temp+path);assert(stat.isFile()||stat.isSymbolicLink());
     const expected=stat.isSymbolicLink()?fs.readlinkSync(temp+path):sha(fs.readFileSync(temp+path));
     for(const name of item.containers){assert.equal(run('docker',['exec',name,'dpkg-query','-W','-f=${Version}','gzip']),b.version);const actual=stat.isSymbolicLink()?run('docker',['exec',name,'readlink',path]):run('docker',['exec',name,'sha256sum',path]).split(/\s/)[0];assert.equal(actual,expected);}
     manifest.push({path,...(stat.isSymbolicLink()?{link:expected}:{sha256:expected})});
    }
    assert(manifest.some(x=>x.path==='/usr/bin/gzip'));assert(manifest.some(x=>x.path==='/usr/bin/gzexe'));
    if(spec.suite==='noble'){const changelog=cp.execFileSync('gzip',['-dc',temp+'/usr/share/doc/gzip/changelog.Debian.gz'],{encoding:'utf8'}).split('\n -- ')[0];for(const id of ['CVE-2026-41991','CVE-2026-41992'])assert(changelog.includes(id));}
   }finally{fs.rmSync(temp,{recursive:true});}
   cache.set(item.artifact,manifest);
  }
  const reason=`Exact live gzip ${b.version} executable/script/symlink payload matches native/vendor package SHA256 ${b.packageSha256}. ${spec.suite==='bookworm'?'Authenticated Debian 1.14-1 source includes the upstream fixes; rebuilt against Bookworm with 30/30 unprivileged upstream tests passing.':'Signed Ubuntu noble-security 1.12-1ubuntu3.2 changelog explicitly fixes both CVEs.'} Old/new isolated compression, concatenation, stream, integrity rejection, original preservation, zgrep and gzexe checks pass. Application/configuration/shared-library bytes unchanged and completed exact-image release verified. https://security-tracker.debian.org/tracker/${item.id} ; https://ubuntu.com/security/${item.id} . Proof: closure-followup-20261012/gzip-review.json. Only this finding, not an assertion of a complete adversarial decoder test.`;
  decisions.push(validateDecision({key:item.key,status:'mitigated',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));proofs.push({key:item.key,artifact:item.artifact,packageSha256:b.packageSha256,manifest:cache.get(item.artifact)});
 }catch(e){skipped.push({id:item.id,key:item.key,reason:e.message.slice(0,150)});}
}
fs.writeFileSync(dir+'/gzip-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
