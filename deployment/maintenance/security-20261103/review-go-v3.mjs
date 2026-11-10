// Prepare exact source-input reviews; no scanner suppression or deployment.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyV3BuildInput} from '../security-20261028/jose-policy.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
import cp from 'node:child_process';
import {proveFollowup} from '../security-20261109/xnet-followup-policy.mjs';
process.umask(0o077);
const xnet=process.argv[2]==='--xnet-anubis';
assert.equal(process.argv.length,xnet?3:2);
const base=new URL('../',import.meta.url).pathname;
const privateRoot='/var/lib/utilibre-maintenance',root=privateRoot+'/security-20261103';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(xnet){
 const scan=read(privateRoot+'/security.json'),q=read(privateRoot+'/security-queue.json');freshScan(q,scan);assert.equal(scan.status,'checked');
 const s=read(new URL('../security-20261109/xnet-release-inputs.json',import.meta.url)).rows.find(r=>r.key==='anubis');
 const {b}=proveFollowup(s,{requireRecentCandidate:false});
 const original=read(new URL('../security-20261109/xnet-inputs.json',import.meta.url)).rows.find(r=>r.key==='anubis');
 const d=privateRoot+'/security-20261109/xnet/anubis',fixedPath=privateRoot+'/security-20261028/jose/regression/v3-fixed/jwk.go';
 assert.equal(sha(fixedPath),original.joseV3Sha256);
 const name='deployment/maintenance/security-20261109/xnet-locks/anubis/go.mod',lock=new URL('../security-20261109/xnet-locks/anubis/go.mod',import.meta.url);
 assert.equal(sha(lock),original.locks['go.mod']);verifyV3BuildInput(fs.readFileSync(lock,'utf8'),fs.readFileSync(fixedPath));
 const buildLock=fs.readFileSync(d+'/anubis-build-go.mod','utf8');assert(buildLock.includes('replace github.com/go-jose/go-jose/v3 => /work/jose-v3'));
 const tests=fs.readFileSync(d+'/anubis-jose-v3-tests.txt','utf8');assert(/^ok\s+github.com\/go-jose\/go-jose\/v3\s/m.test(tests)&&!/(^|\n)FAIL(?:\s|$)/.test(tests));
 const release=read(privateRoot+'/security-20261109/xnet/release.json').groups.find(g=>g.key==='anubis');assert(release.status==='passed');
 const container='public-utility-anubis-1';assert.equal(cp.execFileSync('docker',['inspect','--format','{{.Image}}',container],{encoding:'utf8',timeout:10000}).trim(),s.imageId);
 const temp=fs.mkdtempSync(d+'/review-live-');
 try{cp.execFileSync('docker',['cp',container+':/ko-app/anubis',temp+'/anubis'],{timeout:30000,stdio:['ignore','pipe','pipe']});assert.equal(sha(temp+'/anubis'),b.binarySha256);}finally{fs.rmSync(temp,{recursive:true});}
 const matches=q.items.filter(i=>i.scope==='tracked-build-input'&&i.targetName===name&&i.id==='CVE-2026-116587'&&i.package==='github.com/go-jose/go-jose/v3'&&i.installed==='v3.0.5');assert.equal(matches.length,1);
 const i=matches[0];assert.equal(i.artifact,name+'@sha256:'+original.locks['go.mod']);
 const decision=validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Exact Anubis x/net build retains the previously reviewed JOSE v3 backport with mandatory original/fixed source hashes and an isolated local module replacement. Its v3 suite and native application checks pass; live binary matches the approved artifact. Version metadata remains v3.0.5 and the raw source finding remains. Evidence: security-20261109/xnet/anubis, xnet-inputs.json, xnet-release-inputs.json. This does not waive another image, lock or advisory; re-review if the builder, patch, lock or artifact changes. https://github.com/go-jose/go-jose/commit/a0111f82742fa92bceec9ede40845e73319e6230'});
 fs.writeFileSync(d+'/v3-review.json',JSON.stringify({schemaVersion:1,date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions:[decision]},null,2)+'\n');
 console.log('One exact Anubis source-input review prepared; raw finding retained.');process.exit(0);
}
const spec=read(new URL('./go-v3-replay-inputs.json',import.meta.url));
assert.equal(spec.deploymentAllowed,false);
for(const [f,h]of Object.entries(spec.builders))assert.equal(sha(base+f),h,'Changed repair adapter');
for(const [f,h]of Object.entries(spec.evidence))assert.equal(sha(root+'/'+f),h,'Changed replay evidence');
const native=read(root+'/go-v3-native/v3-regression.json');
assert(native.passed&&native.rows.length===2&&native.rows.every(x=>x.passedTests===262));
assert(!native.rows[0].modulusBoundaryRejected&&native.rows[1].modulusBoundaryRejected);
assert.equal(native.rows[1].sourceSha256,spec.fixedSourceSha256);
const fixed=fs.readFileSync(root+'/go-v3-native/regression/v3-fixed/jwk.go');
assert.equal(sha(root+'/go-v3-native/regression/v3-fixed/jwk.go'),spec.fixedSourceSha256);
const build=read(root+'/go-v3/anubis/build.json');
assert(build.status==='passed'&&build.network==='none'&&!build.productionChanged);
for(const [f,h]of Object.entries(build.artifacts))assert.equal(sha(root+'/go-v3/anubis/'+f),h);
for(const app of ['oauth2-proxy','wakapi']){
 const evidence=read(privateRoot+'/security-20261028/jose-leaf/'+app+'/build.json');
 assert(evidence.passed&&evidence.native.passed&&evidence.joseV3Backport&&evidence.joseV3Evidence.passed);
 const row=read(root+'/go-locks/verification.json').rows.find(r=>r.key===app);
 assert(row.passed&&row.imageId===evidence.imageId);
}
const scan=read(privateRoot+'/security.json'),q=read(privateRoot+'/security-queue.json');freshScan(q,scan);
assert.equal(scan.status,'checked');
const decisions=[];
for(const s of spec.rows){
 for(const [f,h]of Object.entries(s.files))assert.equal(sha(base+s.directory+'/'+f),h);
 verifyV3BuildInput(fs.readFileSync(base+s.directory+'/go.mod','utf8'),fixed);
 const name='deployment/maintenance/'+s.directory+'/go.mod';
 const matches=q.items.filter(i=>i.scope==='tracked-build-input'&&i.targetName===name&&i.id===spec.advisory&&i.package==='github.com/go-jose/go-jose/v3'&&i.installed==='v3.0.5');
 assert.equal(matches.length,1,'Missing or ambiguous scan coverage');
 const i=matches[0];assert.equal(i.artifact,name+'@sha256:'+s.files['go.mod']);
 decisions.push(validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Exact reviewed JOSE v3 RSA backport is mandatory in this graph\'s checked builders; unsupported versions or missing/different patch bytes are rejected. Fresh networkless v3 suites pass 262 cases before and after, with the modulus boundary accepted only before. Anubis/OpenGist native rebuilds pass; OAuth/Wakapi reuse exact previous build/native/binary evidence. No new production rollout or new account-flow test is claimed. Version metadata remains v3.0.5; raw source match retained. Evidence: security-20261103/go-v3-replay-inputs.json, go-v3-native/v3-regression.json, go-v3/anubis/build.json and go-v3-leaf/output. Review must be renewed if recorded builder/patch/lock hashes change. https://github.com/go-jose/go-jose/commit/a0111f82742fa92bceec9ede40845e73319e6230'}));
}
assert.equal(decisions.length,6);
fs.writeFileSync(root+'/go-locks/v3-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions},null,2)+'\n');
console.log('Six exact source-input review proposals prepared; no production change.');
