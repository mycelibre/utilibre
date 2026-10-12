import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,sha,current,previous,run,docker,inspect,bounds} from './stage.mjs';
process.umask(0o077);
const stage=JSON.parse(fs.readFileSync(root+'/stage.json'));assert.equal(stage.status,'passed');assert(!fs.existsSync(root+'/native.json'));
const symbols=f=>run('nm',['-D','--defined-only',f]).split('\n').map(l=>l.trim().split(/\s+/).at(-1));
const old=symbols(root+'/libraries/old.so'),next=symbols(root+'/libraries/new.so'),oldC=old.filter(x=>x.startsWith('heif_'));assert(oldC.length>200);for(const s of oldC)assert(next.includes(s));
const absent=old.filter(s=>!next.includes(s));assert.equal(absent.length,17);for(const s of absent)assert(/^_ZT[ISV]/.test(s)&&s.includes('ImageItem_Grid'));
for(const name of ['old','new'])assert.match(run('readelf',['-d',root+'/libraries/'+name+'.so']),/SONAME.*\[libheif.so.1\]/);
assert.equal(sha(fs.readFileSync(root+'/libraries/new.so')),current);assert.equal(sha(fs.readFileSync(root+'/libraries/old.so')),previous);
const fixture='/var/lib/utilibre-maintenance/heif-bookworm-followup-20261012/fixtures',svg=process.cwd()+'/deployment/maintenance/penpot-native-followup/fixtures';
const rows=[];
for(const row of stage.rows){
 assert.equal(inspect(row.candidate).Id,row.image);
 const shell=(id,script)=>docker('run',...bounds,'--user','65534:65534','--mount','type=bind,src='+fixture+',dst=/checks,readonly','--mount','type=bind,src='+svg+',dst=/svg,readonly','--entrypoint','sh',id,'-ec',script);
 const inventory=shell(row.image,'magick -list format 2>&1');assert(!inventory.includes('undefined symbol'));assert.match(inventory,/AVIF\s+r[-w][-+]/);assert.match(inventory,/HEIC\s+r[-w][-+]/);
 const deps=shell(row.image,'ldd /opt/imagick/lib/deps/libheif.so.1');assert(!deps.includes('not found'));
 const results=[];
 for(const ext of ['heic','avif']){
  const values=shell(row.image,`magick /checks/fictional.${ext} /tmp/decoded.png; magick identify -format '%w %h' /tmp/decoded.png; printf '\\n'; magick /tmp/decoded.png -format '%[fx:mean.r] %[fx:mean.g] %[fx:mean.b] %[fx:mean.a]' info:`).split(/\s+/).map(Number);
  assert.equal(values[0],32);assert.equal(values[1],24);for(let n=0;n<4;n++)assert(Math.abs(values[n+2]-[64,128,192,128][n]/255)<0.012);results.push({ext,rgbaDimensionsPassed:true});
 }
 const raster='for ext in png jpeg webp tiff; do magick -size 32x24 gradient:blue-red /tmp/a.$ext; test "$(magick identify -format "%w %h" /tmp/a.$ext)" = "32 24"; magick /tmp/a.$ext -depth 8 rgba:- | sha256sum; done; magick /svg/plain.svg -depth 8 rgba:- | sha256sum';
 assert.equal(shell(row.image,raster),shell(row.base,raster));
 const pdfPolicy='if magick -size 2x2 xc:white /tmp/fictional.pdf 2>/tmp/pdf-error; then head -c 5 /tmp/fictional.pdf; test "$(wc -c < /tmp/fictional.pdf)" -gt 100; if command -v gs; then exit 2; fi; else grep "NotAuthorized.*PDF" /tmp/pdf-error; fi';
 const pdf=shell(row.image,pdfPolicy);assert.equal(pdf,shell(row.base,pdfPolicy));
 // Private C++ RTTI/vtables are not public libheif API. Check every actual
 // ImageMagick ELF and HEIF codec plugin does not reference the removed names.
 const escaped=absent.join('|');const references=shell(row.image,"find /opt/imagick /usr/lib/x86_64-linux-gnu/libheif/plugins -type f ! -name '*.a' ! -path /opt/imagick/lib/deps/libheif.so.1 -exec grep -aEl '"+escaped+"' {} + || true");assert.equal(references,'');
 rows.push({...row,results,allOldPublicCExportsPreserved:true,privateTemplateSymbolsNotReferenced:true,existingDependenciesResolve:true,pngJpegWebpTiffSvgPixelsUnchanged:true,pdfBehavior:pdf.includes('NotAuthorized')?'existing-policy-denial-preserved':'native-pdf-writer-passed; pre-existing Ghostscript decoder unavailable'});
}
const record={date:new Date().toISOString(),status:'passed',rows,oldPublicCExports:oldC.length,oldAllExports:old.length,newAllExports:next.length,removedPrivateTemplateExports:absent,soname:'libheif.so.1',librarySha256:current,stageSha256:sha(fs.readFileSync(root+'/stage.json')),productionChanged:false};fs.writeFileSync(root+'/native.json',JSON.stringify(record,null,2)+'\n');
const manifest={schema:1,version:'2.18.3',status:'passed'};for(const row of rows){const alias='utilibre-penpot-'+row.role+':2.18.3-heif-aligned-20261012';docker('tag',row.image,alias);manifest[row.role]={image:alias,imageId:row.image};}const alias='utilibre-penpot-frontend:2.18.3-heif-unchanged-20261012';docker('tag',stage.frontend.imageId,alias);manifest.frontend={image:alias,imageId:stage.frontend.imageId};fs.writeFileSync('/var/lib/utilibre-maintenance/native-final/penpot-heif-alignment.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({status:'passed',roles:rows.length,oldPublicCExports:oldC.length,privateTemplatesRemoved:absent.length,fullApplication:'pending'}));
