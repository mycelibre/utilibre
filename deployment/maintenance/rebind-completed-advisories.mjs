// Emit a reviewable patch for unchanged application-advisory dispositions.
// Explicit tested releases only; never changes dependency decisions or scanner data.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceImagePins} from './language-final/release.mjs';
import {replaceRedlibDefaultPin,replaceRedlibEnvPin,redlibNew,redlibOld} from './mount-acl-final/ubuntu-pins.mjs';
const root='/var/lib/utilibre-maintenance';
const read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const file=new URL('./advisory-reviews.json',import.meta.url).pathname;
const original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original),releases=[];
function add(path,verify){
 const r=read(path);assert.equal(r.status,'passed');assert(Number.isFinite(Date.parse(r.completedAt)));verify(r);
 const groups=r.groups||r.rows.map(row=>({status:row.status,completedAt:row.completedAt,files:row.files,rows:[row]}));
 for(const g of groups){assert.equal(g.status,'passed');for(const row of g.rows){assert(row.status===undefined||row.status==='passed');assert(row.name&&row.oldImage&&row.newImage&&row.oldRef&&row.newRef);}}
 releases.push({path,...r,groups});
}
add('archive-tar-final-20261012/release.json',r=>{
 const path='archive-tar-final-20261012/stage.json',s=read(path);assert.equal(s.status,'passed');assert.equal(r.stageSha256,hash(fs.readFileSync(root+'/'+path)));
 assert.equal(s.rows.length,5);for(const row of s.rows){assert(row.nativeSuite&&row.nativeCli&&row.configurationUnchanged&&row.unrelatedPackagesUnchanged);assert.equal(row.upstreamTests,'Files=12, Tests=1709');assert(r.groups.some(g=>g.rows.some(v=>v.name===row.name&&v.oldImage===row.base&&v.newImage===row.image)));}
});
for(const dir of ['coturn-bson-final-20261012','kuma-crypto-final-20261012'])add(dir+'/release.json',r=>{
 const s=read(dir+'/stage.json'),a=read(dir+'/application.json');assert.equal(s.status,'passed');assert.equal(a.status,'passed');assert(s.configurationUnchanged&&s.unrelatedPackagesUnchanged&&s.priorRuntimeBytesUnchanged);
 assert.equal(a.stageSha256,hash(fs.readFileSync(root+'/'+dir+'/stage.json')));
 for(const[p,h]of Object.entries(r.proofs))assert.equal(hash(fs.readFileSync(root+'/'+dir+'/'+p+'.json')),h);
 const rows=r.rows||r.groups.flatMap(g=>g.rows);assert(rows.every(row=>row.oldImage===s.base&&row.newImage===s.image&&row.oldRef===s.baseRef&&row.newRef===s.candidate));
});
for(const suffix of [...['actual','gathio','rallly','kuma','wishlist','resume','rssbridge','cryptpad'].map(k=>'images/'+k),'ubuntu-images/addy','ubuntu-images/redlib']){
 const dir='mount-acl-final-20261012/'+suffix,path=dir+'/release.json';
 if(!fs.existsSync(root+'/'+path)||read(path).status!=='passed')continue;
 add(path,r=>{
  const s=read(dir+'/stage.json'),a=read(dir+'/application.json'),c=read(dir+'/consumer.json');
  assert.equal(s.status,'passed');assert(s.configurationUnchanged&&s.unrelatedPackagesUnchanged&&s.priorRuntimeBytesUnchanged&&a.passed&&c.passed);assert.equal(a.imageId,s.image);assert.equal(c.imageId,s.image);assert.equal(c.cases.length,6);
  for(const label of ['stage','application','consumer'])assert.equal(r.proofs[label],hash(fs.readFileSync(root+'/'+dir+'/'+label+'.json')));
  assert(r.groups.some(g=>g.rows.some(row=>row.name===s.name&&row.oldImage===s.base&&row.newImage===s.image)));
 });
}
const bracesDir='application-leaves-final-20261012/braces',braces=read(bracesDir+'/release.json'),integration=read(bracesDir+'/integration.json'),app=read(bracesDir+'/application.json');
const xvfbPath='xvfb-single-screen-final-20261012/release.json';
if(fs.existsSync(root+'/'+xvfbPath)&&read(xvfbPath).status==='passed'){
 const {gates}=await import('./xvfb-single-screen-final/proofs.mjs');
 const proof=gates();
 add(xvfbPath,r=>{
  assert(r.backendFrontendAndDataUntouched);assert.equal(r.groups.length,1);
  const g=r.groups[0];assert.deepEqual(g.proofs,proof.proofs);assert.equal(g.rows.length,1);
  const row=g.rows[0];assert.equal(row.name,proof.stage.container);
  assert.equal(row.oldImage,proof.stage.base);assert.equal(row.newImage,proof.stage.image);
  assert.equal(row.oldRef,proof.stage.baseRef);assert.equal(row.newRef,proof.stage.candidate);
 });
}
assert.equal(braces.status,'passed');assert(integration.passed&&app.passed&&app.completed&&app.disposableStateRemoved);
assert.equal(braces.groups.length,1);assert.equal(braces.groups[0].status,'passed');
for(const p of ['source.json','integration.json','checks.json','application.json','source-offer.json'])assert.equal(braces.groups[0].proofs[root+'/'+bracesDir+'/'+p],hash(fs.readFileSync(root+'/'+bracesDir+'/'+p)));
for(const[p,v]of Object.entries(integration.files))assert.equal(hash(fs.readFileSync(integration.liveRoot+'/'+p)),v.after);
releases.sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));
const rows=releases.flatMap(r=>r.groups.flatMap(g=>g.rows));
for(const review of Object.values(reviews)){
 let changed=false;
 for(const[name,before]of Object.entries(review.containers||{})){
  let image=before;for(const row of rows)if('/'+row.name===name&&row.oldImage===image)image=row.newImage;
  const live=cp.execFileSync('docker',['inspect',name,'--format','{{.Image}}'],{encoding:'utf8'}).trim();assert.equal(live,image,'Unreviewed image change');
  if(image!==before){review.containers[name]=image;changed=true;}
 }
 for(const[name,before]of Object.entries(review.files||{})){
  const bytes=fs.readFileSync(name),after=hash(bytes);if(after===before)continue;
  if(name===integration.liveRoot+'/package.json'||name===integration.liveRoot+'/package-lock.json'){
   const p=integration.files[name.slice(integration.liveRoot.length+1)];assert.equal(p.before,before);assert.equal(p.after,after);
  }else{
   assert(releases.some(r=>r.groups.some(g=>[...(g.files||[]),...(g.mirrorFiles||[])].includes(name))));
   let text=bytes.toString(),matched=false;
   for(const release of [...releases].reverse()){
    const pairs=release.groups.filter(g=>[...(g.files||[]),...(g.mirrorFiles||[])].includes(name)).flatMap(g=>g.rows.filter(r=>r.newRef!==r.oldRef).map(r=>({from:r.newRef,to:r.oldRef})));
    for(const pair of pairs){
     if(pair.from===redlibNew&&pair.to===redlibOld&&name==='/home/ubuntu/freetools/compose.yaml')text=replaceRedlibDefaultPin(text,pair.from,pair.to).text;
     else if(pair.from===redlibNew&&pair.to===redlibOld&&name==='/home/ubuntu/freetools/.env')text=replaceRedlibEnvPin(text,pair.from,pair.to).text;
     else text=replaceImagePins(text,[pair]).text;
    }
    if(hash(text)===before){matched=true;break;}
   }
   assert(matched,'Configuration changed beyond completed image scalars');
  }
  review.files[name]=after;changed=true;
 }
 if(changed)review.runtimeEvidence='2026-10-12 completed Archive::Tar, coturn, Kuma crypto, native mount and CryptPad parser releases: exact predecessor chains, preserved application/configuration boundaries, native regression/application tests and live gates verified. CryptPad package metadata changes are limited to its tested braces dependency. Application versions and advisory dispositions are unchanged; dependency findings are reviewed separately. See archive-tar-final, coturn-bson-final, kuma-crypto-final, mount-acl-final and application-leaves-final recipes. '+(review.runtimeEvidence||'');
}
const updated=JSON.stringify(reviews,null,2)+'\n';
if(updated===original)console.error('No completed-release application bindings need changing.');
else{
 process.umask(0o077);
 const scratch=fs.mkdtempSync(root+'/advisory-binding-diff-');
 try{
  fs.writeFileSync(scratch+'/before.json',original);fs.writeFileSync(scratch+'/after.json',updated);
  const d=cp.spawnSync('diff',['-u',scratch+'/before.json',scratch+'/after.json'],{encoding:'utf8',maxBuffer:2*1024**2});
  assert.equal(d.status,1,'Expected a bounded textual difference');
  const body=d.stdout.split('\n').slice(2).map(l=>l.startsWith('@@ ')?'@@':l).join('\n').trimEnd();
  console.log('*** Begin Patch\n*** Update File: '+file+'\n'+body+'\n*** End Patch');
 }finally{fs.rmSync(scratch,{recursive:true});}
}
