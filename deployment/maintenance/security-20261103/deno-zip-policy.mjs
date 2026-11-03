// Deliberately limited to this source release and Grist's checked runtime binding.
import assert from 'node:assert/strict';
import {denoSourceName} from '../sandbox-inventory/collect.mjs';
export function eligible(item,hash){
 return /^[a-f0-9]{64}$/.test(hash||'')&&item?.status==='needs-review'
  &&item.targetName===denoSourceName&&item.artifact===`${denoSourceName}@sha256:${hash}`
  &&item.scope==='upstream-release-source-lock'&&item.type==='cargo'&&item.package==='zip'&&item.installed==='2.4.1'
  &&((item.id==='CVE-2026-115905'&&item.severity==='CRITICAL')||(item.id==='CVE-2026-115909'&&item.severity==='HIGH'));
}
export function checkProof(proof,binding,now=Date.now()){
 const age=now-Date.parse(proof.date);
 assert(Number.isFinite(age)&&age>=0&&age<900000,'Refresh native permission proof');
 assert(proof.passed&&proof.configurationChecked&&proof.native?.passed&&proof.native.subcommand==='run');
 assert.deepEqual(proof.binding,binding);
 assert.deepEqual(proof.checks,['DNS','TCP','HTTP','PROCESS','FFI'].map(name=>({name,result:'NotCapable'})));
}
