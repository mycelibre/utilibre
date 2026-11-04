import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {validateBatch} from './triage.mjs';import {findingsQueue} from './build-queue.mjs';
const now=Date.now(),date=new Date(now-1000).toISOString();
const one={key:'a'.repeat(64),status:'mitigated',reason:'Synthetic exact fixture with reviewed repair evidence.',expiresAt:new Date(now+86400000).toISOString()};
const queue={status:'current',scanDate:date,items:[{key:one.key,status:'needs-review'}]};
const batch={schemaVersion:1,scanDate:date,decisions:[one]};
test('valid batch uses the existing decision validation',()=>assert.equal(validateBatch(batch,queue,now)[0].status,'mitigated'));
for(const [name,change]of [['stale',{scanDate:new Date(now-2*86400000).toISOString()}],['version',{schemaVersion:2}],['empty',{decisions:[]}],['oversize',{decisions:Array(5001).fill(one)}],['duplicate',{decisions:[one,one]}],['unknown',{decisions:[{...one,key:'b'.repeat(64)}]}],['invalid expiry',{decisions:[{...one,expiresAt:date}]}]])test('batch rejects '+name,()=>assert.throws(()=>validateBatch({...batch,...change},queue,now)));
test('incomplete or historical observations cannot qualify',()=>{assert.throws(()=>validateBatch(batch,{...queue,status:'incomplete'},now));assert.throws(()=>validateBatch(batch,{...queue,items:[{key:one.key,status:'not-rechecked'}]},now));});
test('CLI rejects the whole invalid batch, then records valid reviews once without altering scan',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'utilibre-triage-batch-'));
 try{
  for(const file of ['triage.mjs','build-queue.mjs']){const text=await readFile(new URL(file,import.meta.url),'utf8');await writeFile(join(dir,file),text.replace("const directory='/var/lib/utilibre-maintenance';",`const directory=${JSON.stringify(dir)};`));}
  const scan={date,completedAt:date,status:'checked',host:{status:'checked',findings:['one','two'].map(id=>({id,package:'fixture',installed:'1',severity:'HIGH'}))},images:[],sources:[]};
  const q=findingsQueue(scan),original=JSON.stringify(q),raw=JSON.stringify(scan);await writeFile(join(dir,'security.json'),raw);await writeFile(join(dir,'security-queue.json'),original);await writeFile(join(dir,'security-decisions.json'),'[]');
  const good={schemaVersion:1,scanDate:date,decisions:q.items.map(i=>({...one,key:i.key}))},file=join(dir,'batch.json');
  await writeFile(file,JSON.stringify({...good,decisions:[good.decisions[0],{...good.decisions[1],key:'*'}]}));
  const cli=()=>promisify(execFile)(process.execPath,[join(dir,'triage.mjs'),'record-batch',file],{timeout:10000});
  await assert.rejects(cli());assert.equal(await readFile(join(dir,'security-decisions.json'),'utf8'),'[]');assert.equal(await readFile(join(dir,'security-queue.json'),'utf8'),original);
  await writeFile(file,JSON.stringify(good));assert.match((await cli()).stdout,/2 exact reviewed decisions recorded/);
  assert(JSON.parse(await readFile(join(dir,'security-queue.json'),'utf8')).items.every(x=>x.status==='mitigated'));
  await cli();assert.equal(JSON.parse(await readFile(join(dir,'security-decisions.json'),'utf8')).length,2);
  const ledger=await readFile(join(dir,'security-decisions.json'),'utf8');await writeFile(join(dir,'security.json'),JSON.stringify({...scan,completedAt:new Date(now).toISOString()}));
  await assert.rejects(cli());assert.equal(await readFile(join(dir,'security-decisions.json'),'utf8'),ledger);
  await writeFile(join(dir,'security.json'),raw);await writeFile(join(dir,'triage-write.lock'),'synthetic busy writer');
  await assert.rejects(cli(),/writer locked/);assert.equal(await readFile(join(dir,'security-decisions.json'),'utf8'),ledger);
  assert.equal(await readFile(join(dir,'security.json'),'utf8'),raw);
 }finally{await rm(dir,{recursive:true,force:true});}
});
