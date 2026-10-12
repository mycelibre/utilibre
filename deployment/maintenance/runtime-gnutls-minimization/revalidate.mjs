// Revalidate only existing exact reviews for unchanged payloads after this
// two-package deletion. No new vulnerability exemption or expiry extension.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateDecision} from '../triage.mjs';
import {run as buildQueue} from '../build-queue.mjs';
const dir='/var/lib/utilibre-maintenance/runtime-gnutls-minimization-20261012';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const unresolved=new Set(['CVE-2026-88647','CVE-2026-88648','CVE-2026-54369','CVE-2025-61662']);
export function retainedDecision(item,old,proof,now=Date.now()){
 assert(proof.passed&&proof.filesystemParity&&proof.configurationUnchanged&&proof.liveConfigurationUnchanged,'Verified unchanged boundary required');
 assert.deepEqual(proof.packageRemovalExact,['apt','libgnutls30:amd64']);
 if(unresolved.has(item.id)||!['mitigated','not-affected'].includes(old?.status)||!old.decision||Date.parse(old.decision.expiresAt)<=now)return null;
 assert.equal(item.scope,'runtime-image');assert.equal(old.scope,'runtime-image');
 assert.equal(item.artifact,proof.imageId);assert.equal(old.artifact,proof.base);
 for(const key of ['id','package','installed','severity'])assert.equal(item[key],old[key]);
 assert.deepEqual([...item.containers].sort(),[...old.containers].sort());
 const reason=`Unchanged-payload revalidation of original exact review ${old.key} (${old.status}), with its original expiry. Full rationale and evidence remain in runtime-gnutls-minimization-20261012/queue.before.json. Exact image ${proof.imageId} removes only unused apt/libgnutls30; every retained file's bytes, ownership and mode, application configuration and mounted settings are unchanged. Native app/export tests and the current scan passed. This retains the prior decision for ${item.id}/${item.package} only; it does not waive GnuTLS, ACL or GRUB. Build/parity/application and release receipts: runtime-gnutls-minimization-20261012/images and release.json.`;
 return validateDecision({key:item.key,status:old.status,reason,expiresAt:old.decision.expiresAt},now);
}
async function main(){
 process.umask(0o077);assert.deepEqual(process.argv.slice(2),['--apply']);
 const release=read(dir+'/release.json');assert.equal(release.status,'passed');
 const q=read('/var/lib/utilibre-maintenance/security-queue.json'),before=read(dir+'/queue.before.json');
 assert.equal(q.status,'current');assert(Date.parse(q.scanDate)>=Date.parse(release.completedAt));
 const old=new Map(before.items.map(i=>[[i.artifact,i.id,i.package,i.installed].join('|'),i]));const decisions=[];
 for(const group of release.groups){
  const path=dir+'/images/'+group.key,proof=read(path+'/build.json');assert.equal(sha(path+'/build.json'),group.buildHash);assert.equal(sha(path+'/application.json'),group.applicationHash);
  const current=JSON.parse(cp.execFileSync('docker',['inspect',group.name],{encoding:'utf8'}))[0];assert.equal(current.Image,group.newImage);assert.equal(current.State.Health?.Status,'healthy');
  const config=JSON.parse(cp.execFileSync('docker',['compose','--project-directory',group.cwd,'-p',group.project,...group.files.flatMap(f=>['-f',f]),'config','--format','json'],{encoding:'utf8',env:{...process.env,APP_BIND_IP:'10.10.1.43'}})).services[group.service];
  const {canonical}=await import('../go-final/release.mjs');const {image,...rest}=config;
  assert.equal(createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex'),group.configHash);assert.equal(image,group.newRef);
  proof.liveConfigurationUnchanged=true;
  for(const item of q.items.filter(i=>i.artifact===group.newImage)){
   const previous=old.get([group.oldImage,item.id,item.package,item.installed].join('|'));
   const decision=retainedDecision(item,previous,proof);if(decision)decisions.push(decision);
  }
 }
 const existing=read('/var/lib/utilibre-maintenance/security-decisions.json'),byKey=new Map(existing.map(d=>[d.key,d]));for(const d of decisions)byKey.set(d.key,d);
 fs.writeFileSync(dir+'/retained-reviews.json',JSON.stringify({date:new Date().toISOString(),originalQueueSha256:sha(dir+'/queue.before.json'),decisions},null,2)+'\n');
 fs.writeFileSync('/var/lib/utilibre-maintenance/security-decisions.json.tmp',JSON.stringify([...byKey.values()],null,2)+'\n');fs.renameSync('/var/lib/utilibre-maintenance/security-decisions.json.tmp','/var/lib/utilibre-maintenance/security-decisions.json');
 await buildQueue();console.log(decisions.length+' exact prior reviews revalidated; original expiry preserved.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
