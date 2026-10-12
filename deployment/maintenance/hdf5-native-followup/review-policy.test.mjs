import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,version} from './review-policy.mjs';
const base={status:'needs-review',scope:'runtime-image',type:'debian',package:'libhdf5-103-1',installed:version,id:'CVE-2018-11205',artifact:'sha256:'+'1'.repeat(64),containers:['utilibre-gathio-postgres-1']};
test('only exact native HDF5 repair/version/role qualifies',()=>{assert(eligible(base));assert(eligible({...base,package:'libhdf5-hl-100'}));for(const delta of [{id:'CVE-2018-11206'},{installed:'1.10.8+repack1-1'},{package:'hdf5-tools'},{scope:'host-os'},{status:'mitigated'},{artifact:'tag:latest'},{containers:[]},{containers:['another']},{containers:[...base.containers,'another']}])assert.equal(eligible({...base,...delta}),false);});
