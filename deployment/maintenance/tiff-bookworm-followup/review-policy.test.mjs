import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,version,expectedStatus} from './review-policy.mjs';
const item={status:'needs-review',scope:'runtime-image',type:'debian',package:'libtiff6',installed:version,id:'CVE-2026-12912',artifact:'sha256:'+'a'.repeat(64),containers:['utilibre-gathio-postgres-1']};
test('Only the exact native Gathio library and four individually documented issues qualify',()=>{for(const id of ['CVE-2026-12912','CVE-2026-36849','CVE-2023-52355','CVE-2026-52490'])assert(eligible({...item,id}));});
test('No source-wide, other-role, other-version or wrong-year approval',()=>{for(const row of [{id:'CVE-2026-52355'},{id:'CVE-2026-4775'},{package:'libtiff-tools'},{package:'libtiffxx6'},{installed:'4.5.0-6+deb12u4'},{installed:'4.7.2-1'},{scope:'host-os'},{type:'npm'},{containers:['utilibre-penpot-backend-1']},{containers:[...item.containers,'other']},{artifact:'latest'},{status:'mitigated'}])assert.equal(eligible({...item,...row}),false);});
test('Absent tiffcrop is not a claimed new library mitigation',()=>{assert.equal(expectedStatus({...item,id:'CVE-2026-52490'}),'not-affected');assert.equal(expectedStatus(item),'mitigated');assert.throws(()=>expectedStatus({...item,id:'CVE-2026-52490',package:'libtiff-tools'}));assert.throws(()=>expectedStatus({...item,id:'CVE-2026-52490',installed:'4.5.0-6+deb12u4'}));});
