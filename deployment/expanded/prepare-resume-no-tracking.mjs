// Exact pinned-build edits matching resume-no-tracking-source.patch; fail closed on drift.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
const root=process.argv[2] || '/app';
const digest=text=>createHash('sha256').update(text).digest('hex');
async function pinned(path,sha,change){
 const file=join(root,path), original=await readFile(file,'utf8');
 assert.equal(digest(original),sha,`Review changed upstream artifact: ${path}`);
 await writeFile(file,change(original));
}
function once(text,old,replacement){assert.equal(text.split(old).length,2,`Expected exactly one: ${old.slice(0,70)}`);return text.replace(old,replacement);}
await pinned('apps/server/dist/resume-data-validation-BGfRZbTb.mjs','ac166b8d2768ce334c97a1783e692ecca8144817523e2c19ebe57e174082e254',text=>once(text,
 'function shouldCountForStatistics(resume, viewer) {\n\treturn !isOwner(resume, viewer);\n}',
 'function shouldCountForStatistics(_resume, _viewer) {\n\t// Utilibre: gate before visitor deduplication and statistics writes.\n\treturn false;\n}'));
const service=await readFile(join(root,'apps/server/dist/service-SaYX5hQK.mjs'),'utf8');
assert.equal(digest(service),'14f6a3fe406f1a11c22a297d30ceb5d035d2832a78760ca88f8b427151fc0935','Review all analytics call sites if the service artifact changes');
assert.equal((service.match(/if \(shouldCountForStatistics\(resume\$\d+, viewer\)\)/g)||[]).length,2,'Both native write paths must use the same disabled gate');
await pinned('apps/web/dist/assets/use-resume-export-BuudfD4-.js','edf064b394a7cd021ec217f605d77f1bff0dc1774b6d28de8ab56920ee690f00',text=>once(text,
 ',o.publicResumePdf&&a.resume.statistics.recordDownload(o.publicResumePdf.publicResume).catch(Qd)',''));
await pinned('apps/web/dist/assets/route-CKn_KAgU.js','f85a818e06cf238d8bb137b4ea64720ea642622961702c05c9e1133b20d9cd8d',text=>{
 text=once(text,'T=(0,Q.jsx)(Qn,{})','T=null');
 text=once(text,'E=(0,Q.jsx)(mp,{isPublic:u})','E=null');
 const start=text.indexOf('function mp(e){'),end=text.indexOf('function hp(e){',start);
 assert(start>=0 && end>start && end-start>2000 && end-start<2500,'Expected the pinned statistics widget');
 assert(text.slice(start,end).includes('share-stats-title'));
 return text.slice(0,start)+'function mp(){return null}'+text.slice(end);
});
// Version immutable browser resources and every local reference, including prerendered pages.
const assetDir=join(root,'apps/web/dist/assets');
const names=(await readdir(assetDir)).filter(name=>/\.(js|css)$/.test(name));
const versions=new Map(names.map(name=>[name,name.replace(/\.(js|css)$/, '-utilibre-p1.$1')]));
const escaped=names.map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
const pattern=new RegExp(escaped.join('|'),'g');
async function rewrite(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const file=join(directory,entry.name);
  if(entry.isDirectory())await rewrite(file);
  else if(/\.(html|js|mjs|json|css)$/.test(entry.name)){
   const text=await readFile(file,'utf8'),updated=text.replace(pattern,name=>versions.get(name));
   if(updated!==text)await writeFile(file,updated);
  }
 }
}
for(const directory of ['apps/web/dist','apps/web/dist-prerender','apps/server/dist'])await rewrite(join(root,directory));
for(const [oldName,newName] of versions)await rename(join(assetDir,oldName),join(assetDir,newName));
console.log('Pinned native visitor statistics disabled before deduplication; browser event/widget removed; browser URLs versioned.');
