import assert from 'node:assert/strict';
import test from 'node:test';
import {matches,verifyPayload,reasonFor,specs,reviewOptions} from './check.mjs';
import {runNativeJwt} from './isolated-jwt.mjs';
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
test('targeted preparation cannot select an unreviewed CVE or ambiguous options',()=>{
 assert.deepEqual(reviewOptions(['--only-cve=CVE-2026-102268','--output=/tmp/review.json','--host-sandbox=/tmp/bwrap']),{onlyCve:'CVE-2026-102268',output:'/tmp/review.json',hostSandbox:'/tmp/bwrap'});
 for(const args of [['--apply'],['--only-cve=CVE-2099-9999'],['--output=relative'],['--host-sandbox=relative'],['--output=/tmp/one','--output=/tmp/two'],['--only-cve=CVE-2026-102268','--only-cve=CVE-2026-102268']])assert.throws(()=>reviewOptions(args));
});
test('PEM advisory uses the same exact package/image constraints, never a range exemption',()=>{
 for(const s of specs.filter(s=>s.kind==='jwt')){
  const i={...item,artifact:s.artifact,scope:s.artifact==='host-dpkg'?'host-os':'runtime-image',package:s.package,installed:s.version,containers:s.containers,id:'CVE-2026-102268'};
  assert(matches(i,s));assert(!matches({...i,installed:'2.15.2-1'},s));assert(!matches({...i,id:'CVE-2099-9999'},s));
  assert(reasonFor(i,s,{manifestSha256:'e'.repeat(64)}).includes('GHSA-ffc3-869f-jxw9'));
 }
});
test('native adapter refuses an unpinned image and a missing host sandbox before execution',()=>{
 assert.throws(()=>runNativeJwt('latest','raise AssertionError()'));
 assert.throws(()=>runNativeJwt('host-dpkg','raise AssertionError()'));
});
for(const mode of ['timeout','malformed','nonzero'])test('native '+mode+' failure cleans only its own disposable container',()=>{
 const calls=[],cid='b'.repeat(64);
 const execute=(program,args)=>{
  assert.equal(program,'docker');calls.push(args);
  if(args[0]==='create')return cid;
  if(args[0]==='start'){if(mode==='timeout')throw Error('ETIMEDOUT');return mode==='malformed'?'not-json':'{"passed":true}';}
  if(args[0]==='inspect')return mode==='nonzero'?'1':'0';
  return '';
 };
 assert.throws(()=>runNativeJwt('sha256:'+'a'.repeat(64),'synthetic fixture',undefined,execute));
 assert.deepEqual(calls.at(-1),['rm','--force','--volumes',cid]);
 assert(calls[0].includes('--read-only')&&calls[0].includes('--log-driver'));
 assert.equal(calls[0][calls[0].indexOf('--network')+1],'none');
 assert(!calls[0].some(a=>a==='--volume'||a==='--mount'));
});
test('an invalid creation response never targets another container for cleanup',()=>{
 const calls=[];
 assert.throws(()=>runNativeJwt('sha256:'+'a'.repeat(64),'fixture',undefined,(_p,args)=>{calls.push(args);return 'unexpected';}));
 assert.equal(calls.length,1);assert.equal(calls[0][0],'create');
});
