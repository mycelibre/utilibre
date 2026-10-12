// Only rebind unchanged application advisory evidence after a tested native overlay.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {inputs,directory,liveNative} from './release-inputs.mjs';
import {replaceImagePins} from '../language-final/release.mjs';
const file='/home/ubuntu/freetools/deployment/maintenance/advisory-reviews.json';
const original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original),release=JSON.parse(fs.readFileSync(directory+'/penpot-release.json'));
assert.equal(release.status,'passed');assert.deepEqual(release.evidence,inputs().evidence);
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000}).trim();
for(const row of release.rows){assert.equal(docker('inspect',row.name,'--format','{{.Image}}'),row.newImage);liveNative(docker,row.name);assert.equal(reviews.penpot.containers['/'+row.name],row.oldImage);reviews.penpot.containers['/'+row.name]=row.newImage;}
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const review of Object.values(reviews))for(const [path,before]of Object.entries(review.files||{})){
 if(path!=='/home/ubuntu/freetools/deployment/expanded/compose.yaml')continue; // Unrelated drift stays unresolved.
 const current=fs.readFileSync(path,'utf8');if(sha(current)===before)continue;
 const restored=replaceImagePins(current,release.rows.map(r=>({from:r.newRef,to:r.oldRef})));assert.equal(restored.replaced,2);assert.equal(sha(restored.text),before,'Only exact native image scalars may change');review.files[path]=sha(current);
}
reviews.penpot.runtimeEvidence='2026-10-12 librsvg/TIFF native release: unchanged Penpot 2.18.3 application/configuration bytes; full two-account native import/export/edit/reload/permission/media checks and production login/OIDC passed. librsvg 2.60.3 and TIFF 4.7.2 retain the old native ABI; library payloads and completed live role identities verified. See penpot-native-followup/README.md. Only unchanged application advisory bindings are renewed, not dependency clearance. '+reviews.penpot.runtimeEvidence;
const before=original.split('\n'),after=(JSON.stringify(reviews,null,2)+'\n').split('\n');assert.equal(before.length,after.length);
const hunks=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])hunks.push('@@\n-'+before[i]+'\n+'+after[i]);assert(hunks.length);
console.log('*** Begin Patch\n*** Update File: '+file+'\n'+hunks.join('\n')+'\n*** End Patch');
