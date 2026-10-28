// Finite adapter for the existing Rimgo/FerretDB builds and native tests.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {verifyCodecDelta} from './codec-policy.mjs';
process.umask(0o077);const [phase,key]=process.argv.slice(2);assert(['stage','proof'].includes(phase)&&['rimgo','ferretdb','gothub','anonymousoverflow'].includes(key));const reader=['gothub','anonymousoverflow'].includes(key);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/codec',dir=root+'/'+key,read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=read(here+'codec-inputs.json'),s=inputs.rows.find(s=>s.key===key),compiler='sha256:5bba7feafd0a05a85a6454714b44e5909beebda3dfda1018bb0f4fd5acc66d1f';
const run=(p,a,opts={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...opts}).trim(),docker=(...a)=>run('docker',a);
assert.equal(docker('image','inspect','--format','{{.Id}}',s.oldRef),s.base);
for(const [f,h] of Object.entries(s.locks))assert.equal(sha(fs.readFileSync(here+'locks/codec/'+key+'/'+f)),h);
if(phase==='stage'){
 assert.equal(key,'ferretdb');assert(!fs.existsSync(dir+'/stage.json'),'Preserve completed stage');
 const build=read(dir+'/build.json');assert(build.status==='passed'&&build.phase==='build'&&build.network==='none'&&build.compiler===compiler);
 for(const f of ['ferretdb','ferretdb-go.mod','ferretdb-go.sum'])assert.equal(sha(fs.readFileSync(dir+'/'+f)),build.artifacts[f]);
 for(const f of ['go.mod','go.sum'])assert.equal(sha(fs.readFileSync(dir+'/ferretdb-'+f)),s.locks[f]);
 fs.copyFileSync(dir+'/build.json',dir+'/compiler-build.json');
 const id=docker('create','--entrypoint','/bin/true',s.base);try{docker('cp',id+':'+s.binary,dir+'/original');}finally{docker('rm',id);}
 const info=docker('run','--rm','--network','none','--read-only','--memory','128m','--cpus','1','--log-driver','none','-v',dir+':/input:ro',compiler,'go','version','-m','/input/original','/input/ferretdb');
 const pair=info.split(/\n(?=\/input\/)/);assert.equal(pair.length,2);assert(pair.every(t=>t.split('\n')[0].endsWith('go1.26.10')));
 const deps=t=>t.split('\n').map(l=>l.trim()).filter(l=>l.startsWith('dep\t')||l.startsWith('=>\t'));verifyCodecDelta(deps(pair[0]),deps(pair[1]),s.previous,inputs.moduleSum);
 fs.writeFileSync(dir+'/buildinfo-comparison.txt',info+'\n');
 const stage=dir+'/image';fs.mkdirSync(stage,{recursive:true});fs.copyFileSync(dir+'/ferretdb',stage+'/ferretdb');fs.chmodSync(stage+'/ferretdb',0o755);fs.writeFileSync(stage+'/Dockerfile','FROM '+s.oldRef+'\nCOPY ferretdb /ferretdb\n');
 fs.writeFileSync(dir+'/stage.log',run('docker',['build','--network','none','--pull=false','-t',s.candidate,stage],{env:{...process.env,DOCKER_BUILDKIT:'0'}}));
 const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.equal(docker('image','inspect','--format','{{json .Config}}',imageId),docker('image','inspect','--format','{{json .Config}}',s.base));
 const staged={date:new Date().toISOString(),key,base:s.base,candidate:s.candidate,imageId,passed:true,compilerVersion:s.compilerVersion,configurationUnchanged:true,unrelatedDependenciesUnchanged:true,dependencyUpdate:{dependency:inputs.dependency,from:s.previous,to:inputs.version},binarySha256:sha(fs.readFileSync(dir+'/ferretdb')),upstreamTestsPassed:true};
 fs.writeFileSync(dir+'/stage.json',JSON.stringify(staged,null,2)+'\n');console.log(key+': exact single-dependency candidate staged');
}else{
 const b=read(dir+(key==='ferretdb'?'/stage.json':'/build.json')),native=key==='ferretdb'?read(dir+'/native.json'):read(root+(reader?'/native-gothub-anonymousoverflow.json':'/native.json')).rows.find(r=>r.key===key),regression=read(root+'/'+(s.regressionFile||(key==='ferretdb'?'regression-ferretdb.json':'regression.json')));
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedDependenciesUnchanged&&regression.passed);assert.equal(b.base,s.base);assert.equal(b.imageId,docker('image','inspect','--format','{{.Id}}',s.candidate));assert(native.passed||native.status==='passed');assert.equal(native.imageId,b.imageId);assert.equal(regression.fixtureSha256,sha(fs.readFileSync(here+'codec-native.go')));
 if(key==='ferretdb')for(const k of ['nativeGathioCreateEdit','invalidEditTokenDenied','imageUpload','icsImportExport','stoppedDatabaseCopyRestore','reopenedOriginalAndImportedEvents'])assert.equal(native[k],true);
 else assert(native.responses.length===(key==='gothub'?3:key==='anonymousoverflow'?1:4)&&native.responses.every(r=>r.status===200));
 const info=fs.readFileSync(dir+'/'+key+'-buildinfo.txt','utf8'),modules=info.split('\n').filter(l=>/^\s+dep\s/.test(l));assert(modules.length>10);
 fs.writeFileSync(dir+'/build.json',JSON.stringify({...b,native:{...native,passed:true},regression,changedFiles:[s.binary],binaries:[{path:s.binary,binarySha256:b.binarySha256,unchangedModules:modules.length-1,updatedModules:1}]},null,2)+'\n');console.log(key+': native consumer and both library regressions passed');
}
