import test from 'node:test';import assert from 'node:assert/strict';
import {bookwormHookCase} from './mount-component-policy.mjs';
const item={type:'debian',scope:'runtime-image',installed:'2.38.1-5+deb12u3',package:'libmount1',id:'CVE-2026-76642'};
test('only the exact legacy owner/idmap-hook findings qualify',()=>{
 for(const id of ['CVE-2026-76642','CVE-2026-78410'])for(const pkg of ['libmount1','mount'])assert(bookwormHookCase({...item,id,package:pkg}));
});
test('the real older mount-target race remains open',()=>{
 for(const id of ['CVE-2026-53613','CVE-2026-78409','CVE-2026-99999'])assert.equal(bookwormHookCase({...item,id}),false);
});
test('newer, unknown or unverified component scopes never inherit attribution',()=>{
 for(const change of [{installed:'2.41.5-0+deb13u1'},{installed:'2.38.1-5+deb12u4'},{package:'util-linux'},{scope:'host-os'},{type:'ubuntu'}])assert.equal(bookwormHookCase({...item,...change}),false);
});
