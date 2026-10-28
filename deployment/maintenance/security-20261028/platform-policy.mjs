import assert from 'node:assert/strict';
// Exact upstream applicability, never a waiver for other advisories or builds.
export const cases=[

 {key:'vite-candlr',id:'CVE-2026-112942',package:'vite',type:'node-pkg',version:'8.3.0',image:'sha256:135ef4fadeb646dd4965a3451c0e033e93a142e0c9c4f44cf8fa9c35567f6017',containers:['utilibre-records-candlr-1'],path:'/app/frontend/node_modules/vite',source:'https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm'},
 {key:'vite-admin',id:'CVE-2026-112942',package:'vite',type:'node-pkg',version:'8.3.0',image:'sha256:b55be29fdd59cdb3b701a7b559ee66e0d9aee8168b91b4bb7dda066c6f267833',containers:['utilibre-expanded-penpot-admin-console-1'],path:'/nitrate/apps/admin-console/node_modules/.pnpm/vite@8.3.0_jiti@2.7.0/node_modules/vite',source:'https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm'},
 {key:'black-simplelogin',id:'CVE-2026-114134',package:'black',type:'python-pkg',version:'22.1.0',image:'sha256:58f6bcc27ca7232de5b53e4f5c70144987fbaeaddf4969807daf9581be28a6c0',containers:['utilibre-simplelogin-jobs-1','utilibre-simplelogin-smtp-1','utilibre-simplelogin-web-1'],path:'/code/.venv/lib/python3.12/site-packages/black-22.1.0.dist-info',source:'https://github.com/psf/black/security/advisories/GHSA-cg8m-r9f2-5wm2'},
 ...[
  ['CVE-2026-114612','GHSA-7hp6-4w63-5g45'],
  ['GHSA-g5ff-637f-6q2m','GHSA-g5ff-637f-6q2m']
 ].map(([id,ghsa])=>({key:'litellm-kitchenowl',id,package:'litellm',type:'python-pkg',version:'1.93.2',image:'sha256:70c2057cc388c50691e9ba1d8e8e0c09651979c05c72a2ed31ea89261b255838',containers:['utilibre-kitchenowl-app-1'],path:'/opt/venv/lib/python3.14/site-packages/litellm-1.93.2.dist-info',source:'https://github.com/BerriAI/litellm/security/advisories/'+ghsa})),
];
export function eligible(item){return cases.find(s=>item?.status==='needs-review'&&item.scope==='runtime-image'&&item.artifact===s.image&&item.id===s.id&&item.package===s.package&&item.type===s.type&&item.installed===s.version&&Array.isArray(item.containers)&&JSON.stringify([...item.containers].sort())===JSON.stringify([...s.containers].sort()));}
export function prove(item,rows){
 const s=eligible(item);assert(s);assert.deepEqual(rows.map(r=>r.container).sort(),[...s.containers].sort());
 for(const r of rows){
  assert.equal(r.image,s.image);assert.equal(r.imageOs,'linux');assert.equal(r.running,true);assert.equal(r.path,s.path);assert.equal(r.version,s.version);
  assert(/^[a-f0-9]{64}$/.test(r.metadataSha256));assert.equal(r.shadowed,false);
  if(s.package==='vite'){assert.equal(r.runtimePlatform,'linux');assert.equal(r.uncLikePathExists,false);}
  else if(s.package==='litellm'){
   assert.equal(r.applicationRole,true);assert.equal(r.sourceUnchanged,true);
   assert.deepEqual(r.flags,{LITELLM_LOCAL_MODEL_COST_MAP:'true',LITELLM_TELEMETRY:'false',LLM_MODEL:'',LLM_API_URL:'',COLLECT_METRICS:'false',KITCHENOWL_MCP_ENABLED:'false'});
   assert.equal(r.native.passed,true);assert.equal(r.native.proxyRoutesAbsent,true);
   assert.equal(r.native.proxyServerLoaded,false);assert.equal(r.native.providerCalled,false);
   assert.equal(r.native.nativeAccountsPassed,true);assert.equal(r.native.ingredientRows,2);
   assert.equal(r.native.network,'none');assert.equal(r.native.productionChanged,false);
  }
  else {assert.equal(r.hasActionFiles,false);assert.equal(r.applicationRole,true);assert.equal(r.actionManifestPresent,false);assert.equal(r.formattingPassed,true);}
 }
 return true;
}
