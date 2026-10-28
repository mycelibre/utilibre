import test from 'node:test';import assert from 'node:assert/strict';
import {cases,eligible,prove} from './platform-policy.mjs';
const item=s=>({status:'needs-review',scope:'runtime-image',artifact:s.image,id:s.id,package:s.package,type:s.type,installed:s.version,containers:s.containers});
const proof=s=>s.containers.map(container=>({container,image:s.image,imageOs:'linux',running:true,path:s.path,version:s.version,metadataSha256:'a'.repeat(64),shadowed:false,runtimePlatform:'linux',uncLikePathExists:false,hasActionFiles:false,applicationRole:true,actionManifestPresent:false,formattingPassed:true}));
test('accepts exact Linux Vite and installed Black runtime evidence',()=>{for(const s of cases)assert(prove(item(s),proof(s)));});
test('no source, sibling-advisory, version or image-wide waiver',()=>{
 for(const s of cases)for(const change of [i=>i.scope='tracked-build-input',i=>i.artifact='sha256:'+'0'.repeat(64),i=>i.id='CVE-2026-112943',i=>i.installed='26.10.0',i=>i.containers=[...i.containers,'other']]){const i=item(s);change(i);assert.equal(eligible(i),undefined);assert.throws(()=>prove(i,proof(s)));}
});
test('rejects missing/mixed or unsupported observed platform and package evidence',()=>{
 for(const s of cases)for(const change of [r=>r.imageOs='windows',r=>r.running=false,r=>r.shadowed=true,r=>r.version='unknown',r=>r.metadataSha256='',r=>r.image='other']){const rows=proof(s);change(rows[0]);assert.throws(()=>prove(item(s),rows));}
 for(const s of cases.slice(0,2))for(const change of [r=>r.runtimePlatform='win32',r=>r.uncLikePathExists=true]){const rows=proof(s);change(rows[0]);assert.throws(()=>prove(item(s),rows));}
 for(const change of [r=>r.hasActionFiles=true,r=>r.actionManifestPresent=true,r=>r.applicationRole=false,r=>r.formattingPassed=false]){const s=cases[2],rows=proof(s);change(rows[0]);assert.throws(()=>prove(item(s),rows));}
 assert.throws(()=>prove(item(cases[2]),proof(cases[2]).slice(1)));
});
