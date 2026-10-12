// Emit a reviewable unchanged-application binding patch, never a dependency
// waiver or a direct write to application reviews/security decisions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,sha,run} from './stage.mjs';
import {inputs,liveNative} from './release-inputs.mjs';
import {replaceImagePins} from '../language-final/release.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),docker=(...args)=>run('docker',args);
const release=read(root+'/penpot-release.json'),stage=read(root+'/stage.json');
assert.equal(release.status,'passed');assert.deepEqual(release.evidence,inputs().evidence);assert.equal(release.rows.length,2);
for(const row of release.rows){assert.equal(JSON.parse(docker('inspect',row.name))[0].Image,row.newImage);liveNative(docker,row.name);const s=stage.rows.find(s=>s.role===row.service.replace('penpot-',''));assert(s);assert.equal(s.image,row.newImage);assert.equal(s.base,row.oldImage);assert(s.allOtherRuntimeConfigBytesUnchanged&&s.packageInventoryUnchanged);}
const file=new URL('../advisory-reviews.json',import.meta.url).pathname,original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original),compose='/home/ubuntu/freetools/deployment/expanded/compose.yaml';
for(const review of Object.values(reviews)){
 let changed=false;for(const row of release.rows)if(review.containers?.['/'+row.name]===row.oldImage){review.containers['/'+row.name]=row.newImage;changed=true;}
 if(review.files?.[compose]){const current=fs.readFileSync(compose,'utf8');if(sha(current)!==review.files[compose]){const reversed=replaceImagePins(current,release.rows.map(row=>({from:row.newRef,to:row.oldRef})));assert.equal(reversed.replaced,2);assert.equal(sha(reversed.text),review.files[compose]);review.files[compose]=sha(current);changed=true;}}
 if(changed)review.runtimeEvidence='2026-10-12 HEIF private-library alignment only: exact existing Debian system payload copied into ImageMagick dependency path, with all other runtime/config/package bytes unchanged. Shared Compose bindings checked by exact reversal of only the two Penpot image pins; unrelated application content is not inferred from that hash. Public heif C ABI and actual consumers pass; two-account editable export/import/reload, permissions, native media, deletion and public login/OIDC passed. App versions/advisory ranges unchanged; dependency findings stay separate. See penpot-heif-alignment/README.md. '+(review.runtimeEvidence||'');
}
const before=original.split('\n'),after=(JSON.stringify(reviews,null,2)+'\n').split('\n');assert.equal(before.length,after.length);const hunks=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])hunks.push('@@\n-'+before[i]+'\n+'+after[i]);
if(!hunks.length)console.error('No matching unchanged Penpot application binding needs updating; no patch emitted.');else console.log('*** Begin Patch\n*** Update File: '+file+'\n'+hunks.join('\n')+'\n*** End Patch');
