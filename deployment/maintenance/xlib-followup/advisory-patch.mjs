// Emit a reviewable patch for unchanged application bindings, never the CVE ledger.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {replaceImagePins} from '../language-final/release.mjs';
const root='/var/lib/utilibre-maintenance/xlib-followup-20261012',file=new URL('../advisory-reviews.json',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original),release=read(root+'/release.json');assert.equal(release.status,'passed');assert.equal(release.groups.length,3);
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const rows=[];
for(const g of release.groups){assert.equal(g.status,'passed');
 for(const [p,h]of Object.entries(g.proofs))assert.equal(sha(fs.readFileSync(p)),h);
 for(const row of g.rows){if(row.oldImage===row.newImage)continue;const b=read(root+'/images/'+row.key+'/build.json');assert.equal(b.status,'staged');assert(b.configurationUnchanged);assert.equal(row.newImage,b.imageId);assert.equal(row.oldImage,b.base);assert.match(b.preservation.application,/^[a-f0-9]{64}/);assert.match(b.preservation.configuration,/^[a-f0-9]{64}/);
  assert.equal(docker('inspect',row.name,'--format','{{.Image}}'),row.newImage);for(const a of b.abi)assert.equal(docker('exec',row.name,'sha256sum',a.path).split(/\s+/)[0],a.newSha256);rows.push(row);
 }
}
for(const review of Object.values(reviews)){
 let changed=false;
 for(const [name,image]of Object.entries(review.containers||{})){const row=rows.find(r=>'/'+r.name===name&&r.oldImage===image);if(row){review.containers[name]=row.newImage;changed=true;}}
 for(const [path,before]of Object.entries(review.files||{})){
  const group=release.groups.find(g=>g.files.includes(path));if(!group)continue;const current=fs.readFileSync(path,'utf8');if(sha(current)===before)continue;
  const relevant=group.rows.filter(r=>r.oldRef!==r.newRef),reversed=replaceImagePins(current,relevant.map(r=>({from:r.newRef,to:r.oldRef})));assert.equal(reversed.replaced,relevant.length);assert.equal(sha(reversed.text),before,'Only completed Xlib image scalars may change');review.files[path]=sha(current);changed=true;
 }
 if(changed)review.runtimeEvidence='2026-10-12 native X client library follow-up: exact completed five-role releases preserve application/configuration bytes and prior repairs; native system/private library hashes and current live image identity verified. Forms account isolation/image/PDF, BreezeWiki native draw/homepage, Penpot two-account editable export/import/media, and Gathio native role/dump/restore gates passed. See xlib-followup/README.md. Existing app version/advisory ranges are unchanged; no dependency finding is cleared by this rebinding. '+(review.runtimeEvidence||'');
}
const before=original.split('\n'),after=(JSON.stringify(reviews,null,2)+'\n').split('\n');assert.equal(before.length,after.length);const hunks=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])hunks.push('@@\n-'+before[i]+'\n+'+after[i]);assert(hunks.length,'No pending exact application binding');console.log('*** Begin Patch\n*** Update File: '+file+'\n'+hunks.join('\n')+'\n*** End Patch');
