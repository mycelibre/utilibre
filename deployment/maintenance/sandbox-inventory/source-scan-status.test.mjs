import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceScanStatus} from './source-scan-status.mjs';
import {denoSourceName,wheelSourceName} from './collect.mjs';
import {findingsQueue,retainUnrechecked} from '../build-queue.mjs';

const sources=[
 {name:denoSourceName,scope:'upstream-release-source-lock'},
 {name:wheelSourceName,scope:'runtime-wheel-metadata'},
];
test('nonempty sandbox inventories require a positive scanner package count',()=>{
 for(const source of sources){
  for(const packages of [0,undefined,null,-1,NaN,Infinity,'1',0.5]){
   assert.equal(sourceScanStatus(source,{packages}),'incomplete');
  }
  assert.equal(sourceScanStatus(source,{packages:1,findings:[]}),'checked');
 }
 // Existing tracked inputs can intentionally contain no dependency packages.
 assert.equal(sourceScanStatus({name:'empty/package-lock.json',scope:'tracked-build-input'},{packages:0}),'checked');
});
test('a zero-package rescan cannot resolve an earlier sandbox finding',()=>{
 for(const source of sources){
  const previous=findingsQueue({status:'checked',sources:[{...source,status:'checked',sha256:'a'.repeat(64),findings:[{id:'CVE-test',package:'x',installed:'1',severity:'HIGH'}]}]});
  const result={packages:0,findings:[]};
  const target={...source,...result,status:sourceScanStatus(source,result)};
  const report={status:'incomplete',sources:[target]};
  const retained=retainUnrechecked(findingsQueue(report,previous),report,previous);
  assert.equal(retained.length,1);
  assert.equal(retained[0].status,'not-rechecked');
 }
});
