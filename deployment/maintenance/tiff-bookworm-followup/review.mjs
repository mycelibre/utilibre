// Exact-key proposals only; leaves the raw scan and operator ledger untouched.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,read,sha,docker,inspect,target,packageName,packageSha256} from './common.mjs';
import {eligible,version,expectedStatus} from './review-policy.mjs';
import {verifyTiffcropScope} from './tiffcrop-scope.mjs';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const parent='/var/lib/utilibre-maintenance',queue=read(parent+'/security-queue.json'),scan=read(parent+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const r=read(root+'/release.json'),n=read(root+'/native.json'),a=read(root+'/application.json'),b=read(root+'/stage.json'),correction=read(root+'/documentation-correction.json');assert.equal(r.status,'passed');assert.equal(r.groups.length,1);assert.equal(n.status,'passed');assert.equal(a.status,'passed');assert.equal(b.status,'passed');
for(const [file,hash]of Object.entries(r.proofs))assert.equal(sha(fs.readFileSync(root+'/'+file+'.json')),hash,'Immutable release proof changed');
assert.equal(sha(fs.readFileSync(root+'/output/'+packageName)),packageSha256);assert.equal(n.upstream.PASS,109);assert.equal(n.upstream.FAIL,0);assert.equal(n.upstream.ERROR,0);assert(n.oldExportsPreserved&&a.nativeRasterExportImport&&a.readOnlyRoleAndDeniedDelete&&a.syntheticDumpRestoreSha256);assert(b.priorRuntimeBytesUnchanged&&b.unrelatedPackagesUnchanged&&b.configurationUnchanged);
assert.equal(correction.correctAdvisory,'CVE-2023-52355');assert.equal(correction.originalReleaseSha256,sha(fs.readFileSync(root+'/release.json')));
const source=read(root+'/source-offer-v2.json');assert(source.published);assert.equal(source.sha256,correction.correctedSourceSha256);assert.equal(sha(fs.readFileSync(source.archive)),source.sha256);
for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert.equal(sha(fs.readFileSync(dir+'/'+source.filename)),source.sha256);
let image=b.image;assert(Date.parse(r.completedAt)<=Date.parse(scan.date));
const chain=additionalOverlayReceipts.filter(p=>fs.existsSync(parent+'/'+p)).flatMap(p=>overlayRows(read(parent+'/'+p))).filter(row=>row.name===target).sort((x,y)=>Date.parse(x.completedAt)-Date.parse(y.completedAt));
for(const row of chain)if(row.oldImage===image&&row.newImage!==row.oldImage){assert(Date.parse(row.completedAt)<=Date.parse(scan.date));image=row.newImage;}
assert.equal(inspect(target).Image,image);assert.equal(docker('exec',target,'dpkg-query','-W','-f=${Version}','libtiff6'),version);assert.equal(docker('exec',target,'sha256sum',n.libraryPath).split(/\s/)[0],n.librarySha256);
const decisions=[];
for(const item of queue.items.filter(i=>eligible(i)&&i.artifact===image)){
 if(item.id==='CVE-2026-52490')verifyTiffcropScope(image);
 const reason=item.id==='CVE-2026-52490'?'CVE-2026-52490 affects the tiffcrop command-line process_command_opts/writeImageSections subdivision path, not the libtiff library API. The exact installed libtiff6 package has no tiffcrop executable; package inventory, command lookup and all /usr /opt /bin /sbin file locations checked. Signed 4.7.2 source and published corresponding source additionally match and contain nonzero/division bounds plus checked 64-bit counts from upstream b04e935cb6242f22cc8b63c99a372cf3ea825e4e; Debian lists 4.7.2-1 fixed. Exact live library/package/image and completed ancestry verified. No new runtime repair or source-wide waiver claimed. Evidence: tiff-bookworm-followup-20261012/tiffcrop-52490-evidence.json. https://security-tracker.debian.org/tracker/CVE-2026-52490':item.id==='CVE-2023-52355'?'CVE-2023-52355 is resolved upstream/Debian by documentation, not a new runtime allocation code fix. This exact native 4.7.2 library is newer than Debian fixed 4.5.1+git230720-4. Its published corresponding source contains the TIFFOpenExt/TIFFOpenOptionsSetMaxSingleMemAlloc guidance and the warning that external _TIFFmalloc/_TIFFrealloc do not apply that limit (upstream 33594735 and 16ab4a20). Exact live library hash, completed release and native consumers rechecked. This does not prove malformed-input denial of service impossible. https://security-tracker.debian.org/tracker/CVE-2023-52355 . Additive documentation-correction.json corrects an earlier descriptive year typo without altering original evidence.':`Official TIFF 4.7.2 rebuilt natively as ${version} includes the full upstream ${item.id==='CVE-2026-12912'?'PixarLog ABGR fixes ba2b04b,51fa6dfe,f9bda11b,90601d9a':'codec compression-ratio bounds eedba405'}; not a foreign-distribution binary. Debian signed source, old vendor fixes, all 199 prior versioned exports and ten dependencies verified. All 109 upstream tests, eight old-header codec roundtrips, GDAL/PostGIS TIFF import/export and synthetic database restore/isolation passed. Exact live library bytes and completed release ancestry rechecked. https://security-tracker.debian.org/tracker/${item.id} . Only this exact package/role/image finding is covered.`;
 decisions.push(validateDecision({key:item.key,status:expectedStatus(item),expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:reason+' Raw scan findings retained; no ledger update by this proposal.'}));
}
assert.equal(read(parent+'/security.json').completedAt,scan.completedAt,'Concurrent scan changed');
fs.writeFileSync(root+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,image,sourceSha256:source.sha256},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
