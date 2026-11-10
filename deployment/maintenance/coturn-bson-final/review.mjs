// Draft only: no scanner mutation, automatic suppression or ledger writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,sha,read,run,docker,inspect,names,version,targets,reserve,reserveSpec} from './common.mjs';
import {eligible,reserveEligible} from './review-policy.mjs';
import {freshScan,overlayRows} from '../review-native-backports.mjs';import {additionalOverlayReceipts}from'../followup-overlays.mjs';import {expatDescendant}from'../security-20261103/expat-policy.mjs';
import {validateDecision} from '../triage.mjs';
import {proveMongocRelease} from '../security-20261109/mongoc-policy.mjs';
process.umask(0o077);
const p='/var/lib/utilibre-maintenance',queue=read(p+'/security-queue.json'),scan=read(p+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
if(process.argv.includes('--cursor-nov9')){
 assert.deepEqual(process.argv.slice(2),['--cursor-nov9']);
 const dir=p+'/security-20261109/mongoc',input=read(new URL('../security-20261109/mongoc-inputs.json',import.meta.url)),s=input.rows[0];
 const b=read(dir+'/coturn/build.json'),v=read(dir+'/coturn/inventory.json'),a=read(dir+'/coturn/application.json'),g=read(dir+'/coturn/scan-gate.json'),release=read(dir+'/release.json');
 proveMongocRelease(input,s,b,v,a,g);
 assert.equal(release.status,'passed');assert.equal(release.groups.length,2);
 assert(release.groups.every(g=>g.status==='passed'&&Date.parse(g.completedAt)<=Date.parse(scan.completedAt)));
 const offer=read(dir+'/source-offer.json');assert(offer.published);assert.equal(sha(fs.readFileSync(offer.archive)),offer.sha256);
 const prior=p+'/security-20261028/bson',auth=read(prior+'/authenticated.json'),native=read(prior+'/native.json');
 assert.equal(sha(fs.readFileSync(prior+'/authenticated.json')),input.retainedSourceProofSha256);
 assert.equal(auth.sourceTreeSha256,input.sourceTreeSha256);assert.equal(native.status,'passed');
 // The new patch changes only cursor source, preserving the previous OCSP fix;
 // the already corrected BSON library is unchanged in the full image inventory.
 const actual=[];
 for(const name of targets){
  assert.equal(inspect(name).Image,b.imageId);
  assert(release.groups.some(g=>g.rows.some(r=>r.name===name&&r.oldImage===s.base&&r.newImage===b.imageId)));
  for(const [file,expected] of [[input.library,b.librarySha256],['/usr/lib/x86_64-linux-gnu/libbson-1.0.so.0.0.0',native.librarySha256]]){
   const hash=docker('exec',name,'sha256sum',file).split(/\s/)[0];assert.equal(hash,expected);actual.push({name,file,sha256:hash});
  }
 }
 const decisions=queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&i.artifact===b.imageId&&i.installed===version&&['libmongoc-1.0-0t64','libbson-1.0-0t64'].includes(i.package)&&['CVE-2026-120956','CVE-2026-84964','CVE-2026-106437'].includes(i.id)&&JSON.stringify([...i.containers].sort())===JSON.stringify([...targets].sort())).map(i=>validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact cursor fixes 9e5423f882089c2fbede5cafd5a1fee1bab58780 and 4fdc5d553801fcde7bd5c86370917cc4ac704f54, applied without fuzz to authenticated source retaining the prior OCSP repair. Cursor SHA256 ${input.cursor.afterSha256}; live libmongoc SHA256 ${b.librarySha256}. All 1710 exports and linked features preserved; ordinary old-header client passed before/after. Full-image comparison changes only libmongoc; corrected BSON bytes remain unchanged. Isolated UDP/TCP/TLS transfer, authentication, quota and private-peer denial passed. Both idle-checked releases and live hashes verified. No malicious-server, actual MongoDB service or external-NAT test claimed. Original package metadata and raw findings retained. Exact advisory/package/artifact/roles only. https://github.com/mongodb/mongo-c-driver/commit/4fdc5d553801fcde7bd5c86370917cc4ac704f54 ; evidence security-20261109/mongoc/.`}));
 assert.equal(read(p+'/security.json').completedAt,scan.completedAt);
 fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,actual},null,2)+'\n');
 console.log(JSON.stringify({prepared:decisions.length,applied:false}));process.exit(0);
}
if(reserve){
 const release=read(root+'/release.json'),n=read(root+'/native.json'),stage=read(root+'/stage.json'),app=read(root+'/application.json'),offer=read(root+'/source-offer.json');
 const v=read(root+'/coturn/inventory.json'),g=read(root+'/coturn/scan-gate.json'),auth=read(root+'/authenticated.json');
 for(const report of [release,n,stage,app,auth])assert.equal(report.status,'passed');
 assert(v.passed&&g.passed&&g.primarySourceFixVerified&&g.newHighCritical===0);
 assert.equal(v.imageId,stage.image);assert.equal(g.imageId,stage.image);assert.equal(app.image,stage.image);
 assert.deepEqual(v.changedPaths,[reserveSpec.library]);assert.equal(n.patchSha256,reserveSpec.patchSha256);assert.equal(auth.patchSha256,reserveSpec.patchSha256);assert.equal(n.sourceTreeSha256,auth.sourceTreeSha256);
 assert(n.results.length===2&&n.results.every(r=>r.passed&&r.normalChecks===10&&r.boundaryCases===5&&r.originalHeaderConsumerPassed));assert(!n.results[0].undersizedRejected&&n.results[1].undersizedRejected);
 const priorRoot=p+'/coturn-bson-final-20261012',prior=read(priorRoot+'/native.json');
 assert.equal(sha(fs.readFileSync(priorRoot+'/native.json')),reserveSpec.priorNativeSha256);
 assert.equal(prior.status,'passed');assert.equal(prior.patchSha256,reserveSpec.priorPatchSha256);assert.equal(prior.tests.ocsp.length,1);
 assert.equal(prior.libraries.find(l=>l.path.includes('libmongoc')).sha256,reserveSpec.unchangedMongocSha256);
 assert(offer.published);assert.equal(sha(fs.readFileSync(offer.archive)),offer.sha256);
 for(const [file,hash]of Object.entries(release.proofs))assert.equal(sha(fs.readFileSync(root+'/'+file+'.json')),hash);
 assert(Date.parse(release.completedAt)<=Date.parse(scan.date));
 const chain=additionalOverlayReceipts.filter(f=>fs.existsSync(p+'/'+f)).flatMap(f=>overlayRows(read(p+'/'+f))),images=targets.map(name=>expatDescendant(name,stage.image,release.completedAt,scan.completedAt,chain));assert.equal(new Set(images).size,1);const artifact=images[0];assert.equal(scan.images.find(i=>i.id===artifact)?.status,'checked');
 const actual=[];
 for(const name of targets){
  const r=release.rows.find(r=>r.name===name);assert(r&&r.status==='passed'&&r.newImage===stage.image&&r.oldImage===reserveSpec.rows[0].base);
  assert.equal(inspect(name).Image,artifact);
  for(const pkg of names)assert.equal(docker('exec',name,'dpkg-query','-W','-f=${Version}',pkg),version);
  for(const [file,expected]of [[reserveSpec.library,n.librarySha256],['/usr/lib/x86_64-linux-gnu/libmongoc-1.0.so.0.0.0',reserveSpec.unchangedMongocSha256]]){
   const hash=docker('exec',name,'sha256sum',file).split(/\s/)[0];assert.equal(hash,expected);actual.push({name,file,sha256:hash});
  }
 }
 const decisions=queue.items.filter(i=>reserveEligible(i)&&i.artifact===artifact).map(i=>validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:i.id==='CVE-2026-106437'?`Exact upstream BSON minimum-reservation fix ${reserveSpec.sourceRevision}, patch SHA-256 ${reserveSpec.patchSha256}. Five invalid sizes accepted by old library and rejected by fixed bytes; ten legitimate BSON operations and original-header MongoDB consumer pass. All 272 exports, SONAME and native dependencies retained. Whole image comparison changes only libbson, preserving prior libmongoc OCSP correction, native relay, authentication, limits and all configuration. Disposable UDP/TCP/TLS allocations, wrong/anonymous credentials, private-peer denial, quota and bidirectional bytes pass; two idle-checked releases and current running-library hashes verified. Package metadata remains unchanged and raw findings retained. Exact artifact, two package labels and two roles only. Evidence: security-20261028/bson/. https://github.com/mongodb/mongo-c-driver/commit/${reserveSpec.sourceRevision}`:`Previous exact OCSP repair ${reserveSpec.priorPatchSha256} retained byte-for-byte in libmongoc ${reserveSpec.unchangedMongocSha256}. Complete image comparison permits only the separately verified BSON reservation library; previous authenticated source/native OCSP tests and receipt identity are pinned. New native MongoDB consumer and complete isolated relay fixture passed; successful idle-checked release and exact live libmongoc/libbson hashes verified in both declared relay roles. No exception for other packages/images/CVEs. Evidence: security-20261028/bson/ and coturn-bson-final-20261012/native.json.`}));
 assert(decisions.length<=4);assert.equal(read(p+'/security.json').completedAt,scan.completedAt);
 fs.writeFileSync(root+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,image:stage.image,actual},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
}else{
const release=read(root+'/release.json'),native=read(root+'/native.json'),stage=read(root+'/stage.json'),app=read(root+'/application.json'),offer=read(root+'/source-offer.json');
for(const r of[release,native,stage,app])assert.equal(r.status,'passed');assert.equal(release.rows.length,2);assert(offer.published);assert.equal(sha(fs.readFileSync(offer.archive)),offer.sha256);
for(const[file,h]of Object.entries(release.proofs))assert.equal(sha(fs.readFileSync(root+'/'+file+'.json')),h);
assert.equal(app.stageSha256,sha(fs.readFileSync(root+'/stage.json')));assert(stage.configurationUnchanged&&stage.unrelatedPackagesUnchanged&&stage.priorRuntimeBytesUnchanged);assert.equal(native.patchSha256,'8db858ba069173e7de8e9b78fed1fb9334a895107f0b2b27d6ba3f8b185360f6');assert.equal(native.vendorPatchesPreserved.length,10);assert(native.oldHeadersAndNativeConsumerPassed);assert.equal(native.tests.ocsp.length,1);
assert(Date.parse(release.completedAt)<=Date.parse(scan.date));assert.equal(scan.images.find(i=>i.id===stage.image)?.status,'checked');
const actual={};for(const name of targets){const r=release.rows.find(r=>r.name===name);assert.equal(r.status,'passed');assert.equal(r.newImage,stage.image);assert.equal(inspect(name).Image,stage.image);for(const packageName of names)assert.equal(docker('exec',name,'dpkg-query','-W','-f=${Version}',packageName),version);actual[name]=[];for(const lib of native.libraries){const h=docker('exec',name,'sha256sum',lib.path).split(/\s/)[0];assert.equal(h,lib.sha256);actual[name].push({path:lib.path,sha256:h});}}
for(const[file,h]of Object.entries(native.packages)){assert.equal(sha(fs.readFileSync(root+'/output/'+file)),h);const temp=fs.mkdtempSync('/dev/shm/utilibre-bson-payload-');try{run('dpkg-deb',['-x',root+'/output/'+file,temp]);for(const lib of native.libraries.filter(l=>fs.existsSync(temp+l.path)))assert.equal(sha(fs.readFileSync(temp+lib.path)),lib.sha256);}finally{fs.rmSync(temp,{recursive:true});}}
const decisions=queue.items.filter(i=>eligible(i)&&i.artifact===stage.image).map(i=>validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Exact native 1.30.4 Debian source retains all ten vendor patches and applies unchanged upstream stable-branch 7e4c66515a46abaf2f488ed0fe5a5c21887b6e1d OCSP ownership fix. Both matched-source runtime packages rebuilt; vulnerable code is in libmongoc, not a claimed BSON decoder fix. Existing exports/SONAME/dependencies and all unrelated image bytes preserved; original-header native consumer, upstream OCSP regression, 368 offline cases and isolated authenticated UDP/TCP/TLS relay, exact-byte transfer and quota/denial gates passed. Two unchanged Debian BSON test expectation failures reproduced on baseline and documented, not waived as passes. Source, complete package/library identity, serial release and fresh live-image scan bound. Only this CVE/package/roles covered. Evidence: coturn-bson-final-20261012/native.json, application.json, release.json. https://github.com/mongodb/mongo-c-driver/commit/7e4c66515a46abaf2f488ed0fe5a5c21887b6e1d'}));
assert.equal(read(p+'/security.json').completedAt,scan.completedAt);for(const n of targets)assert.equal(inspect(n).Image,stage.image);
fs.writeFileSync(root+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,image:stage.image,sourceSha256:offer.sha256,actual},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));

}
