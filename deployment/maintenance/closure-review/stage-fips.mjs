import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/fips-closure-20261012';
const base='sha256:183de8426796745506c5e14c45d413df25c40480bbcaa430372937bf0e5dfd1d',candidate='utilibre-authentik:2026.8.3-fips-closure-20261012';
const run=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(root+'/stage-error.log',String(e.stderr||'')+String(e.stdout||''));throw Error('FIPS staging failed; private stage-error.log');}};
assert.match(fs.readFileSync(root+'/build.log','utf8'),/Files=345, Tests=4911,[\s\S]*Result: PASS/);
assert(fs.existsSync(root+'/SHA256SUMS'),'Complete source build required');
const context=fs.mkdtempSync(root+'/stage-'),packages={};
try{
 for(const p of ['libssl-dev','libssl3t64','openssl','openssl-provider-legacy']){const file=p+'_3.5.7-1~deb13u3_amd64.deb';packages[file]=createHash('sha256').update(fs.readFileSync(root+'/'+file)).digest('hex');fs.copyFileSync(root+'/'+file,context+'/'+file);}
 fs.copyFileSync(new URL('./Dockerfile.fips',import.meta.url),context+'/Dockerfile');
 assert.equal(run('image','inspect','utilibre-authentik:2026.8.3-xml-security-20261011','--format','{{.Id}}'),base);
 run('build','--network','none','--pull=false','-t',candidate,context);
 const imageId=run('image','inspect',candidate,'--format','{{.Id}}');
 assert.equal(run('image','inspect',base,'--format','{{json .Config}}'),run('image','inspect',imageId,'--format','{{json .Config}}'));
 const check=(id,cmd)=>run('run','--rm','--network','none','--log-driver','none','--read-only','--cpus','1','--memory','256m','--entrypoint','sh',id,'-c',cmd);
 const files='/etc/ssl/fipsmodule.cnf /usr/lib/x86_64-linux-gnu/ossl-modules/fips.so';
 assert.equal(check(base,'sha256sum '+files),check(imageId,'sha256sum '+files));
 assert.equal(check(base,'apt-mark showhold'),check(imageId,'apt-mark showhold'));
 const appCmd='find /ak-root -type f -exec sha256sum {} + | sort | sha256sum';
 const appHash=check(base,appCmd);assert.equal(check(imageId,appCmd),appHash);
 const providers=check(imageId,'openssl list -providers');assert.match(providers,/fips[\s\S]*version: 3\.1\.2[\s\S]*status: active/);
 const result={date:new Date().toISOString(),base,candidate,imageId,packages,passed:true,configurationUnchanged:true,fipsProviderUnchanged:true,applicationSha256:appHash.split(' ')[0],nativeProvidersActive:true,heldPackagesUnchanged:true,upstreamTests:4911};
 fs.writeFileSync(root+'/candidate.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({candidate,imageId,passed:true}));
}finally{fs.rmSync(context,{recursive:true});}
