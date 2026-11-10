// Finite continuation of the existing BSON build; no resolver or production writes.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261109/mongoc',prior='/var/lib/utilibre-maintenance/security-20261028/bson',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex'),fileSha=p=>sha(fs.readFileSync(p));
const input=read(here+'mongoc-inputs.json'),s=input.rows[0],[mode]=process.argv.slice(2);assert(['build','stage','native'].includes(mode)&&process.argv.length===3);
process.env.DOCKER_BUILDKIT='0'; // Exact local image ID; never resolve it as a registry tag.
const ordinaryBinary='/var/lib/utilibre-maintenance/coturn-bson-final-20261012/output';
assert.equal(fileSha(ordinaryBinary+'/mongo-native'),input.fixtures.retainedOrdinaryConsumerSha256);
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:600000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(root+'/'+mode+'-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Bounded mongoc '+mode+' failed; private evidence retained');}};
const docker=(...a)=>run('docker',a);
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
assert.equal(fileSha(prior+'/authenticated.json'),input.retainedSourceProofSha256);
for(const [file,hash] of Object.entries(input.implementationSha256))assert.equal(fileSha(here+file),hash);
for(const pin of input.cursor.pins)assert.equal(fileSha(here+pin.patchFile),pin.patchSha256);
assert.equal(fileSha('/home/ubuntu/freetools/'+input.fixtures.ordinaryConsumer),input.fixtures.ordinaryConsumerSha256);
const manifest=(dir,p='')=>fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.name!=='.pc').flatMap(e=>e.isDirectory()?manifest(dir+'/'+e.name,p+e.name+'/'):[[p+e.name,e.isSymbolicLink()?'link:'+fs.readlinkSync(dir+'/'+e.name):fileSha(dir+'/'+e.name)]]).sort((a,b)=>a[0].localeCompare(b[0]));
if(mode==='build'){
 assert(!fs.existsSync(root+'/native-build.json'));
 assert.equal(sha(JSON.stringify(manifest(prior+'/input/source'))),input.sourceTreeSha256);
 assert.equal(fileSha(prior+'/input/source/'+input.cursor.files[0]),input.cursor.beforeSha256);
 fs.mkdirSync(root+'/output',{recursive:true});
 const output=docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','2','--memory','1536m','--pids-limit','128','--log-driver','none','--tmpfs','/work:rw,exec,size=768m','--tmpfs','/tmp:rw,size=16m','-v',prior+'/input:/input:ro','-v',here+':/recipe:ro','-v',new URL('../coturn-bson-final/',import.meta.url).pathname+':/ordinary:ro','-v',root+'/output:/output','-v',ordinaryBinary+':/ordinary-binary:ro','--entrypoint','sh',input.compiler,'/recipe/build-mongoc.sh');
 fs.writeFileSync(root+'/build.log',output+'\n');assert(output.includes(input.cursor.afterSha256+'  '+input.cursor.files[0]));
 const lib=root+'/output/libmongoc-1.0.so.0.0.0',old=root+'/output/before-mongoc.so';
 docker('cp',s.containers[0]+':'+input.library,old);assert.equal(fileSha(old),input.previousLibrarySha256);
 const symbols=p=>run('nm',['-D','--defined-only',p]).split('\n').map(l=>l.trim().split(/\s+/).slice(1).join(' ')).sort();
 const dynamic=p=>run('readelf',['-d',p]).split('\n').filter(l=>/SONAME|NEEDED|BIND_NOW|RUNPATH|RPATH/.test(l)).map(l=>l.slice(l.indexOf('('))).sort();
 assert.deepEqual(symbols(lib),symbols(old));assert.deepEqual(dynamic(lib),dynamic(old));
 fs.symlinkSync('libmongoc-1.0.so.0.0.0',root+'/output/libmongoc-1.0.so.0');
 fs.chmodSync(root+'/output',0o755);fs.chmodSync(root+'/output/mongo-native',0o755);fs.chmodSync(lib,0o644);
 const rows=[];
 for(const state of ['before','after']){
  const result=docker('run','--rm','--network','none','--read-only','--user','65534:65534','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.5','--pids-limit','32','--log-driver','none','-v',root+'/output:/checks:ro',...(state==='after'?['-e','LD_LIBRARY_PATH=/checks']:[]),'--entrypoint','/checks/mongo-native',s.base);
  assert.equal(result,'Original-header BSON/JSON, UTF-8, typed data, TLS URI and offline client lifecycle passed.');rows.push({state,passed:true,ordinaryConsumer:true,network:'none'});
 }
 fs.writeFileSync(root+'/native-build.json',JSON.stringify({date:new Date().toISOString(),passed:true,compiler:input.compiler,sourceTreeSha256:input.sourceTreeSha256,cursorSha256:input.cursor.afterSha256,librarySha256:fileSha(lib),previousLibrarySha256:input.previousLibrarySha256,abiPreserved:true,neededPreserved:true,symbols:symbols(lib).length,rows,excessiveInputReproduction:false,byteReproducibilityClaimed:false},null,2)+'\n');
 console.log('Exact upstream cursor fixes, ordinary old-header client and ABI checks passed.');
}else if(mode==='stage'){
 const n=read(root+'/native-build.json');assert(n.passed&&n.abiPreserved&&n.neededPreserved);assert.equal(fileSha(root+'/output/libmongoc-1.0.so.0.0.0'),n.librarySha256);
 for(const name of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',name),s.base);
 const dir=root+'/coturn',context=root+'/context';assert(!fs.existsSync(dir+'/build.json'));fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(context,{recursive:true});fs.copyFileSync(root+'/output/libmongoc-1.0.so.0.0.0',context+'/libmongoc.so');
 fs.chmodSync(context+'/libmongoc.so',0o644);
 const config=readImage(s.base).Config;assert(/^[A-Za-z0-9_:.-]*$/.test(config.User||''));
 const recipe=`FROM ${s.base}\nUSER 0\nCOPY libmongoc.so ${input.library}\nUSER ${config.User||'0'}\n`;fs.writeFileSync(context+'/Dockerfile',recipe);
 docker('build','--network','none','--pull=false','-t',s.candidate,context);const image=readImage(s.candidate);assert.deepEqual(image.Config,config);
 fs.writeFileSync(dir+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),imageId:image.Id,passed:true,configurationUnchanged:true,changedFiles:[input.library],librarySha256:n.librarySha256,native:n,packageMetadataPreserved:true},null,2)+'\n');
 console.log('One-library candidate staged; full image and isolated relay checks remain.');
}else{
 const b=read(root+'/coturn/build.json');assert(b.passed);assert.equal(readImage(s.candidate).Id,b.imageId);
 assert.equal(fileSha('/home/ubuntu/freetools/'+input.fixtures.relay),input.fixtures.relaySha256);
 assert(!fs.existsSync(root+'/coturn/application.json'));
 const result=JSON.parse(run('env',['UTILIBRE_COTURN_TEST_SUBNET=198.19.250.0/28','python3',input.fixtures.relay,b.imageId]));assert(result.passed&&result.image===b.imageId);
 fs.writeFileSync(root+'/coturn/application.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,fixtureSha256:input.fixtures.relaySha256,result,productionChanged:false,limitation:'Isolated ordinary native relay protocol; not real devices/public NAT or capacity evidence.'},null,2)+'\n');
 console.log('Existing isolated native relay checks passed.');
}
function readImage(id){return JSON.parse(docker('image','inspect',id))[0];}
