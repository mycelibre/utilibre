// Retain and verify exact currently installed rollback packages. No installation,
// maintainer-script execution, service control or guest-agent RPC is performed.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inventory} from '../component-followup/inventory.mjs';
import {payloadManifest,validatePayload} from '../vendor-leaves-final/dhi-proof.mjs';
process.umask(0o077);
assert.deepEqual(process.argv.slice(2),['prepare']);
const dir='/var/lib/utilibre-maintenance/security-20261028/qemu-native';
fs.mkdirSync(dir,{recursive:true});
const pins=[
 {package:'qemu-guest-agent',version:'1:11.0.2+ds-2~bpo13+1',file:dir+'/qemu-guest-agent_11.0.2+ds-2~bpo13+1_amd64.deb',sha256:'3250e067b5520efc645bfcf0c6b705591b85c1d71817d6b2718b1c653b4dadba',provenance:'Official Debian HTTPS archive; complete payload and maintainer scripts match installed package'},
 {package:'qemu-utils',version:'1:10.0.13+ds-0+deb13u1',file:'/var/lib/utilibre-maintenance/qemu-component-followup-20261012/packages/qemu-utils_10.0.13+ds-0+deb13u1_amd64.deb',sha256:'6d31339b1630153fe7c5f8a51426b8fa6ce35731aeb015a84f2d333c4e4dca30',provenance:'Existing authenticated Debian archive; complete payload and maintainer scripts match installed package'},
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const rows=[];
for(const p of pins){
 assert.equal(run('dpkg-query',['-W','-f=${Version}',p.package]),p.version);
 if(!fs.existsSync(p.file)){
  assert.equal(p.package,'qemu-guest-agent','Recover the previously authenticated utilities archive before continuing');
  const url='https://deb.debian.org/debian/pool/main/q/qemu/'+p.file.split('/').at(-1);
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
  assert(response.ok);assert(Number(response.headers.get('content-length'))<=4*1024**2);
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;assert(size<=4*1024**2);chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);assert.equal(sha(bytes),p.sha256);
  fs.writeFileSync(p.file,bytes,{flag:'wx'});
 }
 assert.equal(sha(fs.readFileSync(p.file)),p.sha256);
 assert.equal(run('dpkg-deb',['-f',p.file,'Package']),p.package);
 assert.equal(run('dpkg-deb',['-f',p.file,'Version']),p.version);
 const temp=fs.mkdtempSync(dir+'/rollback-verify-');
 try{
  run('dpkg-deb',['--extract',p.file,temp+'/payload']);
  run('dpkg-deb',['--control',p.file,temp+'/control']);
  const payload=payloadManifest(temp+'/payload');
  const actual=inventory(p.package).records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));
  validatePayload(payload,actual);
  const controls=[];
  for(const name of fs.readdirSync(temp+'/control').sort()){
   if(name==='control')continue;
   assert(/^[a-z][a-z0-9]+$/.test(name));assert(fs.lstatSync(temp+'/control/'+name).isFile());
   const digest=sha(fs.readFileSync(temp+'/control/'+name));
   assert.equal(sha(fs.readFileSync('/var/lib/dpkg/info/'+p.package+'.'+name)),digest);
   controls.push({name,sha256:digest});
  }
  rows.push({...p,fileCount:payload.length,payload,controls});
 }finally{fs.rmSync(temp,{recursive:true});}
}
const receipt=dir+'/rollback.json';
if(fs.existsSync(receipt)){
 const previous=JSON.parse(fs.readFileSync(receipt));assert(previous.passed&&previous.productionChanged===false);
 assert.deepEqual(previous.rows,rows,'Preserve original rollback evidence; changed input requires review');
 console.log('Exact rollback archives and current payloads reverified; existing receipt unchanged.');
}else{
 fs.writeFileSync(receipt,JSON.stringify({date:new Date().toISOString(),passed:true,productionChanged:false,rows},null,2)+'\n',{flag:'wx'});
 console.log('Exact rollback archives and current payloads verified; host unchanged.');
}
