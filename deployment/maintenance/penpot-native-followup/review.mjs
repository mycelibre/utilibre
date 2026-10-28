// Exact live libraries and completed source/native/application chain, never a
// version-only waiver or a claim about every SVG/TIFF vulnerability.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {directory,inputs,liveNative} from './release-inputs.mjs';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
import {eligible} from './review-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',read=p=>JSON.parse(fs.readFileSync(p));
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const release=read(directory+'/penpot-release.json');assert.equal(release.status,'passed');assert(Date.parse(release.completedAt)<=Date.parse(scan.date));assert.deepEqual(release.evidence,inputs({approvalAt:release.completedAt}).evidence);
const svg=read(directory+'/native.json'),tiff=read(directory+'/tiff/native.json');
for(const s of svg.records){assert(s.allOldSymbolsRetained&&s.nativeDependenciesUnchanged&&s.cases.length===2);assert(s.cases.every(c=>c.oldDuplicateAllocations===2&&c.newDuplicateAllocations===1&&c.pngBytesEqual));}
for(const t of tiff.records)assert(t.cases.length===2&&t.cases.every(c=>c.eightCodecOldHeaderRoundtrips&&c.newCompressionRatioGuardApi&&c.rsvgSecurityRegressionStillPassed));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(sha(directory+'/sources/librsvg-2.60.3.tar.xz'),'ca7d206d37426147e92299a0e59acb5b5f1d8bd7da20ff23d7642885a89feab4');
assert.equal(sha(directory+'/tiff/sources/tiff_4.7.2.orig.tar.bz2'),'c5086d8f7c5ba51ca98241f24a8bd1cb66218c399077aeccbf6a236cf3152acc');
assert.match(fs.readFileSync(directory+'/tiff/output/upstream-tests.log','utf8'),/# PASS:\s+109/);
assert.match(fs.readFileSync(directory+'/tiff/output/upstream-tests.log','utf8'),/# FAIL:\s+0/);
const rows=overlayRows(release);for(const receipt of additionalOverlayReceipts){const file=root+'/'+receipt;if(!fs.existsSync(file)||file===directory+'/penpot-release.json')continue;for(const r of overlayRows(read(file))){if(rows.some(p=>p.name===r.name&&p.newImage===r.oldImage))rows.push(r);}}
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const decisions=[],checked=new Set;
for(const item of queue.items.filter(eligible)){
 const name=item.containers[0],row=rows.find(r=>r.name===name&&r.newImage===item.artifact);assert(row);assert(Date.parse(row.completedAt)<=Date.parse(scan.date));
 if(!checked.has(name)){assert.equal(docker('inspect',name,'--format','{{.Image}}'),item.artifact);liveNative(docker,name);checked.add(name);}
 assert.equal(docker('exec',name,'dpkg-query','-W','-f=${Version}',item.package),item.installed);
 const svgFinding=item.package.startsWith('librsvg');
 const reason=svgFinding?'Upstream librsvg 2.60.3 includes stable-branch fix1606574427408baca8203ef723281509a229f9e2. Authenticated release archive, full live library SHA256, preserved ABI and two loader-path native duplicate-entity regression controls verified.':'Native TIFF4.7.2 built from authenticated Debian source includes upstream fixeedba405 for SamplesPerPixel and b04e935c for tiffcrop. Actual system/private ImageMagick library SHA256 verified;109 upstream tests, eight-codec old-header round trips and preserved ABI passed. No other TIFF record is waived.';
 decisions.push(validateDecision({key:item.key,status:'mitigated',reason:reason+' Full two-account Penpot import/export/edit/permissions/media/deletion and production release passed. Exact package/image/CVE only; raw scanner inventory retained. https://security-tracker.debian.org/tracker/'+item.id+' . Evidence: deployment/maintenance/penpot-native-followup/README.md and private review.json.',expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
}
fs.writeFileSync(directory+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,applied:false}));
