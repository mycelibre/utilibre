// Same bounded fixture, old and fixed libraries, no network or live service.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/text',inputs=JSON.parse(fs.readFileSync(here+'text-inputs.json')),rows=[];
const sha=b=>createHash('sha256').update(b).digest('hex');assert(!fs.existsSync(root+'/regression.json'));
for(const version of ['v0.40.0','v0.41.0']){
 const cache=root+'/fmd/cache',dir=root+'/regression-'+version;fs.mkdirSync(dir,{recursive:true});
 assert.equal(sha(fs.readFileSync(cache+'/cache/download/golang.org/x/text/@v/'+version+'.zip')),version==='v0.41.0'?inputs.releaseZipSha256:inputs.baselineZipSha256);
 fs.writeFileSync(dir+'/go.mod','module utilibre.local/text-check\n\ngo 1.26\nrequire golang.org/x/text '+version+'\nreplace golang.org/x/text => /module\n');
 assert(fs.existsSync(cache+'/golang.org/x/text@'+version+'/go.mod'),'Acquired baseline module required');
 const r=cp.spawnSync('docker',['run','--rm','--network','none','--read-only','--memory','768m','--memory-swap','768m','--cpus','1','--pids-limit','96','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=512m','-e','GOTOOLCHAIN=local','-e','GOTELEMETRY=off','-e','GOMAXPROCS=1','-e','GOPROXY=off','-e','GOSUMDB=off','-e','GOCACHE=/work/cache','-e','GOTMPDIR=/work','-v',cache+'/golang.org/x/text@'+version+':/module:ro','-v',dir+'/go.mod:/input/go.mod:ro','-v',here+'text-native.go:/input/main.go:ro',inputs.fmdGorootImage,'sh','-c','cd /work && cp /input/go.mod /input/main.go . && go run -mod=readonly .'],{encoding:'utf8',timeout:180000,maxBuffer:1024**2});fs.writeFileSync(dir+'/run-'+Date.now()+'.log',r.stdout+r.stderr);assert.equal(r.status,0,'Fixture failed; private log retained');const n=JSON.parse(r.stdout);assert.equal(n.normalChecks,4);assert.equal(n.cases,101);rows.push({version,...n});
}
assert(rows[0].panics>0);assert(rows[1].panics===0&&rows[1].wrongResults===0);
fs.writeFileSync(root+'/regression.json',JSON.stringify({date:new Date().toISOString(),passed:true,normalChecks:4,fixtureSha256:sha(fs.readFileSync(here+'text-native.go')),before:rows[0],after:rows[1],network:'none'},null,2)+'\n');console.log('Nickname panic reproduced; fixed library passes the expansion regression and 100 bounded streaming cases and four ordinary transformations.');
