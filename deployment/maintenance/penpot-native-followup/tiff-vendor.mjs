// Review only. The DHI tools patches must not be mistaken for library fixes.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const commit='4560b6ac143a58056b793efe2d6bcd5e92bf3682';
const root='/var/lib/utilibre-maintenance/penpot-native-followup-20261012/tiff';
const names=['dhi-cve-2025-61143-tiffcrop-null-and-tiffdither-width.patch','dhi-cve-2025-61144-tiffcrop-sample-dump-bound.patch','dhi-cve-2025-8176-tiffmedian-dither-input-rows.patch','dhi-cve-2025-8177-thumbnail-colormap-bound.patch','dhi-cve-2025-8534-tiff2ps-bytecounts-check.patch','dhi-cve-2026-18495-tiff2pdf-integer-cast.patch','dhi-cve-2026-52490-tiffcrop-section-count-overflow.patch'];
await mkdir(root+'/sources/dhi-patches',{recursive:true});
const rows=[];
for(const name of names){
 const url=`https://raw.githubusercontent.com/docker-hardened-images/catalog/${commit}/package/deb/main/tiff/patch/${name}`;
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert(response.ok);
 const text=await response.text();assert(text.startsWith('From:')||text.includes('Subject:')||text.includes('diff --git'));
 const paths=[...new Set([...text.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(m=>m[1]))];assert(paths.length);
 for(const path of paths)assert.match(path,/^(tools|contrib)\//,'Unexpected library-level DHI patch; reassess native rebuild');
 await writeFile(root+'/sources/dhi-patches/'+name,text);
 rows.push({name,url,sha256:createHash('sha256').update(text).digest('hex'),paths});
}
const record={schema:1,createdAt:new Date().toISOString(),commit,rows,conclusion:'All seven DHI3 backports modify command-line/contributed tools, not libtiff library source. Candidate still must retain native hardening, dependencies, codec/API compatibility and exclude those tools; this is not a blanket CVE waiver.'};
await writeFile(root+'/vendor-scope.json',JSON.stringify(record,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(record));
