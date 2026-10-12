import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

test('record CLI completes its circular queue rebuild without touching the live ledger',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'utilibre-triage-test-'));
 try{
  for(const name of ['triage.mjs','build-queue.mjs']){
   const source=await readFile(new URL(name,import.meta.url),'utf8');
   await writeFile(join(dir,name),source.replace("const directory='/var/lib/utilibre-maintenance';",`const directory=${JSON.stringify(dir)};`));
  }
  const item={id:'TEST-ONLY',package:'fixture',installed:'1',severity:'HIGH'};
  const report={status:'checked',host:{status:'checked',findings:[item]},images:[],sources:[]};
  await writeFile(join(dir,'security.json'),JSON.stringify(report));
  const {findingsQueue}=await import('./build-queue.mjs');
  const queue=findingsQueue(report);
  await writeFile(join(dir,'security-queue.json'),JSON.stringify(queue));
  const review={key:queue.items[0].key,status:'not-affected',reason:'Synthetic fixture for CLI regression testing only.',expiresAt:new Date(Date.now()+86400000).toISOString()};
  await writeFile(join(dir,'review.json'),JSON.stringify(review));
  const result=await promisify(execFile)(process.execPath,[join(dir,'triage.mjs'),'record',join(dir,'review.json')],{timeout:10000});
  assert.match(result.stdout,/Exact finding review recorded/);
  assert.equal(result.stderr,'');
  const rebuilt=JSON.parse(await readFile(join(dir,'security-queue.json'),'utf8'));
  assert.equal(rebuilt.items[0].status,'not-affected');
  assert.deepEqual(JSON.parse(await readFile(join(dir,'security.json'),'utf8')),report);
 }finally{await rm(dir,{recursive:true,force:true});}
});
