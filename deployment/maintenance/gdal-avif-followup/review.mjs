// Exact successor attribution: retain three proven earlier repairs after the
// one-line AVIF fix. No blanket source waiver, raw scan or ledger mutation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,geo,read,sha,run,docker,inspect,target,packageName,packageSha256,patchSha256,commit} from './common.mjs';
import {eligible,version} from './review-policy.mjs';
import {excludedDocumentation} from '../geospatial-followup/review-policy.mjs';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const parent='/var/lib/utilibre-maintenance',queue=read(parent+'/security-queue.json'),scan=read(parent+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const r=read(root+'/release.json'),s=read(root+'/source.json'),a=read(root+'/application.json'),b=read(root+'/stage.json'),old=read(geo+'/gdal-candidate.json'),oldChecks=read(geo+'/gdal-checks.json');
for(const p of [r,s,a,b,oldChecks])assert.equal(p.status,'passed');assert.equal(r.groups.length,1);
for(const [file,hash]of Object.entries(r.proofs))assert.equal(sha(fs.readFileSync(root+'/'+file+'.json')),hash,'Immutable release proof changed');
assert.equal(sha(fs.readFileSync(root+'/output/'+packageName)),packageSha256);assert.equal(sha(fs.readFileSync(root+'/'+commit+'.patch')),patchSha256);
assert.equal(s.priorCandidateSha256,sha(fs.readFileSync(geo+'/gdal-candidate.json')));for(const [file,hash]of Object.entries(s.priorReceipts))assert.equal(sha(fs.readFileSync(geo+'/gdal-source/'+file)),hash);
assert.equal(oldChecks.image,old.image);assert.equal(b.library.oldSha256,oldChecks.library.sha256);assert(oldChecks.library.nativeAbiUnchanged);assert.equal(s.version,version);
assert(s.completeAppliedSourceComparison&&s.originalHeadersUnchanged);assert.deepEqual(s.changed,['debian/changelog','debian/patches/series','debian/patches/utilibre-avif-zero-read.patch','frmts/heif/heifdataset.cpp']);assert.equal(s.priorSecurityFiles.length,6);
for(const f of s.priorSecurityFiles){assert.equal(sha(fs.readFileSync(root+'/source-old/'+f.path)),f.sha256);assert.equal(sha(fs.readFileSync(root+'/source-new/'+f.path)),f.sha256);}
for(const [file,hash]of Object.entries(s.sourcePins))assert.equal(sha(fs.readFileSync(root+'/output/'+file)),hash);
assert.equal(s.buildLogSha256,sha(fs.readFileSync(root+'/build.log')));assert.match(fs.readFileSync(root+'/build.log','utf8'),/100% tests passed, 0 tests failed out of 5/);
assert(b.library.nativeAbiUnchanged&&b.library.exports===5935&&b.priorRuntimeBytesUnchanged&&b.unrelatedPackagesUnchanged&&b.configurationUnchanged);
assert(a.gdalHeicAndAvifRead&&a.readOnlyRoleAndDeniedDelete&&a.syntheticDumpRestoreSha256&&a.nativeRasterExportImport&&a.documentdbTypedData&&a.geometryProjection&&a.upstreamFlatGeobuf);assert.equal(a.drivers,210);assert.equal(a.cases.length,4);assert(a.cases.every(c=>c.status===0));assert.equal(a.stageSha256,sha(fs.readFileSync(root+'/stage.json')));
const offer=read(root+'/source-offer.json');assert(offer.published);assert.equal(sha(fs.readFileSync(offer.archive)),offer.sha256);for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert.equal(sha(fs.readFileSync(dir+'/'+offer.filename)),offer.sha256);
let image=b.image;assert(Date.parse(r.completedAt)<=Date.parse(scan.date));
const chain=additionalOverlayReceipts.filter(p=>fs.existsSync(parent+'/'+p)).flatMap(p=>overlayRows(read(parent+'/'+p))).filter(row=>row.name===target).sort((x,y)=>Date.parse(x.completedAt)-Date.parse(y.completedAt));
for(const row of chain)if(row.oldImage===image&&row.newImage!==row.oldImage){assert(Date.parse(row.completedAt)<=Date.parse(scan.date));image=row.newImage;}
assert.equal(inspect(target).Image,image);assert.equal(scan.images.find(i=>i.id===image)?.status,'checked');assert.equal(docker('exec',target,'dpkg-query','-W','-f=${Version}','libgdal32'),version);
const temp=fs.mkdtempSync('/dev/shm/utilibre-gdal-avif-review-');let payload;
try{
 run('dpkg-deb',['-x',root+'/output/'+packageName,temp]);
 const cfgPath='/etc/dpkg/dpkg.cfg.d/docker',cfg=docker('exec',target,'cat',cfgPath);assert.equal(cfg,docker('run','--rm','--network','none','--read-only','--memory','128m','--pids-limit','16','--log-driver','none','--entrypoint','cat',b.image,cfgPath));
 const walk=(dir,p='')=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name,p+'/'+e.name):e.isFile()?[p+'/'+e.name]:[]),all=walk(temp).map(path=>({path,sha256:sha(fs.readFileSync(temp+path))}));
 for(const f of all.filter(f=>excludedDocumentation(f.path,'libgdal32',cfg)))docker('exec',target,'test','!','-e',f.path);
 payload=all.filter(f=>!excludedDocumentation(f.path,'libgdal32',cfg));assert(payload.length>1);
 const actual=docker('exec',target,'sha256sum',...payload.map(f=>f.path)).split('\n');assert.equal(actual.length,payload.length);actual.forEach((line,i)=>assert.equal(line,payload[i].sha256+'  '+payload[i].path));
}finally{fs.rmSync(temp,{recursive:true});}
assert.equal(docker('exec',target,'sha256sum',b.library.path).split(/\s/)[0],b.library.sha256);
const decisions=[];for(const item of queue.items.filter(i=>eligible(i)&&i.artifact===image))decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Native GDAL +utilibre2 retains the complete prior netCDF c49254dc and HDF4 9491e794/184f77db repairs plus EHmetagroup prerequisites; whole applied source and original headers match +utilibre1 except exact upstream AVIF read callback 154b1cbb and packaging metadata. Existing context/C++11 adaptations unchanged. All 5935 exports/48 dependencies/210 drivers, original regression fixtures, HEIC/AVIF pixels, raster/roles/DocumentDB and restore passed. Grid baseline did not crash: source plus compatibility evidence, not an independent reproduction. Signed baseline, published complete source, tested binary package, exact installed payload, completed ancestry and fresh scan verified. Only this CVE/package/role/image covered; raw/unrelated findings retained. Evidence: gdal-avif-followup-20261012/source.json, stage.json, application.json. https://security-tracker.debian.org/tracker/'+item.id}));
assert.equal(inspect(target).Image,image);assert.equal(read(parent+'/security.json').completedAt,scan.completedAt);
fs.writeFileSync(root+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,image,sourceSha256:offer.sha256,payloadSha256:sha(JSON.stringify(payload))},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
