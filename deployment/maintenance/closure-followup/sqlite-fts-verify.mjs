import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012/sqlite-fts-bookworm',recipe=new URL('.',import.meta.url).pathname.replace(/\/$/,''),name='maintenance-sqlite-fts-regression';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=a=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
assert.equal(sha(dir+'/libsqlite3-0_3.40.1-2+deb12u2+utilibre2_amd64.deb'),'070eab3c6f2613c686a5b593a0fd7f99a6fdaa8d6bdf1467a3aa32b85bc2ad6e');
assert.match(fs.readFileSync(dir+'/distinct-patched-tests.log','utf8'),/0 errors out of 87 tests/);
let created=false;
try{
 run(['run','-d','--name',name,'--cpus','1','--memory','1g','--memory-swap','1g','--pids-limit','128','--ulimit','core=0','--log-driver','none','--security-opt','no-new-privileges','--tmpfs','/work:rw,exec,nosuid,nodev,size=256m,uid=65534,gid=65534','--tmpfs','/var/lib/apt/lists:rw,size=128m','--tmpfs','/var/cache/apt:rw,size=128m','--mount','type=bind,src='+dir+',dst=/output','--mount','type=bind,src='+recipe+',dst=/recipe,readonly','--entrypoint','sleep','node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20','infinity']);created=true;
 run(['exec',name,'sh','-ec','apt-get update -qq && apt-get install -y --no-install-recommends gcc libc6-dev libsqlite3-dev libtcl8.6 patch']);
 run(['network','disconnect','bridge',name]);assert.deepEqual(JSON.parse(run(['inspect',name]))[0].NetworkSettings.Networks,{});
 const output=run(['exec','--user','65534:65534',name,'sh','/recipe/sqlite-fts-rerun.sh']);assert.match(output,/PATCHED_SQLITE_FTS_COMPATIBLE_AND_NATIVE_PASSED/);
 const report={date:new Date().toISOString(),passed:true,patchedSource:true,corruptDatabaseRejected:true,nativeLibrarySha256:sha(dir+'/libsqlite3-0_3.40.1-2+deb12u2+utilibre2_amd64.deb'),upstreamDistinctTests:87,upstreamFtsCompatibleTests:7,compatibilityOnly:'Test-local unhex implementation and older SQLITE_CORRUPT message; database construction/mutation and MATCH query unchanged. No production code change beyond the upstream one-line bound check.',network:'Disconnected before fixture execution',fixtureSha256:sha(dir+'/fts-corrupt.db'),probeSha256:sha(dir+'/sqlite-fts-probe'),limitations:'No claim that this non-ASan test reproduces an old-library memory overwrite. Native application/ABI gates remain separate.'};
 fs.writeFileSync(dir+'/fts-native-proof.json',JSON.stringify(report,null,2)+'\n');console.log('Patched source: 87 DISTINCT and 7 compatible FTS tests; actual native-library corruption rejection passed.');
}catch(e){fs.writeFileSync(dir+'/fts-verify-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('FTS verification failed; private diagnostics retained');}
finally{if(created)run(['rm','-f','-v',name]);}
