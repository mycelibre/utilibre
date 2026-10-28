import test from 'node:test';import assert from 'node:assert/strict';
import {cases,eligible,prove} from './platform-policy.mjs';
const item=s=>({status:'needs-review',scope:'runtime-image',artifact:s.image,id:s.id,package:s.package,type:s.type,installed:s.version,containers:s.containers,target:s.target});
const proof=s=>s.containers.map(container=>({binarySha256:s.binarySha256,nativeSha256:s.nativeSha256,machOHeader:'cffaedfe0c0000010000000002000000',nativeHeader:'7f454c4602010100000000000000000002003e00',runtimeArch:'x64',imageArch:'amd64',compiledOs:'darwin',compiledArch:'arm64',module:'github.com/evanw/esbuild/cmd/esbuild',nativeTransform:true,nativeApplication:true,network:'none',container,image:s.image,imageOs:'linux',running:true,path:s.path,version:s.version,metadataSha256:'a'.repeat(64),shadowed:false,runtimePlatform:'linux',uncLikePathExists:false,hasActionFiles:false,applicationRole:true,actionManifestPresent:false,formattingPassed:true,
 sourceUnchanged:true,flags:{LITELLM_LOCAL_MODEL_COST_MAP:'true',LITELLM_TELEMETRY:'false',LLM_MODEL:'',LLM_API_URL:'',COLLECT_METRICS:'false',KITCHENOWL_MCP_ENABLED:'false'},
 native:{passed:true,proxyRoutesAbsent:true,proxyServerLoaded:false,providerCalled:false,nativeAccountsPassed:true,ingredientRows:2,network:'none',productionChanged:false}}));
test('accepts exact platform/component evidence, including SDK-only KitchenOwl',()=>{for(const s of cases)assert(prove(item(s),proof(s)));});
test('no source, sibling-advisory, version or image-wide waiver',()=>{
 for(const s of cases)for(const change of [i=>i.scope='tracked-build-input',i=>i.artifact='sha256:'+'0'.repeat(64),i=>i.id='CVE-2026-112943',i=>i.installed='26.10.0',i=>i.containers=[...i.containers,'other']]){const i=item(s);change(i);assert.equal(eligible(i),undefined);assert.throws(()=>prove(i,proof(s)));}
});
test('LiteLLM review fails if proxy, provider, telemetry, source or account evidence changes',()=>{
 for(const s of cases.filter(s=>s.package==='litellm'))for(const change of [r=>r.flags.LLM_MODEL='enabled',r=>r.flags.LITELLM_TELEMETRY='true',r=>r.sourceUnchanged=false,
  r=>r.native.proxyServerLoaded=true,r=>r.native.proxyRoutesAbsent=false,r=>r.native.providerCalled=true,r=>r.native.nativeAccountsPassed=false,r=>r.applicationRole=false,r=>r.native.productionChanged=true]){
  const rows=proof(s);change(rows[0]);assert.throws(()=>prove(item(s),rows));
 }
});
test('rejects missing/mixed or unsupported observed platform and package evidence',()=>{
 for(const s of cases)for(const change of [r=>r.imageOs='windows',r=>r.running=false,r=>r.shadowed=true,r=>r.version='unknown',r=>r.metadataSha256='',r=>r.image='other']){const rows=proof(s);change(rows[0]);assert.throws(()=>prove(item(s),rows));}
 for(const s of cases.filter(s=>s.package==='vite'))for(const change of [r=>r.runtimePlatform='win32',r=>r.uncLikePathExists=true]){const rows=proof(s);change(rows[0]);assert.throws(()=>prove(item(s),rows));}
 for(const change of [r=>r.hasActionFiles=true,r=>r.actionManifestPresent=true,r=>r.applicationRole=false,r=>r.formattingPassed=false]){const s=cases.find(s=>s.package==='black'),rows=proof(s);change(rows[0]);assert.throws(()=>prove(item(s),rows));}
 assert.throws(()=>prove(item(cases.find(s=>s.package==='black')),proof(cases.find(s=>s.package==='black')).slice(1)));
});

test('Mac executable attribution never clears Linux binaries or missing native checks',()=>{
 const s=cases.find(s=>s.package==='stdlib');const other={...item(s),target:s.target.replace('darwin','linux')};assert.equal(eligible(other),undefined);
 for(const change of [r=>r.compiledOs='linux',r=>r.binarySha256='other',r=>r.machOHeader='',r=>r.runtimeArch='arm64',r=>r.nativeHeader='',r=>r.nativeTransform=false,r=>r.nativeApplication=false,r=>r.network='external']){const rows=proof(s);change(rows[0]);assert.throws(()=>prove(item(s),rows));}
});
