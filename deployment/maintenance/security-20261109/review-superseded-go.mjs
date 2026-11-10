// Read-only evidence preparation. No scans, build, deployment, network probes,
// notifications, source edits or automatic acceptance of scanner findings.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {proveXnet} from './xnet-policy.mjs';
import {proveFollowup} from './xnet-followup-policy.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const repo=new URL('../../../',import.meta.url).pathname;
const privateRoot='/var/lib/utilibre-maintenance/';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest=read(new URL('./superseded-go.json',import.meta.url));
const inputs=read(new URL('./xnet-inputs.json',import.meta.url));
const approved=read(new URL('./xnet-release-inputs.json',import.meta.url));
const scan=read(privateRoot+'security.json'),queue=read(privateRoot+'security-queue.json');
freshScan(queue,scan);
const testFile=privateRoot+'security-20261109/remaining-high/retired-release-tests.tap';
const tests=fs.readFileSync(testFile,'utf8');
assert.match(tests, /\n# tests 50\n# suites 0\n# pass 50\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n/);
assert(Date.now()-fs.statSync(testFile).mtimeMs<3600000,'Refresh retired-command tests');
const conditionTests=privateRoot+'security-20261109/remaining-high/condition-policy-tests.tap';
assert.match(fs.readFileSync(conditionTests,'utf8'), /\n# tests 83\n# suites 0\n# pass 83\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n/);
assert(Date.now()-fs.statSync(conditionTests).mtimeMs<3600000,'Refresh condition/policy checks');
assert.equal(manifest.schemaVersion,1);assert.equal(manifest.rows.length,22);
const matches=queue.items.filter(i=>i.id===manifest.advisory&&i.package==='golang.org/x/net'&&i.scope==='tracked-build-input'&&i.installed==='v0.60.0');
assert.equal(matches.length,22,'Changed source inventory requires review');
const command=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:30000,maxBuffer:65536,stdio:['ignore','pipe','pipe']}).trim();
const replacements=[],decisions=[];
for(const key of [...new Set(manifest.rows.map(r=>r.application))].sort()){
  const s=approved.rows.find(r=>r.key===key),original=inputs.rows.find(r=>r.key===key);assert(s&&original);
  const proof=s.mode==='binary-followup'?proveFollowup(s,{requireRecentCandidate:false}):proveXnet(s,{requireRecentCandidate:false});
  assert.equal(proof.b.imageId,s.imageId);
  for(const name of s.containers){
    const inspect=()=>JSON.parse(command('inspect',name,'--format','{"image":{{json .Image}},"pid":{{.State.Pid}},"running":{{.State.Running}}}'));
    const live=inspect();assert(live.running&&live.pid>0);assert.equal(live.image,s.imageId);
    // Minimal images have no shell/hash utility. Read only the declared public
    // executable through the running process root; never inspect user data.
    assert.equal(sha('/proc/'+live.pid+'/root'+original.binary),proof.b.binarySha256);
    assert.deepEqual(inspect(),live,'Runtime changed during executable check');
  }
  replacements.push({application:key,imageId:s.imageId,binarySha256:proof.b.binarySha256,binary:original.binary,containers:s.containers,locks:original.locks,evidence:'security-20261109/xnet/'+key});
}
for(const row of manifest.rows){
  assert.equal(sha(repo+row.historicalLock),row.historicalSha256);
  assert.equal(sha(repo+row.currentLock),row.currentSha256);
  assert.match(fs.readFileSync(repo+row.currentLock,'utf8'), /golang\.org\/x\/net v0\.62\.0(?:\s|$)/);
  const i=matches.find(i=>i.targetName===row.historicalLock);
  assert(i&&i.artifact===row.historicalLock+'@sha256:'+row.historicalSha256);
  const replacement=replacements.find(r=>r.application===row.application);assert(replacement);
  decisions.push(validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),
    reason:`Historical ${row.application} build input, still vulnerable as source and retained in raw scans. Current exact runtime ${replacement.imageId} and binary match the completed x/net 0.62.0 build, native workflow and same-database scan. Superseded activation entry points are explicitly blocked before Docker/configuration writes; current activation requires the separately approved xnet profile. This is an expiring deployment/rebuild-path mitigation, not a patch to the historical lock or permission to execute it. Re-review any lock, guard, recipe or runtime change. Evidence: security-20261109/remaining-high/superseded-go-review.json; superseded-go.json; xnet/${row.application}/.`}));
}
const guardPaths=['superseded-go.mjs','superseded-go.json','superseded-go.test.mjs','superseded-go-condition.mjs','superseded-go-condition.test.mjs','review-superseded-go.mjs','xnet-inputs.json','xnet-release-inputs.json','xnet-build.mjs','xnet-policy.mjs','xnet-followup-policy.mjs'].map(f=>'deployment/maintenance/security-20261109/'+f);
guardPaths.push('deployment/maintenance/triage.mjs','deployment/maintenance/build-queue.mjs');
guardPaths.push(inputs.existingBuildRecipe,...inputs.rows.map(r=>r.buildRecipe).filter(Boolean),...manifest.releaseEntries.map(r=>r.path));
for(const row of manifest.rows)for(const path of [row.historicalLock,row.currentLock])guardPaths.push(path,path.replace(/go\.mod$/,'go.sum'));
const guards=Object.fromEntries([...new Set(guardPaths)].map(p=>[p,sha(repo+p)]));
const result={date:new Date().toISOString(),schemaVersion:1,scanDate:scan.completedAt,applied:false,rawFindingsRetained:true,historicalSourceFixed:false,liveRuntimeUnchanged:true,replacements,guards,tests:{passed:50,failed:0,sha256:sha(testFile),conditionTestsPassed:83,conditionTestsSha256:sha(conditionTests)},decisions};
const output=privateRoot+'security-20261109/remaining-high/superseded-go-review.json';
fs.mkdirSync(privateRoot+'security-20261109/remaining-high',{recursive:true,mode:0o700});
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{mode:0o600});
const condition={kind:'superseded-go-v1',sha256:sha(output)};
const batch={schemaVersion:1,scanDate:result.scanDate,decisions:decisions.map(d=>({...d,condition}))};
const batchPath=privateRoot+'security-20261109/remaining-high/superseded-go-decisions.json';
fs.writeFileSync(batchPath,JSON.stringify(batch,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({prepared:decisions.length,currentApplications:replacements.length,applied:false,output,batchPath}));
