import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible} from './review-policy.mjs';
const host={status:'needs-review',scope:'host-os',type:'debian',package:'sudo',id:'CVE-2026-96512',installed:'1.9.16p2-3+deb13u2+utilibre1',containers:[]};
const kuma={...host,scope:'runtime-image',installed:'1.9.13p3-1+deb12u4+utilibre1',artifact:'sha256:'+'8'.repeat(64),containers:['utilibre-community-uptime-kuma-1']};
test('Only exact native repaired host and Kuma packages qualify',()=>{assert(eligible(host));assert(eligible(kuma));});
test('Different advisories, versions, packages, types and review state stay open',()=>{
 for(const base of [host,kuma])for(const patch of [{id:'CVE-2025-32463'},{installed:'1.9.17p2-9'},{installed:base.installed.replace('+utilibre1','')},{package:'sudo-ldap'},{type:'npm'},{status:'mitigated'}])assert.equal(eligible({...base,...patch}),false);
});
test('Other service roles, mixed container groups and non-image targets are excluded',()=>{
 for(const patch of [{containers:['unrelated']},{containers:[...kuma.containers,'unrelated']},{containers:[]},{artifact:'moving-tag'},{scope:'source-manifest'}])assert.equal(eligible({...kuma,...patch}),false);
 assert.equal(eligible({...host,containers:['unrelated']}),false);
});
