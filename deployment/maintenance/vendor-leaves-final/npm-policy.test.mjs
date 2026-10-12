import test from 'node:test';
import assert from 'node:assert/strict';
import {npmEligible,npmContainer} from './npm-policy.mjs';
test('npm review is restricted to one advisory, role, ecosystem and two exact inventory versions',()=>{
 const row={status:'needs-review',scope:'runtime-image',type:'debian',package:'npm',id:'CVE-2026-9496',installed:'11.20.0-0',containers:[npmContainer]};
 assert(npmEligible(row));assert(npmEligible({...row,installed:'11.19.1-0'}));
 for(const patch of [{status:'mitigated'},{scope:'host-os'},{type:'npm'},{package:'nodejs'},{id:'CVE-2026-9497'},{installed:'11.21.0-0'},{containers:[]},{containers:[npmContainer,'another']},{containers:['another']}])assert(!npmEligible({...row,...patch}));
});
