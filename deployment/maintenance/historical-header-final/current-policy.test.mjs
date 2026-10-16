import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {eligible,records,primary,noOverlap} from './current-policy.mjs';
const host={status:'needs-review',severity:'HIGH',package:'linux-libc-dev',id:'CVE-2026-98260',scope:'host-os',artifact:'host-dpkg',targetName:'host-dpkg',type:'debian',installed:'6.12.111-1',containers:[]};
test('only reviewed header version/scope; never the actual kernel',()=>{
 assert(eligible(host));
 for(const delta of [{package:'linux-image-6.12.111+deb13-cloud-amd64'},{installed:'6.12.112-1'},{id:'CVE-2099-1234'},{artifact:'other'},{type:'ubuntu'},{containers:['x']},{status:'not-rechecked'}])assert(!eligible({...host,...delta}));
});
test('all SimpleLogin runtime roles must be covered, not only the first',()=>{
 const i={...host,id:'CVE-2022-50240',scope:'runtime-image',type:'ubuntu',installed:'5.15.0-198.208',artifact:'sha256:fd27de8cc838e398183978ac4342b83fad4db46712c08ed5e4d05436d18ae15b',containers:['utilibre-simplelogin-web-1','utilibre-simplelogin-smtp-1','utilibre-simplelogin-jobs-1']};i.targetName=i.artifact;assert(eligible(i));assert(!eligible({...i,containers:i.containers.slice(0,1)}));assert(!eligible({...i,artifact:'sha256:'+'f'.repeat(64),targetName:'sha256:'+'f'.repeat(64)}));
});
test('changed primary evidence fails closed',()=>{for(const id of Object.keys(records))assert.throws(()=>primary(id,Buffer.from('{}')),/Changed primary/)});
test('header-name overlap requires separate content review',()=>{
 noOverlap('CVE-2022-50240',{records:[{path:'/usr/include/linux/android/binder.h'}]});
 assert.throws(()=>noOverlap('CVE-2022-50240',{records:[{path:'/usr/include/drivers/android/binder_alloc.h'}]}),/overlap/);
});
test('pinned primary integration', {skip:!process.env.UTILIBRE_HEADER_EVIDENCE},()=>{
 for(const id of Object.keys(records))assert.deepEqual(primary(id,fs.readFileSync(process.env.UTILIBRE_HEADER_EVIDENCE+'/'+id+'.json')),records[id].paths);
});
