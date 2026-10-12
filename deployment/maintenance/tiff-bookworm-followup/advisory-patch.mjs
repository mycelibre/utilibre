// Reviewable unchanged-application binding only; no dependency decisions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,read,sha,inspect,target} from './common.mjs';
import {replaceImagePins} from '../language-final/release.mjs';
const file=new URL('../advisory-reviews.json',import.meta.url).pathname,original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original),r=read(root+'/release.json'),b=read(root+'/stage.json'),a=read(root+'/application.json');
assert.equal(r.status,'passed');assert.equal(b.status,'passed');assert.equal(a.status,'passed');assert(b.priorRuntimeBytesUnchanged&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged&&a.nativeRasterExportImport&&a.readOnlyRoleAndDeniedDelete);assert.equal(inspect(target).Image,b.image);
for(const [file,hash]of Object.entries(r.proofs))assert.equal(sha(fs.readFileSync(root+'/'+file+'.json')),hash);
for(const review of Object.values(reviews)){
 let changed=false;for(const [name,image]of Object.entries(review.containers||{}))if(name==='/'+target&&image===b.base){review.containers[name]=b.image;changed=true;}
 for(const [name,before]of Object.entries(review.files||{}))if(name==='/home/ubuntu/freetools/deployment/calendar/compose.gathio.yaml'){
  const current=fs.readFileSync(name,'utf8');if(sha(current)===before)continue;const reversed=replaceImagePins(current,[{from:b.candidate,to:b.baseRef}]);assert.equal(reversed.replaced,1);assert.equal(sha(reversed.text),before);review.files[name]=sha(current);changed=true;
 }
 if(changed)review.runtimeEvidence='2026-10-12 native TIFF-only follow-up: application/configuration and all unrelated runtime bytes preserved, including OpenLDAP/Xlib and prior GDAL fixes. Full TIFF suite, old-header codecs, GDAL/PostGIS raster, typed data, roles and synthetic restore passed; exact live image/library and health verified. See tiff-bookworm-followup/README.md. Application versions/advisory ranges unchanged; dependency findings remain separate. '+(review.runtimeEvidence||'');
}
const before=original.split('\n'),after=(JSON.stringify(reviews,null,2)+'\n').split('\n');assert.equal(before.length,after.length);const hunks=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])hunks.push('@@\n-'+before[i]+'\n+'+after[i]);if(!hunks.length){console.error('No matching Gathio application advisory binding needs updating; no patch emitted.');}else console.log('*** Begin Patch\n*** Update File: '+file+'\n'+hunks.join('\n')+'\n*** End Patch');
