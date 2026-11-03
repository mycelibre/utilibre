import test from 'node:test';import assert from 'node:assert/strict';
import {eligible,checkProof} from './deno-zip-policy.mjs';
const hash='a'.repeat(64),now=Date.now(),binding={image:'fixture'},item={status:'needs-review',targetName:'grist/deno-2.9.7/Cargo.lock',artifact:`grist/deno-2.9.7/Cargo.lock@sha256:${hash}`,scope:'upstream-release-source-lock',type:'cargo',package:'zip',installed:'2.4.1',id:'CVE-2026-115905',severity:'CRITICAL'};
const proof={date:new Date(now).toISOString(),passed:true,configurationChecked:true,native:{passed:true,subcommand:'run'},binding,checks:['DNS','TCP','HTTP','PROCESS','FFI'].map(name=>({name,result:'NotCapable'}))};
test('only the exact reviewed package, advisory, source and scope qualify',()=>{
 assert(eligible(item,hash));assert(eligible({...item,id:'CVE-2026-115909',severity:'HIGH'},hash));
 for(const [key,value] of Object.entries({status:'confirmed',targetName:'other',artifact:'other',scope:'runtime-image',type:'npm',package:'unzip',installed:'2.4.2',id:'CVE-2026-115906',severity:'HIGH'}))assert(!eligible({...item,[key]:value},hash),key);
 assert(!eligible(item,'not-a-digest'));
});
test('stale, future, missing, permissive or wrong-subcommand proof fails closed',()=>{
 checkProof(proof,binding,now);
 for(const change of [{date:new Date(now-900001).toISOString()},{date:new Date(now+1).toISOString()},{passed:false},{configurationChecked:false},{native:{passed:true,subcommand:'upgrade'}},{binding:{}},{checks:proof.checks.slice(0,3)},{checks:proof.checks.map(x=>({...x,result:'Error'}))}])assert.throws(()=>checkProof({...proof,...change},binding,now));
});
