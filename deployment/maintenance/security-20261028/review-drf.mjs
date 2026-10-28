// Exact source backports, not a waiver for every installed DRF version.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261028/drf';
const read=f=>JSON.parse(fs.readFileSync(f)),sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=read(new URL('./drf-inputs.json',import.meta.url));
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');
freshScan(queue,scan);assert.equal(scan.status,'checked');
const release=read(dir+'/release.json');assert.equal(release.status,'passed');
for(const p of inputs.patches)assert.equal(sha(fs.readFileSync(new URL('./'+p.file,import.meta.url))),p.sha256);
const decisions=[],rows=overlayRows(release);
// Follow completed same-role artifact transitions; live repaired bytes are still
// checked below. An unrelated role or an incomplete receipt cannot inherit proof.
for(const receipt of additionalOverlayReceipts){
 const p=root+'/'+receipt;if(!fs.existsSync(p)||p===dir+'/release.json')continue;
 for(const r of overlayRows(read(p)))if(rows.some(a=>a.name===r.name&&a.newImage===r.oldImage)&&Date.parse(r.completedAt)<=Date.parse(scan.completedAt))rows.push(r);
}
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}).trim();
for(const s of inputs.rows){
 const b=read(dir+'/'+s.key+'/build.json'),v=read(dir+'/'+s.key+'/inventory.json'),g=read(dir+'/'+s.key+'/scan-gate.json'),a=read(dir+'/'+s.key+'/stage.json');
 assert(b.passed&&v.passed&&g.passed&&b.configurationUnchanged&&b.unrelatedDependencyFilesUnchanged&&b.existingCertifiFixPreserved);
 assert.equal(b.base,s.base);assert.equal(v.imageId,b.imageId);assert.equal(g.imageId,b.imageId);assert(g.primarySourceFixVerified&&g.newHighCritical===0);
 assert(b.baseline.passed&&!b.baseline.codecRejected&&!b.baseline.acceptBounded&&!b.baseline.tokenRevoked);
 assert(b.native.passed&&b.native.codecRejected&&b.native.acceptBounded&&b.native.tokenRevoked&&b.native.acceptParseCount===1&&b.native.normalChecks===18&&b.native.precedenceApiPreserved&&b.native.listSerializerApiPreserved);
 assert(a.status==='passed'&&a.newImage===b.imageId&&a.oldImage===s.base&&a.freshSyntheticDatabase);
 if(s.key==='linkding'){const extra=read(dir+'/linkding/stage-followup.json');assert(extra.status==='passed'&&extra.newImage===b.imageId&&extra.freshSyntheticDatabase&&extra.checks.accountIsolation);}
 assert.deepEqual(v.changedPaths,s.files.map(f=>s.site+'/'+f.path).sort());assert.deepEqual(v.changedPaths,b.changedFiles);
 const liveImages=new Set;
 for(const name of s.containers){
  const r=rows.find(r=>r.name===name);assert(r&&r.oldImage===s.base&&r.newImage===b.imageId&&Date.parse(r.completedAt)<=Date.parse(scan.completedAt));
  const live=docker('inspect','--format','{{.Image}}',name);assert(rows.some(row=>row.name===name&&row.newImage===live),'Unverified artifact transition');liveImages.add(live);
  const hashes=docker('exec',name,'sha256sum',...s.files.map(f=>s.site+'/'+f.path)).split('\n').map(line=>line.split(/\s+/));
  for(const f of s.files)assert(hashes.some(([hash,path])=>path===s.site+'/'+f.path&&hash===f.afterSha256));
 }
 assert.equal(liveImages.size,1);const currentImage=[...liveImages][0];
 for(const item of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='python-pkg'&&inputs.advisories.includes(i.id)&&i.package==='djangorestframework'&&i.installed===s.previous&&i.artifact===currentImage)){
  assert.deepEqual([...item.containers].sort(),[...s.containers].sort());
  decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact upstream DRF charset, negotiation and TokenProxy fixes plus upstream precedence API correction, backported to ${s.previous}. Four patch hashes, five live-file hashes in every declared role, full-image scope, unchanged configuration/dependencies, and completed release verified. All three vulnerable baselines reproduced safely; repaired copies pass rejection checks and 18 legitimate/compatibility checks. Fresh isolated application databases also pass ${s.key==='authentik'?'native password/TOTP and RSA/ECDSA OAuth/JWKS/code-replay checks':'bookmark create/export/import, account isolation and anonymous denial'}. No real credentials, user data or external provider. Preserved metadata means raw scan findings remain. Applies only to the exact recorded image and advisory. Evidence: security-20261028/drf/${s.key}/; upstream commits: ${inputs.patches.map(p=>p.upstreamCommit).join(', ')}.`}));
 }
}
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,applied:false}));
