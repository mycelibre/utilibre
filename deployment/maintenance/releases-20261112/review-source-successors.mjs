// Revalidate an existing archived-source mitigation after two exact releases.
// Preserves the previous expiry, guard set and raw findings. No deployments,
// vulnerability reproductions, network calls or automatic review acceptance.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateState,verifyReview} from '../security-20261109/superseded-go-condition.mjs';
import {validateBatch} from '../triage.mjs';
process.umask(0o077);
assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/';
const repo=new URL('../../../',import.meta.url).pathname;
const reportPath=root+'security-20261109/remaining-high/superseded-go-review.json';
const output=root+'host-tools-20261112/source-successor-review/';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const previousHash='c4ceb630f4ec914f90696646fa99d2f3d02a84f4f82a0d47bdaf4d5e16621bb0';
assert.equal(sha(reportPath),previousHash,'Only the reviewed predecessor is supported');
const previous=read(reportPath),report=structuredClone(previous);
const queue=read(root+'security-queue.json'),scan=read(root+'security.json');
assert.equal(scan.status,'checked');assert.equal(scan.completedAt,queue.scanDate);
const policies=[
 {application:'opengist',before:'sha256:5d719639e41ddaefc3c5e1ffc5103b25dd7bb127b89ba78a64762960ac5d9532',image:'sha256:8733803eb5bf9ddc7044016ab92f9725107b615c13e05e4057f4ab1646af5414',binarySha256:'7287e37b20ed53b10bef8fea40efc364920367f0abc3b25e45b07900cbd9118a',receipt:'git-vendor-20261112/release.json'},
 {application:'vikunja',before:'sha256:359415f79ab1bb719439121fcfed4373a9f5293cf175d8ddcba5b07735b87c70',image:'sha256:12c860da57e1d354d3a75f01ec6b88acb35ea3a38b213a1b9ecab339d59aa243',binarySha256:'8feb99131ba64d44ab80a11aea6cbf60dd75518b77500ae59c55d585463c820c',receipt:'vikunja-upgrade-20261112/release.json'},
];
for(const p of policies){
 const old=report.replacements.find(r=>r.application===p.application);assert.equal(old.imageId,p.before);
 const release=read(root+p.receipt);assert.equal(release.status,'passed');
 assert(release.groups.some(g=>g.status==='passed'&&g.rows.some(r=>r.oldImage===p.before&&r.newImage===p.image)));
 const image=scan.images.find(i=>i.id===p.image);assert.equal(image?.status,'checked');
 const binary=image.goModules.find(m=>'/'+m.target===old.binary);assert(binary);
 assert.equal(binary.packages.find(m=>m.name==='golang.org/x/net')?.version,'v0.62.0');
 assert(!image.findings.some(f=>['CRITICAL','HIGH'].includes(f.severity)));
 if(p.application==='opengist')assert.equal(old.binarySha256,p.binarySha256,'Git-only overlay must preserve application executable');
 else {const live=read(root+'vikunja-upgrade-20261112/live-workflow.json');assert(live.passed&&live.publicOidcMfa&&live.nativeTaskAttachmentExportImport&&live.trashRestorePermanentDelete);assert.equal(live.version,'2.8.0');}
 Object.assign(old,{imageId:p.image,binarySha256:p.binarySha256,evidence:p.receipt});
}
// All old hashes remain mandatory, including the original release guards.
for(const [path,hash] of Object.entries(previous.guards))assert.equal(sha(repo+path),hash,path);
report.guards['deployment/maintenance/releases-20261112/review-source-successors.mjs']=sha(new URL(import.meta.url));
const names=report.replacements.flatMap(r=>r.containers);
const inspect=()=>cp.execFileSync('docker',['inspect','--format','{"name":{{json .Name}},"image":{{json .Image}},"pid":{{.State.Pid}},"running":{{.State.Running}}}',...names],{encoding:'utf8',timeout:15000,maxBuffer:65536}).trim();
const before=inspect(),states=new Map(before.split('\n').map(s=>{const r=JSON.parse(s);return[r.name.slice(1),r];}));
validateState(report,{hashFile:p=>sha(repo+p),runtime:(name,binary)=>{const s=states.get(name);assert(s?.running&&s.pid>0);return {image:s.image,binarySha256:sha('/proc/'+s.pid+'/root'+binary)};}});
assert.equal(inspect(),before);
const recorded=read(root+'security-decisions.json');
report.decisions=previous.decisions.map(d=>{const old=recorded.find(r=>r.key===d.key);assert.equal(old?.condition?.sha256,previousHash);assert(Date.parse(old.expiresAt)>Date.now());return {...d,expiresAt:old.expiresAt,reason:'Historical vulnerable Go lock retained, not fixed. Its old activation routes remain blocked. All 14 current runtime images/binaries and existing guard/lock hashes revalidated against the Nov 12 scan. Opengist Git-only overlay retains its exact application binary; approved Vikunja 2.8.0 contains x/net 0.62.0 and passed native migration, OIDC, CRUD, attachment/export/import and Trash checks. Evidence: host-tools-20261112/source-successor-review/evidence.json and security-20261109/remaining-high/superseded-go-review.json. Current runtime mitigation only; no approval of historical builds. Original expiry retained.'};});
Object.assign(report,{date:new Date().toISOString(),scanDate:queue.scanDate,predecessorReviewSha256:previousHash,successorReceipts:Object.fromEntries(policies.map(p=>[p.receipt,sha(root+p.receipt)]))});
fs.mkdirSync(output,{recursive:false,mode:0o700});
fs.copyFileSync(reportPath,output+'previous-review.json');
fs.writeFileSync(output+'evidence.json',JSON.stringify(report,null,2)+'\n');
const condition={kind:'superseded-go-v1',sha256:sha(output+'evidence.json')};
const batch={schemaVersion:1,scanDate:queue.scanDate,decisions:report.decisions.map(d=>({...d,condition}))};
validateBatch(batch,queue);
// Replacing the evidence invalidates old approvals until the operator records
// this exact new batch. A failed final check restores the earlier evidence.
fs.copyFileSync(output+'evidence.json',reportPath);
try{assert.equal(verifyReview(condition.sha256).size,22);}catch(error){fs.copyFileSync(output+'previous-review.json',reportPath);throw error;}
fs.writeFileSync(output+'decisions.json',JSON.stringify(batch,null,2)+'\n');
console.log('Prepared 22 revalidated historical-source decisions; original expiry retained. Recording remains a separate operator action.');
