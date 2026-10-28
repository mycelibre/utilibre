import {test} from 'node:test';import assert from 'node:assert/strict';
import {eligible,prove,binarySha256} from './gosu-policy.mjs';
const i={status:'needs-review',scope:'runtime-image',type:'gobinary',package:'stdlib',installed:'v1.26.9',id:'CVE-2026-111943',target:'usr/local/bin/gosu',artifact:'sha256:'+'a'.repeat(64),containers:['fixture']};
const p={sha256:binarySha256,module:'github.com/tianon/gosu',go:'go1.26.9',main:true,functions:2000,x509:false,x509Functions:[]};
test('only exact helper and absent affected package',()=>{assert(prove(i,p));for(const patch of [{sha256:'changed'},{x509:true},{x509Functions:['crypto/x509.(*Certificate).Verify']},{functions:0},{main:false},{module:'other'},{go:'go1.27.0'}])assert(!prove(i,{...p,...patch}));});
test('never exempts other Go code or advisories',()=>{for(const patch of [{id:'CVE-other'},{scope:'host-os'},{installed:'v1.26.8'},{target:'app/healthcheck'},{type:'alpine'},{containers:[]},{artifact:'tag'},{status:'mitigated'}])assert(!eligible({...i,...patch}));});
