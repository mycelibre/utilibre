import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,prove,pins,current} from './policy.mjs';
const image='sha256:'+'a'.repeat(64),name='utilibre-expanded-penpot-exporter-1';
const item={id:'CVE-2026-24882',type:'debian',scope:'runtime-image',status:'needs-review',artifact:image,targetName:image,containers:[name],package:'gpgv',installed:current};
const proof={image,container:name,package:'gpgv',actualVersion:current,archiveSha256:pins.gpgv,authenticatedIndex:true,payloadExact:true,fileCount:5,inventorySha256:'b'.repeat(64),tpmInstalled:false,tpmPaths:[],tpmSearchComplete:true};
test('exact current gpgv component proof is accepted',()=>assert.equal(prove(item,proof),true));
test('exact older gpgv record requires its retained metadata proof',()=>{
 const i={...item,installed:'2.4.7-21+deb13u1+dhi3'};
 assert.throws(()=>prove(i,proof));
 assert(prove(i,{...proof,residual:{version:i.installed,sha256:'c'.repeat(64)}}));
 assert.throws(()=>prove(i,{...proof,residual:{version:'2.4.7-21+deb13u1+dhi2',sha256:'c'.repeat(64)}}));
});
for(const [key,value]of Object.entries({id:'CVE-2026-24883',package:'tpm2daemon',installed:'2.4.9-8',scope:'repository-lockfile',type:'python-pkg',targetName:'other',status:'mitigated'}))
 test('reject unrelated finding field '+key,()=>assert.equal(eligible({...item,[key]:value}),false));
test('reject another container or multiple containers',()=>{
 assert(!eligible({...item,containers:['utilibre-expanded-penpot-backend-1']}));
 assert(!eligible({...item,containers:[name,name]}));
});
for(const [key,value]of Object.entries({image:'sha256:'+'d'.repeat(64),actualVersion:'2.4.7-21+deb13u1+dhi3',archiveSha256:'e'.repeat(64),authenticatedIndex:false,payloadExact:false,fileCount:0,inventorySha256:'invalid',tpmInstalled:true,tpmSearchComplete:false,tpmPaths:['/usr/lib/gnupg/tpm2daemon']}))
 test('reject incomplete or changed proof field '+key,()=>assert.throws(()=>prove(item,{...proof,[key]:value})));
test('other siblings cannot inherit stale gpgv metadata',()=>{
 assert(!eligible({...item,package:'gpg-agent',installed:'2.4.7-21+deb13u1+dhi3'}));
 assert(!eligible({...item,package:'gnupg',installed:current}));
});
