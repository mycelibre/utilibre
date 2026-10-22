import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const scannerPackageVersion=p=>p.Version+(p.Release?'-'+p.Release:'');

// Package names, bytes and versions are part of the input, never a request to
// resolve another release. Native package signature verification is separate.
export function verifyInputs(spec,lock,payloads){
 assert.equal(lock.base,spec.base,'Unsupported maintained image');
 assert.equal(lock.manager,spec.manager);assert.equal(lock.version,spec.version);
 const names=Object.keys(lock.packageHashes);
 assert(names.length>0&&names.length<=100,'Invalid package count');
 for(const n of names){
  assert(/^[a-zA-Z0-9_+%:~.-]+\.(apk|deb)$/.test(n)&&!n.startsWith('.'),'Unsafe package path');
  assert.match(lock.packageHashes[n],/^[a-f0-9]{64}$/);
 }
 assert.deepEqual(Object.keys(payloads).sort(),names.sort(),'Package set changed');
 for(const n of names)assert.equal(sha256(payloads[n]),lock.packageHashes[n],'Package bytes changed: '+n);
}

export function verifyPackageDelta(spec,before,after,selected){
 assert(selected.length>0&&new Set(selected).size===selected.length);
 assert.deepEqual(selected.slice().sort(),Object.keys(before).filter(n=>before[n].origin===spec.origin).sort(),'Incomplete PHP package selection');
 assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort(),'Package added/removed');
 for(const [name,p]of Object.entries(before))assert.deepEqual(after[name],selected.includes(name)?{...p,version:spec.version}:p,'Unexpected package change: '+name);
}
