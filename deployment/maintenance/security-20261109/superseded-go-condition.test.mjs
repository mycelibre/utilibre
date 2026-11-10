import test from 'node:test';
import assert from 'node:assert/strict';
import {validateState} from './superseded-go-condition.mjs';
import {validateDecision,applyDecisions} from '../triage.mjs';
const hash='a'.repeat(64),other='b'.repeat(64),now=Date.now();
const condition={kind:'superseded-go-v1',sha256:hash};
const item={key:hash,status:'needs-review'};
const review=validateDecision({key:hash,status:'mitigated',reason:'Exact synthetic artifact and guards verified in this test.',expiresAt:new Date(now+3600000).toISOString(),condition},now);
test('conditional review is retained only with exact currently verified evidence',()=>{
  assert.equal(applyDecisions([item],[review],now,new Set([hash+':'+item.key]))[0].status,'mitigated');
  assert.deepEqual(validateDecision(review,now).condition,condition);
});
for(const [name,verified]of [['missing',new Set()],['different or unrelated key',new Set([other+':'+item.key,hash+':'+other])]])test(name+' condition reopens the finding',()=>{
  const result=applyDecisions([{...item,status:'mitigated',decision:review}],[review],now,verified)[0];
  assert.equal(result.status,'needs-review');assert.equal(result.decision,undefined);
});
test('a verified condition cannot accept an unrechecked scan target',()=>assert.equal(applyDecisions([{...item,status:'not-rechecked'}],[review],now,new Set([hash+':'+item.key]))[0].status,'not-rechecked'));
for(const value of [{kind:'other',sha256:hash},{kind:'superseded-go-v1',sha256:'*'},{...condition,path:'/arbitrary'},null])test('malformed review condition rejected: '+JSON.stringify(value),()=>assert.throws(()=>validateDecision({...review,condition:value},now)));
const report={schemaVersion:1,guards:Object.fromEntries(Array.from({length:7},(_,i)=>['deployment/maintenance/example-'+i,hash])),replacements:Array.from({length:14},(_,i)=>({containers:['fixture-'+i],binary:'/app/binary',imageId:'sha256:'+hash,binarySha256:hash}))};
const good={hashFile:()=>hash,runtime:()=>({image:'sha256:'+hash,binarySha256:hash})};
test('exact files and runtime bindings validate',()=>assert.equal(validateState(report,good),true));
for(const [name,change]of [['changed guard',{hashFile:()=>other}],['changed image',{runtime:()=>({image:'sha256:'+other,binarySha256:hash})}],['changed executable',{runtime:()=>({image:'sha256:'+hash,binarySha256:other})}],['missing runtime',{runtime:()=>{throw Error('offline')}}]])test(name+' cannot retain the mitigation',()=>assert.throws(()=>validateState(report,{...good,...change})));
test('unreviewed file paths fail closed',()=>assert.throws(()=>validateState({...report,guards:{...report.guards,'../unexpected':hash}},good)));
