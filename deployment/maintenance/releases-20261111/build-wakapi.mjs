// Finite 2.18.2 candidate; reuses the reviewed offline build and retained repairs.
// Preparation only: no image publication, service restart or production mounts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const repo=new URL('../../../',import.meta.url).pathname;
const dir='/var/lib/utilibre-maintenance/upgrade-closure-20261111/wakapi';
const source=dir+'/source', revision='1157f203c8b646466b4e72563764738b10f0cd0d';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>cp.execFileSync('git',a,{cwd:source,encoding:'utf8'}).trim();
assert.equal(git('rev-parse','HEAD'),revision);
assert.equal(git('status','--porcelain'),'','Requires a clean candidate checkout');
assert.equal(git('diff','347f1f45ae2863d9499236471317a76630c5308f','HEAD','--','go.mod','go.sum'),'','Upstream dependency inputs changed');
const patch=repo+'deployment/expanded/wakapi-summary.patch';
cp.execFileSync('git',['apply','--check',patch],{cwd:source});
cp.execFileSync('git',['apply',patch],{cwd:source});
assert.deepEqual(git('diff','--name-only').split('\n').sort(),['static/assets/js/login.js','static/assets/js/summary.js','views/summary.tpl.html'].sort());
const spec=JSON.parse(fs.readFileSync(repo+'deployment/maintenance/security-20261109/xnet-inputs.json')).rows.find(x=>x.key==='wakapi');
const recipe=repo+spec.buildRecipe;
assert.equal(sha(fs.readFileSync(recipe)),spec.buildRecipeSha256);
const locks=repo+'deployment/maintenance/security-20261109/xnet-locks/wakapi';
for(const [f,h] of Object.entries(spec.locks))assert.equal(sha(fs.readFileSync(locks+'/'+f)),h);
const fixed='/var/lib/utilibre-maintenance/security-20261028/jose/regression/v3-fixed/jwk.go';
assert.equal(sha(fs.readFileSync(fixed)),spec.joseV3Sha256);
let script=fs.readFileSync(recipe,'utf8');
for(const [before,after]of [['v0\\.57\\.0','v0\\.58\\.0'],['v0\\.42\\.0','v0\\.43\\.0']]){
 assert.equal(script.split(before).length,2);script=script.replace(before,after);
}
fs.writeFileSync(dir+'/build-adapter.sh',script,{flag:'wx'});
const before=git('diff','--binary');
fs.copyFileSync(patch,dir+'/retained.patch');
const args=['run','--rm','--name','maintenance-wakapi-2182-build','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','3g','--memory-swap','3g','--pids-limit','256','--tmpfs','/work:rw,exec,size=2g,mode=1777','--tmpfs','/tmp:rw,size=16m','-e','EXPECTED_GO='+spec.compilerVersion,'-e','UTILIBRE_PHASE=build','-e','UTILIBRE_JOSE_V3=1','-v',spec.moduleCache+':/modules:ro','-v',source+':/source:ro','-v',dir+':/output','-v',dir+'/build-adapter.sh:/build.sh:ro','-v',locks+':/scripts/locks/wakapi:ro','-v',fixed+':/jose-v3-jwk.go:ro',spec.compiler,'sh','/build.sh','wakapi'];
const fd=fs.openSync(dir+'/build.log','wx');
const result=cp.spawnSync('docker',args,{timeout:1200000,stdio:['ignore',fd,fd]});fs.closeSync(fd);
assert.equal(result.status,0,'Build failed; inspect the protected build log');
assert.equal(git('diff','--binary'),before);
const tests=fs.readFileSync(dir+'/wakapi-tests.txt','utf8');assert(/^ok\s/m.test(tests)&&!/^FAIL/m.test(tests));
fs.writeFileSync(dir+'/compiled.json',JSON.stringify({date:new Date().toISOString(),passed:true,revision,version:'2.18.2',compiler:spec.compiler,compilerVersion:spec.compilerVersion,locks:spec.locks,patchSha256:sha(fs.readFileSync(patch)),joseV3Sha256:spec.joseV3Sha256,binarySha256:sha(fs.readFileSync(dir+'/wakapi')),network:'none',productionChanged:false},null,2)+'\n');
console.log('Wakapi 2.18.2: offline build and existing unit checks passed; not deployed');
