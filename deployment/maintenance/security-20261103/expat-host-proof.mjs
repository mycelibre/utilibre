// Read-only exact package and resident-consumer verification after activation.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{inventory}from'../component-followup/inventory.mjs';
export function proveHostExpat(scan){
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261103/expat-host',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(new URL('./expat-debian-inputs.json',import.meta.url)),r=read(dir+'/release.json');assert.equal(r.status,'passed');assert(Date.parse(r.completedAt)<Date.parse(scan.date));assert(r.native.consumer.passed&&r.native.consumer.busCandidateMapping&&!r.native.consumer.productionBusContacted);assert.equal(r.native.wideChecks,3);
assert.equal(sha(new URL('./expat-host-check.py',import.meta.url)),r.proof.fixtureSha256);assert.equal(r.proof.candidateSha256,spec.packages.trixie.sha256);
const i=inventory('libexpat1');assert.equal(i.installed,spec.packages.trixie.version);const payload=i.records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));assert.deepEqual(payload,r.proof.newPayload);
const current=[];for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p)))try{if(/docker|containerd/.test(fs.readFileSync('/proc/'+pid+'/cgroup','utf8')))continue;const paths=[...new Set(fs.readFileSync('/proc/'+pid+'/maps','utf8').split('\n').filter(l=>/\/libexpatw?\.so\./.test(l)).map(l=>l.slice(l.indexOf('/'))))];for(const p of paths){assert(!p.endsWith(' (deleted)'),'Old Expat mapping');assert(r.abi.some(a=>a.after===sha(p)),'Unexpected Expat mapping');}if(paths.length)current.push({pid:Number(pid),paths});}catch(e){if(!['ENOENT','ESRCH'].includes(e.code))throw e;}
assert.equal(cp.execFileSync('systemctl',['is-active','dbus.service'],{encoding:'utf8',timeout:15000}).trim(),'active');
return {spec,release:r,current};
}
