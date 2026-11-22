// Fresh, finite review of the existing historical-build activation safeguard.
// No historical lock is fixed or hidden; no deployment or provider request.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateState,verifyReview} from '../security-20261109/superseded-go-condition.mjs';
import {validateBatch} from '../triage.mjs';
process.umask(0o077);
assert.deepEqual(process.argv.slice(2),['--prepare']);
const root='/var/lib/utilibre-maintenance/',out=root+'security-20261122/retired-go/';
const repo=new URL('../../../',import.meta.url).pathname;
const reportPath=root+'security-20261109/remaining-high/superseded-go-review.json';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const previousHash='73c2052a2c8f67cf4fc8c0f98b3be13cfa5ec226880ddbf338668942b171162f';
assert.equal(sha(reportPath),previousHash,'Only the previously reviewed fourteen-application state is supported');
assert(!fs.existsSync(out),'Preserve completed review evidence');
const previous=read(reportPath),report=structuredClone(previous);
const queue=read(root+'security-queue.json'),scan=read(root+'security.json');
assert.equal(scan.status,'checked');assert.equal(scan.completedAt,queue.scanDate);
assert(Date.now()-Date.parse(scan.completedAt)<86400000);
const tests={};
for(const [file,count] of [['retired-release-tests.tap',50],['condition-policy-tests.tap',83]]){
 const path=root+'security-20261122/'+file,text=fs.readFileSync(path,'utf8');
 assert(text.includes(`\n# tests ${count}\n# suites 0\n# pass ${count}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n`));
 assert(Date.now()-fs.statSync(path).mtimeMs<3600000);tests[file]={count,sha256:sha(path)};
}
for(const [path,digest] of Object.entries(previous.guards))assert.equal(sha(repo+path),digest,'Existing guard changed: '+path);
const releasePath=root+'security-20261122/alpine-crypto/release.json',release=read(releasePath);
assert.equal(release.status,'passed');assert(release.completedAt<scan.completedAt);
for(const r of release.sourceReceipts)assert.equal(sha(r.path),r.sha256);
const moved=new Set();
for(const replacement of report.replacements){
 const edges=release.groups.flatMap(g=>g.rows).filter(r=>replacement.containers.includes(r.name)&&r.oldImage===replacement.imageId&&r.newImage!==r.oldImage);
 if(edges.length){
  assert(['galene','ntfy','opengist'].includes(replacement.application));
  assert.deepEqual(edges.map(r=>r.name).sort(),[...replacement.containers].sort());
  assert.equal(new Set(edges.map(r=>r.newImage)).size,1);
  replacement.imageId=edges[0].newImage;moved.add(replacement.application);
 }
 const image=scan.images.find(i=>i.id===replacement.imageId);assert.equal(image?.status,'checked');
 const modules=image.goModules.filter(m=>'/'+m.target.replace(/^\//,'')===replacement.binary);
 assert.equal(modules.length,1);
 assert.equal(modules[0].packages.find(p=>p.name==='golang.org/x/net')?.version,'v0.62.0');
 assert(!image.findings.some(f=>f.id==='CVE-2026-78661'&&f.package==='golang.org/x/net'));
}
assert.deepEqual([...moved].sort(),['galene','ntfy','opengist']);
const names=report.replacements.flatMap(r=>r.containers);
const inspect=()=>cp.execFileSync('docker',['inspect','--format','{"name":{{json .Name}},"image":{{json .Image}},"pid":{{.State.Pid}},"running":{{.State.Running}}}',...names],{encoding:'utf8',timeout:15000,maxBuffer:65536,stdio:['ignore','pipe','pipe']}).trim();
const before=inspect(),states=new Map(before.split('\n').map(l=>{const s=JSON.parse(l);return[s.name.slice(1),s];}));
report.guards['deployment/maintenance/security-20261122/review-retired-go.mjs']=sha(new URL(import.meta.url));
validateState(report,{hashFile:p=>sha(repo+p),runtime:(name,binary)=>{
 const s=states.get(name);assert(s?.running&&s.pid>0);
 return {image:s.image,binarySha256:sha('/proc/'+s.pid+'/root'+binary)};
}});
assert.equal(inspect(),before);
const rules=read(new URL('../security-20261109/superseded-go.json',import.meta.url));
const matched=queue.items.filter(i=>i.id===rules.advisory&&i.package==='golang.org/x/net'&&i.scope==='tracked-build-input'&&i.installed==='v0.60.0');
assert.equal(matched.length,22);
const expiresAt=new Date(Date.now()+7*86400000).toISOString();
report.decisions=rules.rows.map(r=>{
 assert.equal(sha(repo+r.historicalLock),r.historicalSha256);assert.equal(sha(repo+r.currentLock),r.currentSha256);
 const item=matched.find(i=>i.targetName===r.historicalLock);assert.equal(item?.artifact,r.historicalLock+'@sha256:'+r.historicalSha256);
 return {key:item.key,status:'mitigated',expiresAt,reason:'Fresh review of the existing historical-build mitigation. This archived x/net 0.60.0 lock remains vulnerable and visible in raw scans; old activation routes are blocked, not approved for reuse. All 14 current runtime binaries match their reviewed repaired bytes and expose x/net 0.62.0 in the complete current scan. Three exact crypto-only releases changed images without changing Go executables. All original guard/lock/recipe hashes match; 50 release/guard and 83 policy tests pass again. Seven-day conditional review rechecks all images, binaries and guards during queue construction. Evidence: security-20261122/retired-go/evidence.json. This is a rebuild-path mitigation, not a new patch or clearance of other advisories.'};
});
Object.assign(report,{date:new Date().toISOString(),scanDate:scan.completedAt,predecessorReviewSha256:previousHash,
 freshReview:true,tests,releaseSha256:sha(releasePath),applied:false,productionChanged:false});
fs.mkdirSync(out,{recursive:false,mode:0o700});fs.copyFileSync(reportPath,out+'previous-review.json');
fs.writeFileSync(out+'evidence.json',JSON.stringify(report,null,2)+'\n');
const condition={kind:'superseded-go-v1',sha256:sha(out+'evidence.json')};
const batch={schemaVersion:1,scanDate:scan.completedAt,decisions:report.decisions.map(d=>({...d,condition}))};
validateBatch(batch,queue);
fs.copyFileSync(out+'evidence.json',reportPath);
try{assert.equal(verifyReview(condition.sha256).size,22);}catch(e){fs.copyFileSync(out+'previous-review.json',reportPath);throw e;}
fs.writeFileSync(out+'decisions.json',JSON.stringify(batch,null,2)+'\n');
console.log('Prepared 22 fresh conditional reviews; all 14 runtime binaries and original guards match. Recording is separate.');
