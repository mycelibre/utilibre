// Prepare exact source-input reviews; no scanner suppression or deployment.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyV3BuildInput} from '../security-20261028/jose-policy.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
assert.equal(process.argv.length,2);
const base=new URL('../',import.meta.url).pathname;
const privateRoot='/var/lib/utilibre-maintenance',root=privateRoot+'/security-20261103';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
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
