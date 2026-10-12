// Exact repaired CLI payload review. Does not suppress raw scan results.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {authenticateArchive,payloadManifest,validatePayload} from '../vendor-leaves-final/dhi-proof.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',root='/var/lib/utilibre-maintenance/';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const q=read(root+'security-queue.json'),scan=read(root+'security.json');freshScan(q,scan);
const release=read(dir+'/ncurses-release.json');assert.equal(release.status,'passed');
const regression=read(dir+'/ncurses-regression.json');assert(regression.passed&&regression.rows.length===4);
assert(regression.rows.filter(r=>r.kind==='old').every(r=>r.exitCode===134&&r.overflowDetected));
assert(regression.rows.filter(r=>r.kind==='patched').every(r=>r.exitCode===0&&r.nativePassed));
const host=read(dir+'/ncurses-host.json');assert.equal(host.status,'passed');
assert(host.nativeRoundTripAndBoundaryPassed&&host.coreLibraryAndServicePidsUnchanged);
const rows=overlayRows(release),specs=new Map;
for(const s of JSON.parse(fs.readFileSync(new URL('./ncurses-specs.json',import.meta.url)))){
 const b=read(dir+'/ncurses/'+s.key+'/build.json'),n=read(dir+'/ncurses/'+s.key+'/native.json');
 assert(b.passed&&n.passed&&n.longSgrInput&&n.sharedLibrariesUnchanged);assert.equal(n.imageId,b.imageId);
 const matched=s.containers.map(name=>rows.find(r=>r.name===name&&r.oldImage===s.base&&r.newImage===b.imageId));assert(matched.every(Boolean));
 assert(matched.every(r=>Date.parse(r.completedAt)<=Date.parse(scan.date)));
 specs.set(b.imageId,{version:b.version,checksum:b.packageSha256,suite:s.suite,containers:s.containers});
}
specs.set('host-dpkg',{version:host.version,checksum:host.packageSha256,suite:'trixie',containers:[]});
if(fs.existsSync(dir+'/rsync-release.json')){
 const r=read(dir+'/rsync-release.json');assert.equal(r.status,'passed');
 for(const row of overlayRows(r)){
  const prior=specs.get(row.oldImage);assert(prior);assert.deepEqual(prior.containers,[row.name]);
  assert(Date.parse(row.completedAt)<=Date.parse(scan.date));
  specs.set(row.newImage,prior);
 }
}
// These two pre-existing DHI images already shipped the same repaired package.
// Re-check bytes and native behavior; no claim that our CLI overlay updated them.
const exporter=read(dir+'/expat-release.json').groups.find(g=>g.key==='penpot-exporter');assert.equal(exporter.status,'passed');
for(const [image,name] of [['sha256:ca4f4adc5367a40e1597bea7d6032de0d08266b6d65cdf083ae4c695d54d23a7','utilibre-expanded-penpot-frontend-1'],[exporter.newImage,'utilibre-expanded-penpot-exporter-1']])
 specs.set(image,{version:'6.5+20250216-2+dhi4',checksum:'54821f5e17572f0badc7059efefb54fb54d9e8a28449274f478735314f22474d',suite:'trixie',containers:[name]});
for(const receipt of ['util-linux-release.json','curl-release.json','gzip-release.json'])if(fs.existsSync(dir+'/'+receipt)){
 const report=read(dir+'/'+receipt);assert.equal(report.status,'passed');
 for(const row of overlayRows(report)){
  const prior=specs.get(row.oldImage);if(!prior)continue;
  assert(prior.containers.includes(row.name));assert(Date.parse(row.completedAt)<=Date.parse(scan.date));
  specs.set(row.newImage,prior);
 }
}
const manifests=new Map,proofs=[],decisions=[],skipped=[];
for(const item of q.items){
 if(item.status!=='needs-review'||item.id!=='CVE-2025-69720'||item.package!=='ncurses-bin'||item.type!=='debian')continue;
 const s=specs.get(item.artifact);if(!s)continue;
 try{
  assert.deepEqual([...item.containers].sort(),[...s.containers].sort());
  const isHost=item.scope==='host-os';assert.equal(isHost,item.artifact==='host-dpkg');
  assert.equal(isHost?scan.host.status:scan.images.find(x=>x.id===item.artifact)?.status,'checked');
  if(isHost)assert(Date.parse(host.completedAt)<=Date.parse(scan.date));
  const deb=dir+(s.suite==='trixie'?'/ncurses-dhi/':'/ncurses-bookworm/')+'ncurses-bin_'+s.version+'_amd64.deb';
  assert.equal(sha(fs.readFileSync(deb)),s.checksum);
  if(s.suite==='trixie')authenticateArchive(fs.readFileSync(dir+'/ncurses-dhi/package-index.txt','utf8'),'ncurses-bin',s.version,s.checksum);
  if(!manifests.has(s.checksum)){
   const temp=fs.mkdtempSync('/dev/shm/utilibre-ncurses-proof-');
   try{
    run('dpkg-deb',['-x',deb,temp]);
    // Minimal base images intentionally omit documentation through dpkg
    // path-excludes. Verify every executable and executable symlink; missing
    // changelogs are not missing security fixes, nor are docs part of this claim.
    const payload=payloadManifest(temp).filter(f=>/^\/(?:usr\/)?bin\//.test(f.path));
    assert(payload.length>=9&&payload.some(f=>f.path==='/usr/bin/infocmp'));
    manifests.set(s.checksum,payload);
   }finally{fs.rmSync(temp,{recursive:true});}
  }
  const expected=manifests.get(s.checksum),observations=[];
  for(const name of isHost?[null]:s.containers){
   if(name){assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact);assert.equal(run('docker',['inspect','--format','{{.State.Running}}',name]),'true');}
   const command=(p,a)=>isHost?run(p,a):run('docker',['exec',name,p,...a]);
   assert.equal(command('dpkg-query',['-W','-f=${Version}','ncurses-bin']),s.version);
   const observed=expected.map(f=>f.type==='file'?{...f,sha256:command('sha256sum',['--',f.path]).split(/\s+/)[0]}:{...f,target:command('readlink',['--',f.path])});
   observations.push({name,payloadSha256:validatePayload(expected,observed)});
  }
  const reason=`CVE-2025-69720 fixed in the exact installed ncurses-bin ${s.version} CLI payload, not a source-package version waiver. Every shipped executable/symlink matches authenticated DHI or checksum-pinned native Bookworm backport; documentation is outside this payload claim. Original and patched Debian 12/13 infocmp tested with identical synthetic long CSI input: old aborts on overflow, repaired binary passes; terminal export/import also passes. Library ABI and app files unchanged. Live image ${item.artifact}; package SHA256 ${s.checksum}. https://invisible-island.net/ncurses/NEWS.html#index-t20251213 . Receipts: closure-followup-20261012/ncurses-regression.json and ncurses-review.json. Raw scanner records and other CVEs retained.`;
  decisions.push(validateDecision({key:item.key,status:'mitigated',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
  proofs.push({key:item.key,image:item.artifact,version:s.version,packageSha256:s.checksum,observations});
 }catch(e){skipped.push({key:item.key,artifact:item.artifact,reason:e.message.slice(0,150)});}
}
fs.writeFileSync(dir+'/ncurses-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
