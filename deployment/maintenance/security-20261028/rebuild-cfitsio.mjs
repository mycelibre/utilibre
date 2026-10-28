// Rebuild from authenticated archived Debian inputs in a fresh offline workspace.
// Output remains a candidate. This command cannot activate an image or service.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/cfitsio';
const source=JSON.parse(fs.readFileSync(here+'cfitsio-source.json')),inputs=JSON.parse(fs.readFileSync(here+'cfitsio-inputs.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [file,hash]of Object.entries(source.sourceArchives))assert.equal(sha(fs.readFileSync(root+'/acquire/'+file)),hash);
assert.equal(sha(fs.readFileSync(here+'cfitsio-bounds.patch')),source.patchSha256);
assert.equal(sha(fs.readFileSync(here+'cfitsio-native.c')),inputs.sourceFixtureSha256);
assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>8*1024**3);
const work=fs.mkdtempSync(root+'/replay-');fs.mkdirSync(work+'/output');
const run=(p,a,o={})=>{const r=cp.spawnSync(p,a,{encoding:'utf8',timeout:480000,maxBuffer:8*1024**2,...o});fs.writeFileSync(work+'/'+p+'-'+Date.now()+'.log',String(r.stdout||'')+String(r.stderr||r.error||''));assert.equal(r.status,0,'Offline rebuild failed; diagnostics retained');return r.stdout;};
run('dpkg-source',['-x',root+'/acquire/cfitsio_4.2.0-3.dsc',work+'/source']);
assert.equal(sha(fs.readFileSync(work+'/source/getcols.c')),source.beforeSha256);
run('patch',['--batch','--fuzz=0','-p1','-i',here+'cfitsio-bounds.patch'],{cwd:work+'/source'});
assert.equal(sha(fs.readFileSync(work+'/source/getcols.c')),source.afterSha256);
run('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','2g','--memory-swap','2g','--cpus','2','--pids-limit','128','--log-driver','none','--tmpfs','/tmp:rw,exec,size=768m,mode=1777','-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-v',work+'/source:/source:ro','-v',work+'/output:/out','-v',here+'cfitsio-compile.sh:/compile.sh:ro','-v',here+'cfitsio-native.c:/native.c:ro','--entrypoint','sh',source.builder,'/compile.sh']);
const librarySha256=sha(fs.readFileSync(work+'/output/libcfitsio.so.10.4.2.0'));
assert(fs.readFileSync(work+'/output/upstream-testprog.log','utf8').endsWith('Status = 0: OK - no error\n'));
fs.writeFileSync(work+'/replay.json',JSON.stringify({date:new Date().toISOString(),prepared:true,source,librarySha256,originalCandidateLibrarySha256:inputs.librarySha256,libraryBytesIdentical:librarySha256===inputs.librarySha256,fixtureSha256:sha(fs.readFileSync(work+'/output/cfitsio-native')),nativeFixtureSourceSha256:inputs.sourceFixtureSha256,network:false,productionChanged:false,limitation:'Build and upstream-program replay only; new outputs require exact-artifact native, application, scope and scanner gates before release. Image/build-byte reproducibility is not inferred.'},null,2)+'\n');
console.log('Fresh archived-source rebuild complete: '+work+'/replay.json');
