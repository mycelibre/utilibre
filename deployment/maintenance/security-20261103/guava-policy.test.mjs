import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {proveGuava} from './guava-policy.mjs';
const sha=f=>createHash('sha256').update(fs.readFileSync(new URL(f,import.meta.url))).digest('hex');
function fixture(){
 const s=JSON.parse(fs.readFileSync(new URL('./guava-inputs.json',import.meta.url))).rows[0];
 const b={passed:true,configurationUnchanged:true,singleLayerSingleFileVerified:true,base:s.base,candidate:s.candidate,imageId:'candidate',changedFiles:[s.jar],unchangedOtherAppFiles:50196,inputsSha256:sha('./guava-inputs.json'),recipeSha256:sha('./guava-build.py'),fixtureSha256:sha('./GuavaSerializationCheck.java'),jarSha256:'jar'};
 const n={passed:true,network:'none',maxHeapMiB:128,fixtureSha256:b.fixtureSha256,jarSha256:b.jarSha256,rows:[]};
 for(const state of ['baseline','fixed'])for(const namespace of ['com.google.common.collect','com.google.javascript.jscomp.jarjar.com.google.common.collect'])for(const kind of ['CompactHashSet','CompactLinkedHashSet','CompactHashMap','CompactLinkedHashMap','MapMaker'])n.rows.push({state,namespace,kind,passed:true,legitimateChecks:5,outOfMemory:state==='baseline',fixed:state==='fixed'});
 const a={passed:true,version:'2.18.3',network:'isolated-internal',imageId:b.imageId,twoAccounts:true,nativeExportImport:true,membershipChecks:true,pngExport:true,backendMedia:true,cleanupVerified:true,closureCompilerParity:true,closureNetwork:'none'};
 return [s,b,n,a];
}
test('matching evidence permits only the exact single-file repair',()=>proveGuava(...fixture()));
test('reject wrong baseline, builder, input manifest and unrelated file changes',()=>{
 for(const change of [{base:'other'},{recipeSha256:'other'},{inputsSha256:'other'},{changedFiles:['/config']},{configurationUnchanged:false},{singleLayerSingleFileVerified:false}]){const v=fixture();Object.assign(v[1],change);assert.throws(()=>proveGuava(...v));}
});
test('a main-only repair or invented failing baseline cannot pass',()=>{
 for(const modify of [n=>n.rows.pop(),n=>{n.rows[0].outOfMemory=false;},n=>{n.rows[19].fixed=false;},n=>{n.rows[19].legitimateChecks=0;},n=>{n.rows[19]={...n.rows[18]};},n=>{n.network='public';}]){const v=fixture();modify(v[2]);assert.throws(()=>proveGuava(...v));}
});
test('unrelated image, missing application workflow or failed compiler blocks release',()=>{
 for(const change of [{imageId:'other'},{nativeExportImport:false},{membershipChecks:false},{backendMedia:false},{closureCompilerParity:false},{cleanupVerified:false}]){const v=fixture();Object.assign(v[3],change);assert.throws(()=>proveGuava(...v));}
});
