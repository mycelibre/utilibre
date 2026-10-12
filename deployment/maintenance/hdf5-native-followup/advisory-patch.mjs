// Emit reviewable application-image binding only after this exact live release.
// Root applies; this does not clear native-package vulnerabilities.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,spec,sha,read,docker,inspect} from './common.mjs';
import {replaceImagePins} from '../language-final/release.mjs';
const file=new URL('../advisory-reviews.json',import.meta.url).pathname;
const original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original),r=read(root+'/release.json'),b=read(root+'/stage.json'),a=read(root+'/application.json');
assert.equal(r.status,'passed');assert.equal(r.groups.length,1);assert.equal(b.status,'passed');assert.equal(a.status,'passed');
const g=r.groups[0];assert.equal(g.status,'passed');for(const[p,h]of Object.entries(r.proofs))assert.equal(sha(fs.readFileSync(root+'/'+p+'.json')),h);
assert.equal(inspect(spec.container).Image,b.image);for(const f of spec.libraries)assert.equal(docker('exec',spec.container,'sha256sum','/usr/lib/x86_64-linux-gnu/'+f).split(/\s/)[0],b.newAbi[f].sha256);
assert(b.configurationUnchanged&&b.unrelatedPackagesUnchanged&&b.priorRuntimeBytesUnchanged);
for(const review of Object.values(reviews)){
 let changed=false;
 for(const [name,image]of Object.entries(review.containers||{})){if(name==='/'+spec.container&&image===b.base){review.containers[name]=b.image;changed=true;}}
 for(const[name,before]of Object.entries(review.files||{})){
  if(!g.files.includes(name))continue;const current=fs.readFileSync(name,'utf8');if(sha(current)===before)continue;
  const reversed=replaceImagePins(current,[{from:b.candidate,to:spec.baseRef}]);assert.equal(reversed.replaced,1);assert.equal(sha(reversed.text),before,'Only this completed image scalar may change');review.files[name]=sha(current);changed=true;
 }
 if(changed)review.runtimeEvidence='2026-10-12 native HDF5 follow-up: exact two-library native source backport preserves the application, other runtime libraries, configuration, ABI/dependencies and prior fixes. Complete serial upstream build/tests, old-header HDF5/HL/netCDF/GDAL roundtrips and synthetic Gathio native permission/dump/restore gates passed. Exact live release/library bytes rechecked; see hdf5-native-followup/README.md. Application version/advisory ranges unchanged; no dependency findings waived by this rebinding. '+(review.runtimeEvidence||'');
}
const before=original.split('\n'),after=(JSON.stringify(reviews,null,2)+'\n').split('\n');assert.equal(before.length,after.length);const hunks=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])hunks.push('@@\n-'+before[i]+'\n+'+after[i]);
if(hunks.length)console.log('*** Begin Patch\n*** Update File: '+file+'\n'+hunks.join('\n')+'\n*** End Patch');
else console.log('No matching Gathio application-advisory bindings; nothing to rebase.');
