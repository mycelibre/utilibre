// Resume only after the complete suite found the same single container-device
// encoding failure in both the unchanged system lsfd and rebuilt lsfd.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {root,work,builder,sha,docker} from './common.mjs';
const build=fs.readFileSync(work+'/output/build.log','utf8');
assert(build.includes('1 tests of 225 FAILED'));
assert.equal((build.match(/\.\.\. FAILED \(/g)||[]).length,1);
assert(build.includes('FAILED (lsfd/mkfds-rw-character-device)'));
const result=cp.spawnSync('docker',['exec',builder,'sh','-c','cd /work/mount-acl-final/source; runuser -u nobody -- ./tests/ts/lsfd/mkfds-rw-character-device --use-system-commands --verbose'],{encoding:'utf8'});
assert.equal(result.status,1);assert(result.stdout.includes('DEVNUM[STR]: 1'));
assert(result.stdout.includes('STAT_DEVNUM: 5242940'));
const prior='/var/lib/utilibre-maintenance/closure-followup-20261012/sources/util-linux-2.38.1';
for(const p of ['misc-utils/lsfd.c','misc-utils/lsfd-file.c','tests/ts/lsfd/mkfds-rw-character-device','tests/ts/lsfd/lsfd-functions.bash'])
 if(fs.existsSync(work+'/source/'+p))assert.equal(sha(fs.readFileSync(work+'/source/'+p)),sha(fs.readFileSync(prior+'/'+p)));
fs.writeFileSync(root+'/output/baseline-lsfd-test.log',result.stdout);
fs.writeFileSync(root+'/upstream-exception.json',JSON.stringify({date:new Date().toISOString(),component:'lsfd/mkfds-rw-character-device',baselineAndCandidateSameFailure:true,reason:'Pre-existing device-number encoding test assumes a low devtmpfs minor; this isolated container has device 0:1340. No lsfd file is changed or shipped in the repair.',suiteTests:225,candidateFailures:1,baselineLogSha256:sha(Buffer.from(result.stdout)),originalBuildLogSha256:sha(Buffer.from(build))},null,2)+'\n');
fs.copyFileSync(work+'/output/build.log',root+'/output/upstream-build.log');
const output=docker('exec',builder,'sh','-c','cd /work/mount-acl-final/source; runuser -u nobody -- ./tests/run.sh --nonroot --verbose --parallel=1 libmount');
assert(!/\.\.\. FAILED \(/.test(output));fs.writeFileSync(root+'/output/libmount-tests.log',output+'\n');
console.log('Full-suite exception reproduced in unchanged baseline; targeted libmount suite passed. Packaging may resume without repeating tests.');
