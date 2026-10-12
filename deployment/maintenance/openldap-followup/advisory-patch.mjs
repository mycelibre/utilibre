// Emit a reviewable unchanged-application binding patch; never apply or waive CVEs.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceImagePins} from '../language-final/release.mjs';
const root='/var/lib/utilibre-maintenance/openldap-followup-20261012',file=new URL('../advisory-reviews.json',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original),release=read(root+'/release.json');assert.equal(release.status,'passed');assert.equal(release.groups.length,4);
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const rows=[];
for(const g of release.groups){assert.equal(g.status,'passed');
 for(const [p,h]of Object.entries(g.proofs))assert.equal(sha(fs.readFileSync(p)),h);
 for(const row of g.rows){
  if(row.oldImage===row.newImage)continue;
  const b=read(root+'/images/'+row.key+'/build.json'),a=read(root+'/images/'+row.key+'/application.json');
  assert(b.passed&&b.nativePassedOldAndNew&&a.passed);assert.equal(row.newImage,b.imageId);assert.equal(row.oldImage,b.base);assert.equal(a.imageId,b.imageId);
  for(const p of ['application','configuration','otherLibraries','otherPackages'])assert.match(b.hashes[p],/^[a-f0-9]{64}  -$/);
  assert.equal(docker('inspect',row.name,'--format','{{.Image}}'),row.newImage);
  for(const lib of ['libldap','liblber'])assert.equal(docker('exec',row.name,'sha256sum','/usr/lib/x86_64-linux-gnu/'+lib+'-2.5.so.0.1.8').split(/\s+/)[0],b.newAbi[lib].sha256);
  rows.push(row);
 }
}
for(const review of Object.values(reviews)){
 let changed=false;
 for(const [name,image]of Object.entries(review.containers||{})){const row=rows.find(r=>'/'+r.name===name&&r.oldImage===image);if(row){review.containers[name]=row.newImage;changed=true;}}
 for(const [name,before]of Object.entries(review.files||{})){
  const groups=release.groups.filter(g=>g.files.includes(name));if(!groups.length)continue;const current=fs.readFileSync(name,'utf8');if(sha(current)===before)continue;
  const relevant=groups.flatMap(g=>g.rows).filter(r=>r.oldRef!==r.newRef),reversed=replaceImagePins(current,relevant.map(r=>({from:r.newRef,to:r.oldRef})));assert.equal(reversed.replaced,relevant.length);assert.equal(sha(reversed.text),before,'Only completed LDAP image scalars may change');review.files[name]=sha(current);changed=true;
 }
 if(changed)review.runtimeEvidence='2026-10-12 native OpenLDAP CVE-2023-2953 follow-up: exact completed four-role releases preserve application/configuration and unrelated native bytes, ABI/dependencies and preceding fixes. Native URL/IPv6/GnuTLS/BER/LDIF checks and upstream suite passed; Kuma setup/login, Rallly two-account poll/guest vote/ownership, RSS-Bridge local HTTPS-to-Atom, and Gathio native role/dump/restore checks passed. Live image and library hashes rechecked. See openldap-followup/README.md. Application versions and advisory ranges are unchanged; this rebinding clears no dependency findings. '+(review.runtimeEvidence||'');
}
const before=original.split('\n'),after=(JSON.stringify(reviews,null,2)+'\n').split('\n');assert.equal(before.length,after.length);const hunks=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])hunks.push('@@\n-'+before[i]+'\n+'+after[i]);assert(hunks.length,'No pending exact application binding');console.log('*** Begin Patch\n*** Update File: '+file+'\n'+hunks.join('\n')+'\n*** End Patch');
