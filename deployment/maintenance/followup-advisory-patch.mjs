// Rebind unchanged application advisories through two exact native releases.
// Emits an apply_patch only; dependency verdicts and raw findings are untouched.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {replaceImagePins} from './language-final/release.mjs';
const root='/var/lib/utilibre-maintenance',file='/home/ubuntu/freetools/deployment/maintenance/advisory-reviews.json';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original);
const paths=['closure-followup-20261012/rssbridge-curl-release.json','python-bookworm-followup-20261012/release.json'];
const releases=paths.filter(p=>fs.existsSync(root+'/'+p)).map(p=>({path:p,...read(root+'/'+p)}));
for(const release of releases){
 assert.equal(release.status,'passed');
 for(const group of release.groups){assert.equal(group.status,'passed');
  for(const row of group.rows){
   if(row.oldImage===row.newImage)continue;
   const proofDir=root+(row.key==='rssbridge'?'/bookworm-curl-followup-20261012/images/rssbridge':'/python-bookworm-followup-20261012/images/'+row.key);
   const b=read(proofDir+'/build.json'),n=read(proofDir+'/native.json'),a=read(proofDir+'/application.json');
   assert(b.passed&&b.configurationUnchanged&&n.passed&&a.passed);assert.equal(b.imageId,row.newImage);assert.equal(n.imageId,row.newImage);assert.equal(a.imageId,row.newImage);assert.equal(b.base,row.oldImage);
   for(const name of ['applicationSha256','etcSha256','unrelatedLibrariesSha256'])assert.match(b[name],/^[a-f0-9]{64}/);
   if(row.key==='rssbridge'){const p=read(proofDir+'/impersonate.json');assert(p.passed&&p.imageId===row.newImage);assert(p.proofs.length===2&&p.proofs.every(x=>x.chrome131Preserved&&x.http2Negotiated&&x.unsupportedProtocolsRejected&&x.fictionalGithubHttpsToAtom));}
   else {assert(['kuma','gathio'].includes(row.key));assert(n.abiPreserved&&n.upstreamPythonModules===10&&n.upstreamExpatChecks===5196);assert(n.native.find(x=>x.image===row.newImage)?.bothParserPathsUse128BitSalt);}
  }
 }
}
const rows=releases.flatMap(r=>r.groups.flatMap(g=>g.rows));
for(const review of Object.values(reviews)){
 let changed=false;
 for(const [name,before]of Object.entries(review.containers||{})){
  let image=before;for(const row of rows)if('/'+row.name===name&&row.oldImage===image)image=row.newImage;
  if(image!==before){assert.equal(cp.execFileSync('docker',['inspect',name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),image);review.containers[name]=image;changed=true;}
 }
 for(const [name,beforeHash]of Object.entries(review.files||{})){
  const bytes=fs.readFileSync(name);if(sha(bytes)===beforeHash)continue;
  assert(releases.some(r=>r.groups.some(g=>g.files.includes(name))),'Unreviewed application configuration change');
  const current=bytes.toString('utf8');
  let reconstructed=current,matched=false;
  for(const release of [...releases].reverse()){
   reconstructed=replaceImagePins(reconstructed,release.groups.flatMap(g=>g.rows).filter(r=>r.oldRef!==r.newRef).map(r=>({from:r.newRef,to:r.oldRef}))).text;
   if(sha(reconstructed)===beforeHash){matched=true;break;}
  }
  assert(matched,'Configuration changed beyond tested native image pins');review.files[name]=sha(current);changed=true;
 }
 if(changed)review.runtimeEvidence='2026-10-12 native Python/Expat and RSS-Bridge curl follow-up: exact completed role-specific releases preserve the application and configuration bytes, except RSS-Bridge\'s explicitly tested upstream impersonation library. Native parser, library ABI, local HTTP/TLS/feed or application-login gates and live health passed. See python-bookworm-followup/README.md and bookworm-curl-followup/README.md. Application version and advisory IDs/ranges are unchanged; this does not clear dependency findings. '+(review.runtimeEvidence||'');
}
const before=original.split('\n'),after=(JSON.stringify(reviews,null,2)+'\n').split('\n');assert.equal(before.length,after.length);
const changes=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])changes.push('@@\n-'+before[i]+'\n+'+after[i]);
assert(changes.length,'No pending application bindings');console.log('*** Begin Patch\n*** Update File: '+file+'\n'+changes.join('\n')+'\n*** End Patch');
