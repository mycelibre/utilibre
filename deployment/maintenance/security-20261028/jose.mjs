// Finite JOSE update adapter: reuse the existing native build recipes and gates.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import path from 'node:path';import {verifyModuleDelta} from './jose-policy.mjs';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/jose';
const inputs=JSON.parse(fs.readFileSync(here+'jose-inputs.json')),read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const [phase,...keys]=process.argv.slice(2);assert(['locks','download','build','stage','proof'].includes(phase));assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(s=>s.key===k)));
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const compiler=s=>s.key==='yopass'?'golang:1.27.3-bookworm@sha256:e482b31b5d30c31f9e495f4b8cbdf41429b2d74955dfbcd9c0a904483d738390':'sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b';
for(const key of keys){const s=inputs.rows.find(s=>s.key===key),dir=root+'/'+key,locks=here+'locks/jose/'+key,out=dir+'/output';fs.mkdirSync(out,{recursive:true});fs.mkdirSync(dir+'/cache',{recursive:true});
 assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>8*1024**3);assert.equal(docker('image','inspect','--format','{{.Id}}',s.oldRef),s.base);
 if(s.sourceArchive)assert.equal(sha(fs.readFileSync(s.sourceArchive)),s.sourceArchiveSha256);
 else{const mf='/var/lib/utilibre-maintenance/go-leaf-final-20261011/output/'+key+'-source-files.json';assert.equal(sha(fs.readFileSync(mf)),s.sourceManifestSha256);const m=read(mf);assert.equal(m.commit,s.sourceRevision);for(const f of m.files){assert(!path.isAbsolute(f.path)&&!f.path.split('/').includes('..'));const dest=dir+'/source/'+f.path;fs.mkdirSync(path.dirname(dest),{recursive:true});if(f.symlink){assert.equal(fs.readlinkSync(s.source+'/'+f.path),f.symlink);assert(!path.isAbsolute(f.symlink)&&path.resolve(path.dirname(dest),f.symlink).startsWith(dir+'/source/'));if(!fs.existsSync(dest))fs.symlinkSync(f.symlink,dest);}else{const bytes=fs.readFileSync(s.source+'/'+f.path);assert.equal(sha(bytes),f.sha256,'Source drift '+f.path);if(fs.existsSync(dest))assert.equal(sha(fs.readFileSync(dest)),f.sha256);else fs.writeFileSync(dest,bytes,{mode:f.executable?0o755:0o644});}}}
 if(phase==='locks'){
  assert(!fs.existsSync(locks+'/manifest.json'),'Preserve approved locks');fs.mkdirSync(locks,{recursive:true});
  let originals;
  if(s.sourceArchive)originals=Object.fromEntries(['go.mod','go.sum'].map(f=>[f,cp.execFileSync('tar',['-xOf',s.sourceArchive,f],{encoding:'utf8'})]));
  else originals=Object.fromEntries(['go.mod','go.sum'].map(f=>[f,fs.readFileSync(here+'../go-leaf-final/locks/'+key+'/'+f,'utf8')]));
  for(const [f,t]of Object.entries(originals))fs.writeFileSync(dir+'/'+f+'.before',t);
  assert.equal(originals['go.mod'].split('github.com/go-jose/go-jose/v4 '+s.previousJose).length,2);
  fs.writeFileSync(locks+'/go.mod',originals['go.mod'].replace('github.com/go-jose/go-jose/v4 '+s.previousJose,'github.com/go-jose/go-jose/v4 v4.1.6'));fs.writeFileSync(locks+'/go.sum',originals['go.sum']);
  const json=docker('run','--rm','--network','bridge','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,size=32m','-e','GOPATH=/tmp/gopath','-e','GOTOOLCHAIN=local','-e','GOTELEMETRY=off','-e','GOMODCACHE=/cache','-v',dir+'/cache:/cache',compiler(s),'go','mod','download','-json','github.com/go-jose/go-jose/v4@v4.1.6');
  const m=JSON.parse(json);assert.equal(m.Version,'v4.1.6');assert.equal(sha(fs.readFileSync(dir+'/cache/cache/download/github.com/go-jose/go-jose/v4/@v/v4.1.6.zip')),inputs.releaseZipSha256);
  const sum=originals['go.sum'].trimEnd()+'\ngithub.com/go-jose/go-jose/v4 v4.1.6 '+m.Sum+'\ngithub.com/go-jose/go-jose/v4 v4.1.6/go.mod '+m.GoModSum+'\n';fs.writeFileSync(locks+'/go.sum',sum);
  fs.writeFileSync(locks+'/manifest.json',JSON.stringify({key,dependency:'github.com/go-jose/go-jose/v4',from:s.previousJose,to:'v4.1.6',files:['go.mod','go.sum'].map(f=>({path:f,before:sha(originals[f]),after:sha(fs.readFileSync(locks+'/'+f))})),zipSha256:inputs.releaseZipSha256,moduleSum:m.Sum,moduleModSum:m.GoModSum},null,2)+'\n');console.log(key+': exact single-module locks recorded');continue;
 }
 const lock=read(locks+'/manifest.json');for(const f of lock.files){assert.equal(sha(fs.readFileSync(locks+'/'+f.path)),f.after);assert.equal(sha(fs.readFileSync(dir+'/'+f.path+'.before')),f.before);}
 if(['download','build'].includes(phase)){
  assert(!fs.existsSync(out+'/completed.json'),'Preserve completed build');const baseArgs=['run','--rm','--name','maintenance-jose-'+key,'--network',phase==='download'?'bridge':'none','--read-only','--cpus','2','--memory','5g','--memory-swap','5g','--pids-limit','256','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=4g','--tmpfs','/tmp:rw,exec,size=64m','-e','GOPATH=/work/gopath','-e','EXPECTED_GO=1.27.3','-e','UTILIBRE_JOSE_LOCKS=/jose-locks','-e','GO_PHASE='+phase,'-e','UTILIBRE_PHASE='+phase,'-e','PHASE='+phase,'-e','MODULE_CACHE=/modules','-v',dir+'/cache:/modules'+(phase==='build'?':ro':''),'-v',locks+':/jose-locks:ro','-v',out+':/output'];
  let script;
  if(key==='yopass'){baseArgs.push('-v','/opt/utilibre/community-src/yopass:/source-git:ro','-v','/var/lib/utilibre-maintenance/go-runtime-20261011/input:/input:ro','-v',here+'../go-runtime-20261011:/recipe:ro');script='/recipe/build-yopass.sh';}
  else if(key==='donetick'){baseArgs.push('-e','SOURCE_SHA='+s.sourceArchiveSha256,'-v','/var/lib/utilibre-maintenance/security-20261028/go-services/donetick:/input:ro','-v',here+':/recipe:ro');script='/recipe/build-go-services.sh';}
  else{baseArgs.push('-v',dir+'/source:/source:ro','-v','/var/lib/utilibre-maintenance/go-leaf-final-20261011/input/'+key+'-embed:/assets:ro','-v',here+'../go-leaf-final:/scripts:ro');script='/scripts/build-one.sh';}
  baseArgs.push(compiler(s),'sh',script,...(key==='yopass'?[]:[key]));const fd=fs.openSync(dir+'/'+phase+'.log','a',0o600),r=cp.spawnSync('docker',baseArgs,{stdio:['ignore',fd,fd],timeout:1800000});fs.closeSync(fd);assert.equal(r.status,0,key+': '+phase+' failed; private evidence retained');
  if(phase==='build')fs.writeFileSync(out+'/completed.json',JSON.stringify({date:new Date().toISOString(),sourceRevision:s.sourceRevision,locks:lock.files,compiler:compiler(s)}));console.log(key+': '+phase+' passed');continue;
 }
 if(phase==='stage'){
  assert(!fs.existsSync(dir+'/stage.json'));const rows=[];
  for(const target of s.binaries){const name=path.basename(target),cid=docker('create','--entrypoint','/bin/true',s.base);try{docker('cp',cid+':'+target,out+'/before-'+name);}finally{docker('rm',cid);}
   const info=docker('run','--rm','--network','none','--read-only','--memory','128m','--cpus','1','--log-driver','none','-v',out+':/output:ro',compiler(s),'go','version','-m','/output/before-'+name,'/output/'+name);const pair=info.split(/\n(?=\/output\/)/);assert.equal(pair.length,2);assert(pair.every(x=>x.split('\n')[0].endsWith('go1.27.3')));assert(pair[1].includes('CGO_ENABLED='+(s.cgo?'1':'0')));
   const deps=t=>t.split('\n').map(x=>x.trim()).filter(x=>x.startsWith('dep\t')||x.startsWith('=>\t')).sort();const old=deps(pair[0]),next=deps(pair[1]);verifyModuleDelta(old,next,s.previousJose,lock.moduleSum);
   const code=fs.readFileSync(out+'/'+name);rows.push({path:target,binarySha256:sha(code),unchangedModules:old.filter(x=>!x.includes('github.com/go-jose/go-jose/v4')).length,updatedModules:old.some(x=>x.includes('github.com/go-jose/go-jose/v4'))?1:0});fs.writeFileSync(dir+'/'+name+'-comparison.txt',info+'\n');
  }
  fs.writeFileSync(out+'/Dockerfile','FROM '+s.oldRef+'\n'+s.binaries.map(p=>'COPY --chmod=755 '+path.basename(p)+' '+p).join('\n')+'\n');fs.writeFileSync(dir+'/stage.log',docker('build','--network','none','--pull=false','-t',s.candidate,out));const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.equal(docker('image','inspect','--format','{{json .Config}}',s.candidate),docker('image','inspect','--format','{{json .Config}}',s.base));
  fs.writeFileSync(dir+'/stage.json',JSON.stringify({passed:true,date:new Date().toISOString(),key,base:s.base,candidate:s.candidate,imageId,configurationUnchanged:true,compilerVersion:s.compilerVersion,binaries:rows,changedFiles:[...s.binaries].sort(),sourceRevision:s.sourceRevision,dependencyUpdate:lock},null,2)+'\n');fs.writeFileSync(out+'/'+key+'-image.json',JSON.stringify({imageId}));console.log(key+': candidate staged; only reviewed JOSE dependency changed');continue;
 }
 const nativePath=key==='ntfy'?out+'/ntfy-native.json':key==='vikunja'?dir+'/native.json':root+'/'+key+'-native.json';
 const b=read(dir+'/stage.json'),native=read(nativePath),regression=read(root+'/regression.json');assert(native.passed||native.status==='passed');assert.equal(native.imageId,b.imageId);assert.equal(docker('image','inspect','--format','{{.Id}}',s.candidate),b.imageId);assert(regression.passed&&regression.version==='v4.1.6'&&regression.fixtureSha256===sha(fs.readFileSync(here+'jose-regression_test.go')));assert.equal(regression.rows.find(r=>r.version==='v4.1.6').archiveSha256,inputs.releaseZipSha256);if(nativePath!==dir+'/native.json')fs.writeFileSync(dir+'/native.json',JSON.stringify({...native,passed:true},null,2)+'\n');assert(!fs.existsSync(dir+'/build.json'));
 if(['ntfy','vikunja'].includes(key)){const assets=read(out+'/'+key+'-assets.json');assert(assets.passed&&assets.binarySha256===b.binaries[0].binarySha256);}
 if(key==='donetick')assert(read(dir+'/assets.json').passed);
 fs.writeFileSync(dir+'/build.json',JSON.stringify({...b,native:{...native,passed:true},regression},null,2)+'\n');console.log(key+': native workflow and regression gates passed');
}
