import test from 'node:test';
import assert from 'node:assert/strict';
import {specs,matches,freshScan,validateObserved,validateRelease} from './review-native-backports.mjs';
const item=s=>({status:'needs-review',scope:s.kind==='host'?'host-os':'runtime-image',type:'debian',id:s.id,artifact:s.artifact,installed:s.version,package:s.packages[0],containers:s.containers});
test('only exact CVE, version, image, package and role qualify',()=>{
 for(const s of specs){assert(matches(item(s),s));for(const change of [{id:'CVE-2026-11822'},{artifact:'sha256:'+'0'.repeat(64)},{installed:'2.9.14'},{package:'unrelated'},{type:'npm'},{scope:'source'},{status:'confirmed'},{containers:['other-container']}])assert.equal(matches({...item(s),...change},s),false);}
});
test('Penpot requires both genuine system and private native library payloads',()=>{
 const s=specs.find(x=>x.kind==='penpot-backend'),i=item(s),o={version:s.version,librarySha256:s.sha,privateLibrarySha256:s.sha};
 assert.doesNotThrow(()=>validateObserved(s,i,o));assert.throws(()=>validateObserved(s,i,{...o,privateLibrarySha256:'old'}));assert.throws(()=>validateObserved(s,i,{...o,librarySha256:'old'}));assert.throws(()=>validateObserved(s,i,{...o,version:'upstream'}));
});
test('development archive and SQLite CLI require their additional patched payload',()=>{
 for(const [kind,pkg,id] of [['gathio','libxml2-dev','CVE-2026-6653'],['kuma','sqlite3','CVE-2025-7458']]){
  const s=specs.find(x=>x.kind===kind&&x.id===id);assert.throws(()=>validateObserved(s,{...item(s),package:pkg},{version:s.version,librarySha256:s.sha}));
 }
});
test('freshness refuses stale/future scans and a queue built from a different scan',()=>{
 const now=Date.now(),completedAt=new Date(now-10000).toISOString(),scan={completedAt};assert.doesNotThrow(()=>freshScan({scanDate:completedAt},scan,now));
 assert.throws(()=>freshScan({scanDate:'old'},scan,now));
 for(const delta of [-2*86400000,600000]){const date=new Date(now+delta).toISOString();assert.throws(()=>freshScan({scanDate:date},{completedAt:date},now));}
});
test('every released role must pass and match the exact image, not merely start',()=>{
 const s=specs.find(x=>x.kind==='authentik');const r={status:'passed',completedAt:new Date().toISOString(),rows:s.containers.map(name=>({name,status:'passed',newImage:s.artifact}))};assert.doesNotThrow(()=>validateRelease(r,s));
 assert.throws(()=>validateRelease({...r,status:'prepared'},s));assert.throws(()=>validateRelease({...r,rows:r.rows.slice(1)},s));assert.throws(()=>validateRelease({...r,rows:r.rows.map(row=>({...row,newImage:'wrong'}))},s));assert.throws(()=>validateRelease({...r,rows:r.rows.map(row=>({...row,status:'failed'}))},s));
});
