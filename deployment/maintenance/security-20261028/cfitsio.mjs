// Exact upstream library backport; all checks use disposable synthetic files.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/cfitsio';
const inputs=JSON.parse(fs.readFileSync(here+'cfitsio-inputs.json')),source=JSON.parse(fs.readFileSync(here+'cfitsio-source.json')),s=inputs.rows[0],dir=root+'/'+s.key;
assert.equal(process.argv.length,2);fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('CFITSIO bounded operation failed; private evidence retained');}};
const docker=(...a)=>run('docker',a),library=root+'/output/libcfitsio.so.10.4.2.0',fixture=root+'/output/cfitsio-native';
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
assert.equal(docker('inspect','--format','{{.Image}}',s.containers[0]),s.base);
for(const [file,hash]of Object.entries(source.sourceArchives))assert.equal(sha(fs.readFileSync(root+'/acquire/'+file)),hash);
for(const [file,hash]of [[library,inputs.librarySha256],[fixture,inputs.fixtureSha256],[here+'cfitsio-native.c',inputs.sourceFixtureSha256],[here+'cfitsio-bounds.patch',source.patchSha256],[root+'/source/cfitsio/getcols.c',source.afterSha256]])assert.equal(sha(fs.readFileSync(file)),hash);
assert(fs.readFileSync(root+'/output/upstream-testprog.log','utf8').endsWith('Status = 0: OK - no error\n'));
const old=docker('create','--entrypoint','/not-run',s.base);try{docker('cp',old+':'+inputs.library,dir+'/before.so');}finally{docker('rm',old);}
const symbols=p=>run('readelf',['--dyn-syms','--wide',p]).split('\n').map(l=>l.trim().split(/\s+/)).filter(v=>['GLOBAL','WEAK'].includes(v[4])&&v[5]==='DEFAULT'&&v[6]!=='UND').map(v=>v[3]+':'+v[7].replace('@@','@')).sort();
const needed=p=>run('readelf',['-d',p]).split('\n').filter(l=>/SONAME|NEEDED/.test(l)).map(l=>l.slice(l.indexOf('('))).sort();
assert.equal(symbols(library).length,1808);assert.deepEqual(symbols(library),symbols(dir+'/before.so'));assert.deepEqual(needed(library),needed(dir+'/before.so'));
const context=dir+'/context';fs.mkdirSync(context,{recursive:true});fs.copyFileSync(library,context+'/library');fs.chmodSync(context+'/library',0o644);
fs.writeFileSync(context+'/Dockerfile','FROM '+s.base+'\nCOPY library '+inputs.library+'\n');
run('docker',['build','--network','none','--pull=false','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate),config=id=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',id));assert.deepEqual(config(imageId),config(s.base));
const rows=[];
for(const [state,id]of [['before',s.base],['after',imageId]]){
 const limits=['--rm','--network','none','--read-only','--user','65534:65534','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--cpus','1','--pids-limit','32','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777','-v',fixture+':/native:ro','--entrypoint','/native'];
 const normal=JSON.parse(docker('run',...limits,id,'normal'));assert(normal.passed&&normal.normalChecks===8&&normal.gdalFitsConsumer);
 const result=cp.spawnSync('docker',['run',...limits,id,'oversized'],{encoding:'utf8',timeout:20000,maxBuffer:1024**2});
 fs.writeFileSync(dir+'/'+state+'-oversized.log',String(result.stdout||'')+String(result.stderr||''));
 // A baseline crash is recorded as such, never as a successful test.
 const native=result.status===0?JSON.parse(result.stdout):{passed:false,oversizedRejected:false,exitCode:result.status};
 if(state==='after')assert(native.passed&&native.oversizedRejected);else assert(!native.oversizedRejected);
 rows.push({imageId:id,state,normal,regression:native});
}
fs.writeFileSync(dir+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),passed:true,imageId,configurationUnchanged:true,changedFiles:[inputs.library],librarySha256:inputs.librarySha256,originalLibrarySha256:sha(fs.readFileSync(dir+'/before.so')),fixtureSha256:inputs.fixtureSha256,source,abiSymbols:1808,packageMetadataPreserved:true,native:{passed:true,rows,network:false,syntheticFilesOnly:true},deployed:false},null,2)+'\n');
console.log('CFITSIO: baseline defect reproduced; fixed rejection, ordinary FITS and installed GDAL consumer passed');
