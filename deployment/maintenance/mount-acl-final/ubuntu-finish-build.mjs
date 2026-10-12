import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {root,sha,docker} from './common.mjs';
process.umask(0o077);
const builder='maintenance-mount-ubuntu-build',out=root+'/ubuntu-output';
assert(!fs.existsSync(root+'/ubuntu-upstream-exception.json'));
const log=fs.readFileSync(out+'/build.log','utf8');assert(log.includes('2 tests of 261 FAILED'));
assert.equal((log.match(/^ FAILED \(/gm)||[]).length,2);
const expected=['mkfds-ro-regular-file','mkfds-rw-character-device'];
for(const test of expected)assert(log.includes('FAILED (lsfd/'+test+')'));
const index=fs.readFileSync(out+'/baseline-package-index.txt','utf8');
const hash=docker('exec',builder,'sha256sum','/build/util-linux-extra_2.39.3-9ubuntu6.6_amd64.deb').split(/\s/)[0];
assert(index.includes('SHA256: '+hash));
const baselines=[];
for(const name of expected){
 const r=cp.spawnSync('docker',['exec',builder,'sh','-c','cd /build/source; runuser -u nobody -- env TS_CMD_LSFD=/build/baseline/usr/bin/lsfd ./tests/ts/lsfd/'+name+' --verbose'],{encoding:'utf8'});
 assert.equal(r.status,1);assert(r.stdout.includes('DEVNUM[STR]: 1')&&r.stdout.includes('STAT_DEVNUM:'));
 fs.writeFileSync(out+'/baseline-'+name+'.log',r.stdout);baselines.push({name,sha256:sha(r.stdout)});
}
const targeted=docker('exec',builder,'sh','-c','cd /build/source; runuser -u nobody -- ./tests/run.sh --nonroot --verbose --parallel=1 libmount');
assert(!/\.\.\. FAILED \(/.test(targeted));assert(/All [0-9]+ tests PASSED/.test(targeted));fs.writeFileSync(out+'/libmount-tests.log',targeted+'\n');
const record={date:new Date().toISOString(),baselineAndCandidateSameFailure:true,suiteTests:261,candidateFailures:2,baselinePackage:{version:'2.39.3-9ubuntu6.6',sha256:hash,method:'APT download authenticated by the compiler signed Ubuntu package index; exact SHA256 checked'},baselines,targetedTests:Number(targeted.match(/All ([0-9]+) tests PASSED/)[1]),targetedLogSha256:sha(targeted+'\n'),originalBuildLogSha256:sha(log),reason:'lsfd tests compare an old device-number encoding against modern container device IDs. Both failures reproduce using the official unmodified Ubuntu lsfd binary. No lsfd binary is shipped by this mount-only overlay.'};
fs.writeFileSync(root+'/ubuntu-upstream-exception.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({exceptionReproduced:true,targetedTests:record.targetedTests,canPackage:true}));
