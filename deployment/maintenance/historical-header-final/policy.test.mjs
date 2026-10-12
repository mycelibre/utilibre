import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {eligible,components,verifyPrimary,validateInventory,sha,privateTokens} from './policy.mjs';
const base={id:'CVE-2019-19814',package:'linux-libc-dev',installed:'6.12.111-1',status:'needs-review',type:'debian',scope:'host-os',artifact:'host-dpkg',targetName:'host-dpkg',containers:[]};
test('only the reviewed package, IDs, roles and versions; never a kernel',()=>{
 for(const id of Object.keys(components))assert(eligible({...base,id}));
 for(const change of [{package:'linux-image-6.12.111'},{package:'linux-headers-6.12.111'},{id:'CVE-2026-12345'},{installed:'6.12.112-1'},{status:'mitigated'},{scope:'runtime-image'},{type:'ubuntu'},{containers:['unexpected']}])assert(!eligible({...base,...change}));
 const runtime={...base,scope:'runtime-image',artifact:'sha256:'+'a'.repeat(64),targetName:'sha256:'+'a'.repeat(64),containers:['utilibre-linkding-linkding-1']};assert(eligible(runtime));
 for(const change of [{containers:['unrelated-app']},{targetName:'mismatch'},{artifact:'mutable-tag'},{installed:'5.15.0-198.208'}])assert(!eligible({...runtime,...change}));
});
function inventory(){
 const records=Array.from({length:101},(_,n)=>({path:`/usr/include/linux/test${n}.h`,type:'header',bytes:101,sha256:sha('synthetic header')}));
 return {package:'linux-libc-dev',installed:base.installed,status:'install ok installed',headers:101,bytes:10201,records,checkedPrivateTokens:privateTokens,presentPrivateTokens:[],payloadSha256:sha(JSON.stringify(records))};
}
test('inventory rejects kernel objects, uninspected/missing headers and affected implementation symbols',()=>{
 assert(validateInventory(inventory(),base.installed));
 for(const change of [{installed:'wrong'},{status:'deinstall ok config-files'},{presentPrivateTokens:['begin_new_exec']},{checkedPrivateTokens:[]},{headers:0},{bytes:0},{payloadSha256:'0'.repeat(64)}])assert.throws(()=>validateInventory({...inventory(),...change},base.installed));
 for(const record of [{path:'/boot/vmlinuz',type:'header'},{path:'/usr/include/linux/private.c',type:'header'},{path:'/usr/include/missing.h',type:'missing-document'},{path:'/usr/include/test.h',type:'elf'}]){
  const inv=inventory();inv.records[0]={...inv.records[0],...record};inv.payloadSha256=sha(JSON.stringify(inv.records));assert.throws(()=>validateInventory(inv,base.installed));
 }
 const inv=inventory();inv.records.push({path:'/usr/share/doc/linux-libc-dev/changelog.gz',type:'missing-document'});inv.payloadSha256=sha(JSON.stringify(inv.records));assert(validateInventory(inv,base.installed));
});
test('unknown IDs and changed primary records fail closed',()=>{
 assert.throws(()=>verifyPrimary('CVE-2026-12345','{}',()=>Buffer.from('')));
 for(const id of Object.keys(components))assert.throws(()=>verifyPrimary(id,'{}',()=>Buffer.from('')));
});
const privateRoot='/var/lib/utilibre-maintenance',cna=privateRoot+'/closure-followup-20261012/cna',docs=privateRoot+'/historical-header-final-20261012/sources';
test('available cached primary records and original sources verify, altered support documents fail',{
 skip:!fs.existsSync(cna+'/CVE-2013-7445.json')||!fs.existsSync(docs+'/drm-mm-v6.12.rst'),
},()=>{
 for(const id of Object.keys(components)){
  const body=fs.readFileSync(cna+'/'+id+'.json');assert.equal(verifyPrimary(id,body,f=>fs.readFileSync(docs+'/'+f)).id,id);
  assert.throws(()=>verifyPrimary(id,body,()=>Buffer.from('substituted supporting report')));
 }
});
