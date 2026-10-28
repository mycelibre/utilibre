// Same-branch compiler-only refresh of the existing five go-final recipes.
// Known application files, reviewed locks and embedded assets remain unchanged.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028/go',prior='/var/lib/utilibre-maintenance/go-final-20261011';
const here=new URL('.',import.meta.url).pathname,recipe=new URL('../go-final/',import.meta.url).pathname;
const specs=JSON.parse(fs.readFileSync(prior+'/prepare.json')).rows;
const [key,phase]=process.argv.slice(2);assert(specs.some(s=>s.key===key)&&['prepare','download','build','stage'].includes(phase));
const s=specs.find(s=>s.key===key),dir=root+'/'+key;fs.mkdirSync(dir,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f));
const run=(program,args,options={})=>{try{return cp.execFileSync(program,args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...options});}catch(e){fs.writeFileSync(dir+'/'+phase+'-error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': '+phase+' failed; private evidence retained');}};
const docker=(...a)=>run('docker',a).trim();
assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>8*1024**3);
if(phase==='prepare'){
 assert(!fs.existsSync(dir+'/inputs.json'),'Preserve completed input record');
 assert.equal(run('git',['-C',s.source,'rev-parse','HEAD']).trim(),s.commit);
 // Dockerfiles are not compiler inputs. Source's dependency files are replaced
 // with the exact already-reviewed repository locks below, never re-resolved.
 const files=s.sourceFiles.filter(f=>!['Dockerfile.utilibre','go.mod','go.sum'].includes(f.path));
 for(const f of files)assert.equal(sha(fs.readFileSync(s.source+'/'+f.path)),f.sha256,'Unsupported source change: '+f.path);
 fs.mkdirSync(dir+'/source',{recursive:true});
 for(const f of files){const to=dir+'/source/'+f.path;fs.mkdirSync(new URL('.', 'file://'+to).pathname,{recursive:true});fs.copyFileSync(s.source+'/'+f.path,to);}
 const locks={};for(const f of ['go.mod','go.sum']){const bytes=fs.readFileSync(recipe+'locks/'+key+'/'+f);locks[f]=sha(bytes);fs.writeFileSync(dir+'/source/'+f,bytes);}
 const base=docker('inspect','--format','{{.Image}}',s.container),compiler=docker('image','inspect','--format','{{.Id}}','utilibre-go-compiler:1.26.10-20261028');
 const id=docker('create','--entrypoint','/bin/true',base);try{docker('cp',id+':'+s.binary,dir+'/'+key+'-original');}finally{docker('rm',id);}
 const info=docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--memory','128m','--cpus','1','--log-driver','none','-v',dir+':/input:ro',compiler,'go','version','-m','/input/'+key+'-original');
 assert(info.split('\n')[0].endsWith('go1.26.9'),'Wrong compiler baseline');
 fs.writeFileSync(dir+'/before-buildinfo.txt',info+'\n');
 if(key==='rimgo')fs.copyFileSync(prior+'/input/rimgo-app.css',dir+'/rimgo-app.css');
 fs.writeFileSync(dir+'/inputs.json',JSON.stringify({key,container:s.container,containers:[s.container],base,candidate:'utilibre-'+key+':go12610-security-20261028',compiler,compilerVersion:'1.26.10',compilerArchive:read(root+'/../go-compiler/input.json'),sourceCommit:s.commit,sourceFiles:files,locks,binary:s.binary,oldBinarySha256:sha(fs.readFileSync(dir+'/'+key+'-original')),recipeSha256:sha(fs.readFileSync(recipe+'build.sh'))},null,2)+'\n');
 console.log(key+': exact source, locks, embedded assets and old binary captured');process.exit(0);
}
const input=read(dir+'/inputs.json');
assert.equal(sha(fs.readFileSync(recipe+'build.sh')),input.recipeSha256);
for(const f of input.sourceFiles)assert.equal(sha(fs.readFileSync(dir+'/source/'+f.path)),f.sha256);
for(const [f,h]of Object.entries(input.locks))assert.equal(sha(fs.readFileSync(dir+'/source/'+f)),h);
if(phase==='download'||phase==='build'){
 assert(!fs.existsSync(dir+'/compiled.json'),'Preserve completed compilation');
 fs.mkdirSync(root+'/modules',{recursive:true});
 // Existing tests/build targets execute offline after finite Go proxy downloads.
 const args=['run','--rm','--name','maintenance-go28-'+key,'--network',phase==='download'?'bridge':'none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','2','--memory','3g','--memory-swap','3g','--pids-limit','256','--tmpfs','/work:rw,exec,size=2g,mode=1777','--tmpfs','/tmp:rw,size=16m','-e','EXPECTED_GO=1.26.10','-e','UTILIBRE_PHASE='+phase,'-e','UTILIBRE_MODULE_CACHE=/modules','-v',root+'/modules:/modules'+(phase==='build'?':ro':''),'-v',dir+'/source:/source/'+key+':ro','-v',dir+':/input:ro','-v',dir+':/output','-v',recipe+':/recipe:ro',input.compiler,'sh','-c','cp /recipe/build.sh /work/build.sh && exec sh /work/build.sh "$1"','build',key];
 const log=run('docker',args,{timeout:1200000,maxBuffer:8*1024**2});fs.writeFileSync(dir+'/'+phase+'.log',log);
 if(phase==='build'){
  const old=fs.readFileSync(dir+'/before-buildinfo.txt','utf8'),fresh=fs.readFileSync(dir+'/'+key+'-buildinfo.txt','utf8');
  const modules=t=>t.split('\n').filter(l=>/^\s+(dep|=>)\s/.test(l)).sort();assert.deepEqual(modules(fresh),modules(old),'Unexpected dependency change');
  assert(fresh.split('\n')[0].endsWith('go1.26.10'));
  const tests=fs.readFileSync(dir+'/'+key+'-tests.txt','utf8');assert(/^ok\s/m.test(tests)&&!/(^|\n)FAIL(?:\s|$)/.test(tests));
  fs.writeFileSync(dir+'/compiled.json',JSON.stringify({...input,date:new Date().toISOString(),passed:true,network:'none',binarySha256:sha(fs.readFileSync(dir+'/'+key)),dependenciesUnchanged:true,upstreamTestsPassed:true},null,2)+'\n');
 }
 console.log(key+': '+phase+' passed');
}else{
 const b=read(dir+'/compiled.json');assert(b.passed&&sha(fs.readFileSync(dir+'/'+key))===b.binarySha256);assert(!fs.existsSync(dir+'/build.json'));
 const config=id=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',id));
 const stage=dir+'/image';fs.mkdirSync(stage,{recursive:true});fs.copyFileSync(dir+'/'+key,stage+'/binary');fs.chmodSync(stage+'/binary',0o755);
 fs.writeFileSync(stage+'/Dockerfile',`FROM ${input.base}\nCOPY binary ${input.binary}\n`);
 run('docker',['build','--network','none','--pull=false','-t',input.candidate,stage],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker('image','inspect','--format','{{.Id}}',input.candidate);assert.deepEqual(config(imageId),config(input.base));
 fs.writeFileSync(dir+'/build.json',JSON.stringify({...b,imageId,configurationUnchanged:true,deployed:false},null,2)+'\n');console.log(key+': staged '+imageId);
}
