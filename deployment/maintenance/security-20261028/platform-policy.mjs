import assert from 'node:assert/strict';
// Exact upstream applicability, never a waiver for other advisories or builds.
export const cases=[
 {key:'vite-candlr',id:'CVE-2026-112942',package:'vite',type:'node-pkg',version:'8.3.0',image:'sha256:135ef4fadeb646dd4965a3451c0e033e93a142e0c9c4f44cf8fa9c35567f6017',containers:['utilibre-records-candlr-1'],path:'/app/frontend/node_modules/vite',source:'https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm'},
 {key:'vite-admin',id:'CVE-2026-112942',package:'vite',type:'node-pkg',version:'8.3.0',image:'sha256:b55be29fdd59cdb3b701a7b559ee66e0d9aee8168b91b4bb7dda066c6f267833',containers:['utilibre-expanded-penpot-admin-console-1'],path:'/nitrate/apps/admin-console/node_modules/.pnpm/vite@8.3.0_jiti@2.7.0/node_modules/vite',source:'https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm'},
 {key:'black-simplelogin',id:'CVE-2026-114134',package:'black',type:'python-pkg',version:'22.1.0',image:'sha256:58f6bcc27ca7232de5b53e4f5c70144987fbaeaddf4969807daf9581be28a6c0',containers:['utilibre-simplelogin-jobs-1','utilibre-simplelogin-smtp-1','utilibre-simplelogin-web-1'],path:'/code/.venv/lib/python3.12/site-packages/black-22.1.0.dist-info',source:'https://github.com/psf/black/security/advisories/GHSA-cg8m-r9f2-5wm2'},
];
export function eligible(item){return cases.find(s=>item?.status==='needs-review'&&item.scope==='runtime-image'&&item.artifact===s.image&&item.id===s.id&&item.package===s.package&&item.type===s.type&&item.installed===s.version&&Array.isArray(item.containers)&&JSON.stringify([...item.containers].sort())===JSON.stringify([...s.containers].sort()));}
export function prove(item,rows){
 const s=eligible(item);assert(s);assert.deepEqual(rows.map(r=>r.container).sort(),[...s.containers].sort());
 for(const r of rows){
  assert.equal(r.image,s.image);assert.equal(r.imageOs,'linux');assert.equal(r.running,true);assert.equal(r.path,s.path);assert.equal(r.version,s.version);
  assert(/^[a-f0-9]{64}$/.test(r.metadataSha256));assert.equal(r.shadowed,false);
  if(s.package==='vite'){assert.equal(r.runtimePlatform,'linux');assert.equal(r.uncLikePathExists,false);}
  else {assert.equal(r.hasActionFiles,false);assert.equal(r.applicationRole,true);assert.equal(r.actionManifestPresent,false);assert.equal(r.formattingPassed,true);}
 }
 return true;
}
