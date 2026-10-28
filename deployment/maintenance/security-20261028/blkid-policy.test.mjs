import test from 'node:test';import assert from 'node:assert/strict';import {eligible} from './blkid-policy.mjs';
const good={status:'needs-review',scope:'runtime-image',type:'debian',id:'CVE-2026-53615',package:'libblkid1',installed:'2.38.1-5+deb12u3',artifact:'sha256:'+'a'.repeat(64),containers:['utilibre-expanded-actual-1']};
test('exact package family, advisory, version and role',()=>assert(eligible(good)));
test('no cross-advisory or broad util-linux waiver',()=>{for(const id of ['CVE-2026-53613','CVE-2026-54369'])assert(!eligible({...good,id}));assert(!eligible({...good,package:'libacl1'}));});
test('reject host, wrong source version and unknown artifacts',()=>{for(const c of [{scope:'host-os'},{installed:'2.39.3-9ubuntu6.6'},{artifact:'latest'}])assert(!eligible({...good,...c}));});
test('reject unrelated roles and shared images',()=>{assert(!eligible({...good,containers:['utilibre-unreviewed-1']}));assert(!eligible({...good,containers:[...good.containers,'other']}));});
test('preserve exact older mount backport versions',()=>{assert(!eligible({...good,package:'libmount1'}));assert(eligible({...good,package:'libmount1',installed:'2.38.1-5+deb12u3+utilibre1'}));});
