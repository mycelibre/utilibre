// Exact source replay and one-library overlay using the previous native recipe.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028/bson';
const prior='/var/lib/utilibre-maintenance/coturn-bson-final-20261012';
const recipe=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const spec=read(recipe+'bson-inputs.json'),s=spec.rows[0],mode=process.argv[2];
assert(['prepare','build','stage'].includes(mode)&&process.argv.length===3);
fs.mkdirSync(root,{recursive:true});
function run(program,args,options={}){try{return cp.execFileSync(program,args,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...options}).trim();}catch(e){fs.writeFileSync(root+'/'+mode+'-error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('Bounded BSON '+mode+' failed; private diagnostic retained');}}
const docker=(...args)=>run('docker',args);
const hashfile=p=>sha(fs.readFileSync(p));
assert.equal(hashfile(prior+'/native.json'),spec.priorNativeSha256);
assert.equal(hashfile(recipe+'bson-reserve.patch'),spec.patchSha256);
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
const native=read(prior+'/native.json');assert.equal(native.status,'passed');assert.equal(native.patchSha256,spec.priorPatchSha256);
const manifest=(dir,p='')=>fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.name!=='.pc').flatMap(e=>e.isDirectory()?manifest(dir+'/'+e.name,p+e.name+'/'):[[p+e.name,e.isSymbolicLink()?'link:'+fs.readlinkSync(dir+'/'+e.name):hashfile(dir+'/'+e.name)]]).sort((a,b)=>a[0].localeCompare(b[0]));
if(mode==='prepare'){
 assert(!fs.existsSync(root+'/authenticated.json'));
 const input=root+'/input';fs.mkdirSync(input,{recursive:true});
 for(const [file,hash]of Object.entries(spec.sourceArchives)){assert.equal(hashfile(prior+'/output/'+file),hash);fs.copyFileSync(prior+'/output/'+file,input+'/'+file);}
 run('dpkg-source',['--no-check','-x',input+'/mongo-c-driver_1.30.4-1+deb13u3+utilibre1.dsc',input+'/source']);
 const source=input+'/source',before=manifest(source);
 assert.equal(hashfile(source+'/debian/patches/utilibre-CVE-2026-84964.patch'),spec.priorPatchSha256);
 run('git',['apply','--check',recipe+'bson-reserve.patch'],{cwd:source});
 run('git',['apply',recipe+'bson-reserve.patch'],{cwd:source});
 const after=manifest(source);assert.deepEqual(before.map(r=>r[0]),after.map(r=>r[0]));
 const changed=after.filter((r,i)=>r[1]!==before[i][1]);
 assert.deepEqual(changed.map(r=>r[0]),['src/libbson/doc/bson_reserve_buffer.rst','src/libbson/src/bson/bson.c','src/libbson/tests/test-bson.c']);
 fs.writeFileSync(root+'/authenticated.json',JSON.stringify({date:new Date().toISOString(),status:'passed',patchSha256:spec.patchSha256,priorNativeSha256:spec.priorNativeSha256,sourceArchives:spec.sourceArchives,changed,sourceTreeSha256:sha(JSON.stringify(after)),sourceFiles:after.length},null,2)+'\n');
 console.log('Exact prior source, all existing patches and three-file upstream delta verified.');
}else if(mode==='build'){
 const proof=read(root+'/authenticated.json');assert.equal(proof.status,'passed');assert.equal(sha(JSON.stringify(manifest(root+'/input/source'))),proof.sourceTreeSha256);
 assert(!fs.existsSync(root+'/native.json'));fs.mkdirSync(root+'/output',{recursive:true});
 const output=docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','2','--memory','1g','--pids-limit','128','--log-driver','none','--tmpfs','/work:rw,exec,size=384m','--tmpfs','/tmp:rw,size=16m','-v',root+'/input:/input:ro','-v',recipe+':/recipe:ro','-v',root+'/output:/output','--entrypoint','sh',spec.compiler,'/recipe/build-bson.sh');
 fs.writeFileSync(root+'/build.log',output+'\n');
 const library=root+'/output/'+spec.library.split('/').at(-1),old=prior+'/output/install'+spec.library;
 assert.equal(hashfile(old),spec.priorLibrarySha256);
 const symbols=p=>run('nm',['-D','--defined-only',p]).split('\n').map(l=>l.trim().split(/\s+/).slice(1).join(' ')).sort();
 assert.deepEqual(symbols(library),symbols(old));
 const dynamic=p=>run('readelf',['-d',p]).split('\n').filter(l=>/SONAME|NEEDED|BIND_NOW/.test(l)).map(l=>l.slice(l.indexOf('(')));
 assert.deepEqual(dynamic(library),dynamic(old));
 fs.copyFileSync(prior+'/output/mongo-native',root+'/output/mongo-native');
 fs.symlinkSync('libbson-1.0.so.0.0.0',root+'/output/libbson-1.0.so.0');
 fs.chmodSync(root+'/output',0o755);for(const f of ['bson-native','mongo-native'])fs.chmodSync(root+'/output/'+f,0o755);
 const results=[];
 for(const state of ['before','after']){
  const common=['run','--rm','--network','none','--read-only','--user','65534:65534','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.5','--pids-limit','32','--log-driver','none','--ulimit','core=0','-v',root+'/output:/checks:ro',...(state==='after'?['-e','LD_LIBRARY_PATH=/checks']:[])];
  const result=JSON.parse(docker(...common,'--entrypoint','/checks/bson-native',s.base,state));
  assert(result.passed&&result.normalChecks===10&&result.boundaryCases===5);assert.equal(result.undersizedRejected,state==='after');
  assert.match(docker(...common,'--entrypoint','/checks/mongo-native',s.base),/Original-header BSON\/JSON.*passed/);
  results.push({state,...result,originalHeaderConsumerPassed:true});
 }
 fs.writeFileSync(root+'/native.json',JSON.stringify({date:new Date().toISOString(),status:'passed',compiler:spec.compiler,librarySha256:hashfile(library),fixtureSha256:hashfile(root+'/output/bson-native'),patchSha256:spec.patchSha256,abiSymbols:symbols(library).length,results,sourceTreeSha256:proof.sourceTreeSha256,byteReproducibilityClaimed:false},null,2)+'\n');
 console.log('Ten legitimate checks, five old/fixed boundaries, native driver and ABI checks passed.');
}else{
 assert(!fs.existsSync(root+'/stage.json'));const n=read(root+'/native.json');assert.equal(n.status,'passed');assert.equal(hashfile(root+'/output/libbson-1.0.so.0.0.0'),n.librarySha256);
 assert.equal(docker('image','inspect','--format','{{.Id}}',s.oldRef),s.base);for(const name of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',name),s.base);
 const context=root+'/context';fs.mkdirSync(context);fs.copyFileSync(root+'/output/libbson-1.0.so.0.0.0',context+'/libbson.so');
 fs.writeFileSync(context+'/Dockerfile','FROM '+s.oldRef+'\nCOPY --chmod=644 libbson.so '+spec.library+'\n');
 docker('build','--network','none','--pull=false','-t',s.candidate,context);
 const image=docker('image','inspect','--format','{{.Id}}',s.candidate);
 assert.equal(docker('image','inspect','--format','{{json .Config}}',s.base),docker('image','inspect','--format','{{json .Config}}',image));
 fs.mkdirSync(root+'/coturn');
 const b={...s,date:new Date().toISOString(),imageId:image,passed:true,configurationUnchanged:true,changedFiles:[spec.library],librarySha256:n.librarySha256,native:{passed:true,imageId:image,...n},packageMetadataPreserved:true};
 fs.writeFileSync(root+'/coturn/build.json',JSON.stringify(b,null,2)+'\n');
 fs.writeFileSync(root+'/stage.json',JSON.stringify({date:new Date().toISOString(),status:'passed',image,candidate:s.candidate,base:s.base,configurationUnchanged:true,nativeSha256:hashfile(root+'/native.json')},null,2)+'\n');
 console.log('One-library candidate staged; full image comparison and native relay checks still required.');
}
