// Carry exact unexpired decisions only when the entire unrelated image payload
// and execution configuration are unchanged. No new acceptance or expiry grant.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261114';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json'),old=read(dir+'/before-security-queue.json'),before=read(dir+'/before-security.json');
freshScan(queue,scan);assert.equal(scan.status,'checked');
assert.equal(scan.database.updatedAt,before.database.updatedAt,'New advisory data requires a new review');
const proofs=read(dir+'/retained/index.json');assert(proofs.passed);
const decisions=[],unmatched=[];
for(const p of proofs.rows){
 assert(p.passed&&p.allUnrelatedFilesUnchanged&&p.configurationUnchanged);
 assert.equal(p.baselineQueueSha256,sha(dir+'/before-security-queue.json'));
 const prefix=p.oldImage.slice(7,19)+'-'+p.imageId.slice(7,19);
 assert.equal(p.changesSha256,sha(dir+'/retained/'+prefix+'-changes.json'));
 const image=scan.images.find(i=>i.id===p.imageId);assert(image?.status==='checked');
 assert.deepEqual([...image.containers].sort(),[...p.containers].sort());
 for(const name of image.containers)assert.equal(execFileSync('docker',['inspect','--format','{{.Image}}',name],{encoding:'utf8',timeout:10000}).trim(),p.imageId);
 for(const i of queue.items.filter(i=>i.artifact===p.imageId&&i.scope==='runtime-image'&&['HIGH','CRITICAL'].includes(i.severity)&&i.status==='needs-review')){
  if(p.packagesChanged.includes(i.package))continue;
  if(['dnspython','soupsieve'].includes(i.package)&&p.pythonPrefixes.some(x=>x.includes(i.package)))continue;
  const matches=old.items.filter(o=>o.artifact===p.oldImage&&o.scope===i.scope&&['id','package','installed','severity','type'].every(k=>o[k]===i[k])&&(['debian','ubuntu','alpine'].includes(i.type)||o.target===i.target));
  if(matches.length!==1){unmatched.push(i.key);continue;}
  const o=matches[0],d=o.decision;
  if(!['mitigated','not-affected'].includes(o.status)||d?.status!==o.status||d.condition||Date.parse(d.expiresAt)<=Date.now())continue;
  const reason=`Retained exact ${o.status} review ${o.key}, with original rationale in SHA-bound security-20261114/before-security-queue.json. Complete before/final image file content, type, mode, ownership and link comparison permits only the explicitly updated package payloads; this ${i.package} payload and image execution configuration are unchanged. Evidence: security-20261114/retained/${prefix}.json and changes digest ${p.changesSha256}. Same advisory snapshot, same service roles, unchanged expiry. This is not a new fix, blanket acceptance, or clearance of changed packages/ACL; raw findings remain visible.`;
  decisions.push(validateDecision({key:i.key,status:o.status,expiresAt:d.expiresAt,reason}));
 }
}
fs.writeFileSync(dir+'/retained-review.json',JSON.stringify({schemaVersion:1,scanDate:scan.completedAt,decisions,unmatched},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,unmatched:unmatched.length,applied:false}));
