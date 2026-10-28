// Offline bounded old/new library check, independent from production containers.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const ferret=process.argv.includes('--ferretdb');assert(process.argv.slice(2).every(x=>x==='--ferretdb'));const resultFile=ferret?'regression-ferretdb.json':'regression.json';
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/codec',inputs=JSON.parse(fs.readFileSync(here+'codec-inputs.json'));
const sha=b=>createHash('sha256').update(b).digest('hex'),rows=[];
assert.equal(sha(fs.readFileSync(root+'/modules/cache/download/'+inputs.dependency+'/@v/'+inputs.version+'.zip')),inputs.releaseZipSha256);
assert(!fs.existsSync(root+'/'+resultFile),'Preserve completed evidence');
for(const version of [ferret?'v1.18.0':'v1.18.5','v1.20.2']){
 const dir=root+'/regression-'+(ferret?'ferret-':'')+version;fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(dir+'/go.mod','module utilibre.local/codec-check\n\ngo 1.26\n\nrequire '+inputs.dependency+' '+version+'\nreplace '+inputs.dependency+' => /modules/'+inputs.dependency+'@'+version+'\n');
 const args=['run','--rm','--network','none','--read-only','--memory','768m','--memory-swap','768m','--cpus','1','--pids-limit','96','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=512m','--tmpfs','/tmp:rw,exec,size=32m','-e','GOTOOLCHAIN=local','-e','GOTELEMETRY=off','-e','GOMAXPROCS=1','-e','GOPROXY=off','-e','GOSUMDB=off','-e','GOCACHE=/work/cache','-e','GOTMPDIR=/work','-v',root+'/modules:/modules:ro','-v',dir+'/go.mod:/input/go.mod:ro','-v',here+'codec-native.go:/input/main.go:ro','sha256:5bba7feafd0a05a85a6454714b44e5909beebda3dfda1018bb0f4fd5acc66d1f','sh','-c','cd /work && cp /input/go.mod /input/main.go . && go run -mod=readonly .'];
 const run=cp.spawnSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:1024**2});fs.writeFileSync(dir+'/output-'+Date.now()+'.log',run.stdout+run.stderr);assert.equal(run.status,0,'Native codec check failed; retained log');
 const n=JSON.parse(run.stdout);assert(n.passed&&n.normalChecks===7);rows.push({version,...n});
}
assert.equal(rows[0].overflowRejected,0);assert.equal(rows[1].overflowRejected,3);assert(!rows[0].fseRejected&&rows[0].fsePanicked);assert(rows[1].fseRejected&&!rows[1].fsePanicked);
fs.writeFileSync(root+'/'+resultFile,JSON.stringify({date:new Date().toISOString(),passed:true,network:'none',fixtureSha256:sha(fs.readFileSync(here+'codec-native.go')),advisories:[inputs.advisory,inputs.additionalPrimaryAdvisory],rows},null,2)+'\n');console.log('Both codec regressions reproduced; fixed version rejects them and preserves seven normal checks.');
