// Fresh-scan exact-artifact proposals only; no raw scan/ledger mutation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,read,sha,docker,inspect,target,packageName,packageSha256} from './common.mjs';
import {eligible,version,fixed,absent} from './review-policy.mjs';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const parent='/var/lib/utilibre-maintenance',queue=read(parent+'/security-queue.json'),scan=read(parent+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const r=read(root+'/release.json'),n=read(root+'/native.json'),a=read(root+'/application.json'),b=read(root+'/stage.json'),scope=read(root+'/source-scope.json');
for(const p of [r,n,a,b,scope])assert.equal(p.status,'passed');assert.equal(r.groups.length,1);
for(const [file,hash]of Object.entries(r.proofs))assert.equal(sha(fs.readFileSync(root+'/'+file+'.json')),hash,'Immutable release proof changed');
assert.equal(sha(fs.readFileSync(root+'/output/'+packageName)),packageSha256);assert.equal(n.upstream.assertions,14);assert(n.upstream.allPassed&&n.exactExportsPreserved&&n.hevcAv1RgbaOldHeaderRoundtrips&&a.gdalHeicRead&&a.readOnlyRoleAndDeniedDelete&&a.syntheticDumpRestoreSha256);
assert(b.priorRuntimeBytesUnchanged&&b.unrelatedPackagesUnchanged&&b.configurationUnchanged);
assert.equal(scope.nativeSha256,sha(fs.readFileSync(root+'/native.json')));assert.equal(scope.librarySha256,n.librarySha256);assert.deepEqual(Object.keys(scope.reasons).sort(),[...absent].sort());
for(const f of scope.sourceFiles)assert.equal(sha(fs.readFileSync((fs.existsSync('/var/lib/utilibre-maintenance/sudo-followup-20261012/bookworm/work/heif-followup/source/libheif')?'/var/lib/utilibre-maintenance/sudo-followup-20261012/bookworm/work/heif-followup/source':'/var/lib/utilibre-maintenance/security-20261028/review-sources/heif/source')+'/libheif/'+f.path)),f.sha256);
const source=read(root+'/source-offer.json');assert(source.published);assert.equal(sha(fs.readFileSync(source.archive)),source.sha256);for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert.equal(sha(fs.readFileSync(dir+'/'+source.filename)),source.sha256);
let image=b.image;assert(Date.parse(r.completedAt)<=Date.parse(scan.date));
const chain=additionalOverlayReceipts.filter(p=>fs.existsSync(parent+'/'+p)).flatMap(p=>overlayRows(read(parent+'/'+p))).filter(row=>row.name===target).sort((x,y)=>Date.parse(x.completedAt)-Date.parse(y.completedAt));
for(const row of chain)if(row.oldImage===image&&row.newImage!==row.oldImage){assert(Date.parse(row.completedAt)<=Date.parse(scan.date));image=row.newImage;}
assert.equal(inspect(target).Image,image);assert.equal(docker('exec',target,'dpkg-query','-W','-f=${Version}','libheif1'),version);assert.equal(docker('exec',target,'sha256sum',n.libraryPath).split(/\s/)[0],n.librarySha256);
const decisions=[];
for(const item of queue.items.filter(i=>eligible(i)&&i.artifact===image)){
 const repaired=fixed.includes(item.id),basis=repaired?`Native Debian 1.15.1 baseline with all three prior vendor fixes plus the exact upstream ${item.id==='CVE-2025-68431'?'b8c12a7 overlay-width':'22b6266 alpha-stride'} repair, changing only the source filename in the patch. Complete source and modified Debian quilt package published. All 211 exports and ten dependencies retained. Upstream enabled tests, ordinary alpha compositing, original-header HEVC/AV1 RGBA and GDAL HEIC/DB isolation/restore passed. GDAL AVIF zero-byte reader limitation is separately documented, not waived. https://security-tracker.debian.org/tracker/${item.id}`:scope.reasons[item.id];
 decisions.push(validateDecision({key:item.key,status:repaired?'mitigated':'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:basis+' Exact installed library/package bytes, signed baseline, fresh scan and completed image ancestry verified. Only this advisory/package/role/image is covered; raw scanner findings retained. Evidence: heif-bookworm-followup-20261012/native.json and source-scope.json.'}));
}
assert.equal(read(parent+'/security.json').completedAt,scan.completedAt);
fs.writeFileSync(root+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,image,sourceSha256:source.sha256},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
