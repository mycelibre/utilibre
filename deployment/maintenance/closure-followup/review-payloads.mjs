// Review the exact installed repair bytes against the source vendor's fixed
// versions, not the older base-distribution vulnerability range. Prepare only.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',root=path.dirname(dir);
process.umask(0o077);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,args)=>cp.execFileSync(p,args,{encoding:'utf8',timeout:60000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json'),primary=read(dir+'/debian-primary.json');
assert.equal(queue.scanDate,scan.completedAt);assert.equal(scan.status,'checked');assert(Date.now()-Date.parse(scan.completedAt)<86400000);assert(Date.now()-Date.parse(primary.date)<86400000);
const release=read(dir+'/expat-release.json');assert.equal(release.status,'passed');assert.equal(read(dir+'/host-release.json').status,'passed');assert.equal(read(dir+'/host-live.json').status,'passed');
// Follow only the two reviewed library overlays, never an arbitrary new image.
const descendants=[];
for(const file of ['cache-release.json','apache-release.json','ncurses-release.json','util-linux-release.json','curl-release.json','gzip-release.json']){
 if(!fs.existsSync(dir+'/'+file))continue;
 const r=read(dir+'/'+file);assert.equal(r.status,'passed');
 for(const group of r.groups){assert.equal(group.status,'passed');
  for(const row of group.rows||[group])if(row.oldImage!==row.newImage)
   descendants.push({...row,receipt:file,completedAt:group.completedAt});
 }
}
function originalRelease(name,image){
 const seen=new Set;
 while(!seen.has(image)){
  seen.add(image);
  const original=release.groups.find(g=>g.name===name&&g.newImage===image&&g.status==='passed');if(original)return original;
  const row=descendants.find(r=>r.name===name&&r.newImage===image);if(!row)return null;
  assert(Date.parse(row.completedAt)<=Date.parse(scan.date));image=row.oldImage;
 }
 return null;
}
const specs=[
 ['apache2','2.4.69-1','apache2_2.4.69-1_amd64.deb','5634fa84f75196b2dd59d6b6583c5af604c62aab5e60d9176ccc8823a2df96fb','apache2'],
 ['apache2-bin','2.4.69-1','apache2-bin_2.4.69-1_amd64.deb','c12e6ddb209d5942b09001c1a04581092e4bf40fa51bf9d2605eb6ed5117b600','apache2'],
 ['apache2-data','2.4.69-1','apache2-data_2.4.69-1_all.deb','d13853426e0142cf189f74560d75352c16d7237f7d63d033e723a39d5f7169ee','apache2'],
 ['apache2-utils','2.4.69-1','apache2-utils_2.4.69-1_amd64.deb','7ebea0fd9538107344fc6de6b612b5a6f1c3705db15255b1c9886d4ab388daa9','apache2'],
 ['libxml2-16','2.15.4+dfsg-1','libxml2-16_2.15.4+dfsg-1_amd64.deb','36f043b5014adf26ff722f693361d1d677088d1eb384fe4522ad514b52053c88','libxml2'],
 ['libexpat1','2.9.0-1','libexpat1_2.9.0-1_amd64.deb','190d7f5e45f070c42a12f708fe417d6636cb45fae71175203168bb5c3695081b','expat'],
 ['vim','2:9.2.0858-1','vim_2%3a9.2.0858-1_amd64.deb','a146e1522011659f2a60420ec3958be9f7dc30e6aa396b0da37a5eb8fbc301c0','vim'],
 ['vim-tiny','2:9.2.0858-1','vim-tiny_2%3a9.2.0858-1_amd64.deb','df2d037d405f1376d1d8025d022dba81fbfed8695f68a131b788d16d3b68cf83','vim'],
 ['vim-common','2:9.2.0858-1','vim-common_2%3a9.2.0858-1_all.deb','c21aad77632ef790d2352f1c38e688069980bbd530034248dd5e1158da9c9fe3','vim'],
 ['vim-runtime','2:9.2.0858-1','vim-runtime_2%3a9.2.0858-1_all.deb','1421e29be1730c7aebd055b52d22d86b0305785d155006a9a30e156558774e77','vim'],
];
function files(d,prefix=''){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(d+'/'+e.name,prefix+'/'+e.name):e.isFile()?[prefix+'/'+e.name]:[]);}
const decisions=[],proofs=[],skipped=[],cache=new Map;
for(const item of queue.items.filter(i=>i.status==='needs-review'&&['HIGH','CRITICAL'].includes(i.severity))){
 const spec=specs.find(s=>s[0]===item.package);if(!spec||item.type!=='debian')continue;
 const [pkg,version,file,hash,source]=spec,host=item.scope==='host-os';
 const apacheXml=(pkg==='libxml2-16'||source==='apache2')&&item.containers.length===1&&item.containers[0]==='utilibre-services-freshrss-1'&&originalRelease(item.containers[0],item.artifact);
 if(!host&&!apacheXml&&(pkg!=='libexpat1'||!item.containers.every(n=>originalRelease(n,item.artifact))))continue;
 try{
  const fixed=primary.sources[source]?.[item.id]?.releases?.sid;assert.equal(fixed?.status,'resolved');assert(fixed.fixed_version&&fixed.fixed_version!=='0');run('dpkg',['--compare-versions',version,'ge',fixed.fixed_version]);
  const key=item.artifact+'|'+pkg;
  if(!cache.has(key)){
   const deb=dir+'/sources/'+file;assert.equal(sha(fs.readFileSync(deb)),hash);assert.equal(run('dpkg-deb',['-f',deb,'Package']),pkg);assert.equal(run('dpkg-deb',['-f',deb,'Version']),version);
   const temp=fs.mkdtempSync(dir+'/payload-');let manifest;
   try{
    run('dpkg-deb',['-x',deb,temp]);
    // Debian's postinst may coalesce documentation under vim-common. Compare
    // all shipped code/runtime files, not mutable/shared changelog packaging.
    const paths=files(temp).filter(p=>pkg==='libxml2-16'?/^\/usr\/lib\/.*libxml2\.so\.[\d.]+$/.test(p):pkg==='libexpat1'?/^\/usr\/lib\/.*libexpat\.so\.[\d.]+$/.test(p):p.startsWith('/usr/')&&!p.startsWith('/usr/share/doc/')&&!(source==='apache2'&&(p.startsWith('/usr/share/lintian/')||p.startsWith('/usr/share/man/')))&&!(pkg==='vim-tiny'&&p.startsWith('/usr/share/vim/vim92/doc/')));
    // FreshRSS's existing slim-image dpkg policy omits lintian overrides and
    // manpages. They are documentation/packaging, not Apache runtime code.
    // The full vim-runtime package legitimately replaces tiny's three minimal
    // help files; its separate signed payload check covers the installed help.
    assert(paths.length);manifest=paths.map(p=>({path:p,sha256:sha(fs.readFileSync(temp+p))}));
    for(const name of host?[null]:item.containers){
     const cmd=(p,a)=>host?run(p,a):run('docker',['exec',name,p,...a]);
     if(!host){assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact);assert(originalRelease(name,item.artifact));}
     assert.equal(cmd('dpkg-query',['-W','-f=${Version}',pkg]),version);
     for(const m of manifest)assert.equal(host?sha(fs.readFileSync(m.path)):cmd('sha256sum',[m.path]).split(/\s/)[0],m.sha256);
     if(name?.includes('penpot-'))assert.equal(cmd('sha256sum',['/opt/imagick/lib/deps/libexpat.so.1']).split(/\s/)[0],manifest[0].sha256);
    }
   }finally{assert(path.dirname(temp)===dir&&path.basename(temp).startsWith('payload-'));fs.rmSync(temp,{recursive:true});}
   cache.set(key,{artifact:item.artifact,package:pkg,version,debSha256:hash,manifest,manifestSha256:sha(JSON.stringify(manifest))});
  }
  const proof=cache.get(key);
  const reason=`Debian primary source-package tracker marks ${item.id} fixed in ${fixed.fixed_version}; deployed ${pkg} ${version} is newer/equal. Live executable/library/runtime payload matches signed Debian artifact SHA256 ${hash}; payload manifest ${proof.manifestSha256}. Exact candidate/live native checks and release: deployment/maintenance/closure-followup/README.md; private closure-followup-20261012/payload-review.json. Base-distribution or older embedded inventory matching is retained raw, not treated as proof that the repaired bytes are vulnerable. https://security-tracker.debian.org/tracker/${item.id} . No exemption for other versions/CVEs or complete services.`;
  decisions.push(validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
  proofs.push({id:item.id,key:item.key,fixedVersion:fixed.fixed_version,...proof});
 }catch(e){skipped.push({id:item.id,package:pkg,artifact:item.artifact,reason:e.message.slice(0,120)});}
}
fs.writeFileSync(dir+'/payload-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
