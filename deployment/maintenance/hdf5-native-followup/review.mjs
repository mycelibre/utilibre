// Exact-key proposal, never a raw-scan rewrite or decision-ledger update.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,spec,sha,read,run,docker,inspect} from './common.mjs';
import {eligible} from './review-policy.mjs';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const parent='/var/lib/utilibre-maintenance',queue=read(parent+'/security-queue.json'),scan=read(parent+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const r=read(root+'/release.json'),n=read(root+'/native-build.json'),a=read(root+'/application.json'),b=read(root+'/stage.json'),offer=read(root+'/source-offer.json');
for(const p of [r,n,a,b])assert.equal(p.status,'passed');assert.equal(r.groups.length,1);
for(const[f,h]of Object.entries(r.proofs))assert.equal(sha(fs.readFileSync(root+'/'+f+'.json')),h);
for(const[name,hash]of Object.entries(spec.sourceFiles))assert.equal(sha(fs.readFileSync(root+'/source/'+name)),hash);
assert.equal(sha(fs.readFileSync(root+'/source/'+spec.commit+'.patch')),spec.upstreamPatchSha256);assert.equal(sha(fs.readFileSync(root+'/source/'+spec.commit+'-context-only.patch')),spec.adjustedPatchSha256);
const patch=run('tar',['-xOf',root+'/output/hdf5_'+spec.version+'.debian.tar.xz','debian/patches/utilibre-CVE-2018-11205.patch']);assert.equal(sha(patch+'\n'),spec.adjustedPatchSha256);
for(const pkg of spec.packages){const file=pkg+'_'+spec.version+'_amd64.deb';assert.equal(sha(fs.readFileSync(root+'/output/'+file)),n.files[file].sha256);}
assert(n.serialFullBuildAndTests&&b.oldHeaderNativeRoundtrips&&b.priorRuntimeBytesUnchanged&&a.syntheticDumpRestoreSha256&&a.readOnlyRoleAndDeniedDelete&&a.hdf5NativeRoundtrips);
assert.equal(n.buildLogSha256,sha(fs.readFileSync(root+'/build.log')));assert(offer.published);assert.equal(sha(fs.readFileSync(offer.archive)),offer.sha256);
for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert.equal(sha(fs.readFileSync(dir+'/'+offer.filename)),offer.sha256);
let image=b.image;assert(Date.parse(r.completedAt)<=Date.parse(scan.date));
const chain=additionalOverlayReceipts.filter(p=>fs.existsSync(parent+'/'+p)).flatMap(p=>overlayRows(read(parent+'/'+p))).filter(row=>row.name===spec.container).sort((x,y)=>Date.parse(x.completedAt)-Date.parse(y.completedAt));
for(const row of chain)if(row.oldImage===image&&row.newImage!==row.oldImage){assert(Date.parse(row.completedAt)<=Date.parse(scan.date));image=row.newImage;}
assert.equal(inspect(spec.container).Image,image);for(const pkg of spec.packages)assert.equal(docker('exec',spec.container,'dpkg-query','-W','-f=${Version}',pkg),spec.version);
for(const f of spec.libraries)assert.equal(docker('exec',spec.container,'sha256sum','/usr/lib/x86_64-linux-gnu/'+f).split(/\s/)[0],b.newAbi[f].sha256);
const decisions=queue.items.filter(i=>eligible(i)&&i.artifact===image).map(item=>validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Exact native HDF5 1.10.8+repack1-1+utilibre1 backports vendor-linked upstream 46cedc2eb03ad7cd6e8404f5e6b526588436f946. Only unchanged context was adapted; added/deleted code matches upstream byte-for-byte. Authenticated Debian source and all original vendor patches retained. The complete serial native build/tests, unchanged versioned exports/SONAME/dependencies, old-header HDF5 compressed chunk/HL/extend, netCDF and GDAL roundtrips, native Gathio permissions/dump/restore passed. Exact live image, two library hashes, package/source proofs and release ancestry rechecked. No exploit run or blanket HDF5 waiver. https://ubuntu.com/security/CVE-2018-11205 . Raw findings retained; seven-day review expires.'}));
fs.writeFileSync(root+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,image,sourceSha256:offer.sha256},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
