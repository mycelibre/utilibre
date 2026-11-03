import fs from 'node:fs';import assert from 'node:assert/strict';
const s=JSON.parse(fs.readFileSync(new URL('./cryptpad-redirects-inputs.json',import.meta.url)));
export function eligible(i){return i?.status==='needs-review'&&i.scope==='mounted-runtime-code'&&i.type==='npm'&&i.package==='follow-redirects'&&i.installed===s.packageVersion&&i.id===s.advisory&&i.target==='package-lock.json'&&i.targetName==='cryptpad/package-lock.json'&&i.artifact==='cryptpad/package-lock.json@sha256:'+s.lockSha256&&Array.isArray(i.containers)&&i.containers.length===0;}
export function proveChecks(n){
 assert(n.passed&&n.network==='none');assert.equal(n.imageId,s.runtimeImage);assert.deepEqual(n.rows.map(r=>r.state),['baseline','backport']);
 for(const r of n.rows){assert(r.passed&&r.sameOriginPreserved&&r.redirectLimit);assert.equal(r.fixed,r.state==='backport');assert.equal(r.observations.length,4);assert.equal(new Set(r.observations.map(o=>JSON.stringify([o.array,o.crossRealm]))).size,4);for(const o of r.observations){assert.equal(typeof o.array,'boolean');assert.equal(typeof o.crossRealm,'boolean');assert.equal(o.credentialForwarded,r.state==='baseline'&&o.crossRealm);}}
}
