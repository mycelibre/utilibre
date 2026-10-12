import assert from 'node:assert/strict';
import test from 'node:test';
import {matches,verifyPayload,reasonFor,specs} from './check.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
const spec=specs[0];
const item={key:'a'.repeat(64),status:'needs-review',type:'debian',scope:'runtime-image',artifact:spec.artifact,package:spec.package,installed:spec.version,id:spec.ids[0],containers:[...spec.containers]};
test('exact reviewed finding accepted',()=>assert(matches(item,spec)));
for(const [key,value] of Object.entries({status:'mitigated',type:'npm',scope:'host-os',artifact:'sha256:'+'0'.repeat(64),package:'libaom-dev',installed:'3.14.2-1',id:'CVE-2099-0001',containers:['unreviewed-container']}))
 test('reject changed '+key,()=>assert.equal(matches({...item,[key]:value},spec),false));
test('host only matches exact empty-container scope',()=>{
 const s=specs.find(s=>s.artifact==='host-dpkg');
 const i={...item,artifact:s.artifact,scope:'host-os',package:s.package,installed:s.version,id:s.ids[0],containers:[]};
 assert(matches(i,s));assert(!matches({...i,containers:['unexpected']},s));assert(!matches({...i,scope:'runtime-image'},s));
});
const manifest=[{path:'/usr/lib/fixture.so.3',sha256:'b'.repeat(64)}];
const observed={version:spec.version,debSha:spec.debSha,files:manifest};
test('exact payload accepted',()=>verifyPayload(spec,observed,manifest));
test('changed library fails',()=>assert.throws(()=>verifyPayload(spec,{...observed,files:[{...manifest[0],sha256:'c'.repeat(64)}]},manifest)));
test('changed signed deb fails',()=>assert.throws(()=>verifyPayload(spec,{...observed,debSha:'d'.repeat(64)},manifest)));
test('changed installed version fails',()=>assert.throws(()=>verifyPayload(spec,{...observed,version:'3.6.0-1'},manifest)));
test('incomplete file check fails',()=>assert.throws(()=>verifyPayload(spec,{...observed,files:[]},manifest)));
test('empty manifests fail',()=>assert.throws(()=>verifyPayload(spec,{...observed,files:[]},[])));
test('scan mismatch and stale/future evidence fail',()=>{
 const now=Date.now(),date=new Date(now-1000).toISOString();freshScan({scanDate:date},{completedAt:date},now);
 assert.throws(()=>freshScan({scanDate:'wrong'},{completedAt:date},now));
 for(const delta of [-2*86400000,600000]){const d=new Date(now+delta).toISOString();assert.throws(()=>freshScan({scanDate:d},{completedAt:d},now));}
});
test('all exact individual reasons meet ledger validation',()=>{
 for(const s of specs)for(const id of s.ids){const reason=reasonFor({...item,id},s,{manifestSha256:'e'.repeat(64)});
  const decision=validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()});
  assert.equal(decision.status,'not-affected');assert(reason.includes(id));
 }
});
