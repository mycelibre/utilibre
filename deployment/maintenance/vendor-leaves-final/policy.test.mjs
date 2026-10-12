import test from 'node:test';
import assert from 'node:assert/strict';
import {canonical,rollbackImageScalars,exactDhiFinding} from './policy.mjs';
test('canonical config is key-order independent, not value/order independent',()=>{
 assert.deepEqual(canonical({b:{z:1,a:2},a:[1,2]}),canonical({a:[1,2],b:{a:2,z:1}}));
 assert.notDeepEqual(canonical({a:[1,2]}),canonical({a:[2,1]}));
 assert.notDeepEqual(canonical({access:'private'}),canonical({access:'public'}));
});
test('supervisor rollback restores source scalar but preserves unrelated edits',()=>{
 const text='services:\n  app:\n    image: candidate:2\n    read_only: true\n  other:\n    image: unrelated:9\n';
 assert.equal(rollbackImageScalars(text,[{from:'candidate:2',to:'previous:1'}],'utilibre-trip'),text.replace('candidate:2','previous:1'));
});
test('Redlib configured variable remains usable after exact default rollback',()=>{
 const text='  image: ${REDLIB_IMAGE:-candidate:2}\n';
 assert.equal(rollbackImageScalars(text,[{from:'candidate:2',to:'previous:1'}],'public-utility'),'  image: ${REDLIB_IMAGE:-previous:1}\n');
 assert.equal(rollbackImageScalars(text,[{from:'candidate:2',to:'previous:1'}],'different'),text);
 const env='OTHER_SETTING=unchanged\nREDLIB_IMAGE=candidate:2\n';
 assert.equal(rollbackImageScalars(env,[{from:'candidate:2',to:'previous:1'}],'public-utility'),'OTHER_SETTING=unchanged\nREDLIB_IMAGE=previous:1\n');
});
const finding={status:'needs-review',scope:'runtime-image',type:'debian',artifact:'sha256:exact',package:'libssl3t64',id:'CVE-2026-84782',fixed:'3.5.7-1~deb13u3',containers:['frontend']};
const allowed=new Set([finding.id]);
test('DHI decision scope accepts only one exact existing package/image/role/CVE',()=>{
 assert(exactDhiFinding(finding,'frontend','sha256:exact','libssl3t64',allowed));
 for(const mutation of [{artifact:'sha256:new'},{scope:'host-os'},{package:'other'},{id:'CVE-unknown'},{fixed:null},{status:'mitigated'},{type:'npm'},{containers:['frontend','unreviewed']},{containers:[]}])assert(!exactDhiFinding({...finding,...mutation},'frontend','sha256:exact','libssl3t64',allowed));
});
