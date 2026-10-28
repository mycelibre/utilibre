// Two reviewed legacy Go recipes, adapted to the existing exact-file release gate.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import path from 'node:path';
import {verifyTextDelta} from './text-policy.mjs';
process.umask(0o077);const text=process.argv.includes('--text'),services=process.argv.includes('--services');const [mode,...keys]=process.argv.slice(2).filter(a=>!['--services','--text'].includes(a));assert(['stage','proof'].includes(mode));
const root='/var/lib/utilibre-maintenance/security-20261028/'+(text?'text':services?'go-services':'go-runtime'),inputs=JSON.parse(fs.readFileSync(new URL('./'+(text?'text':services?'go-services':'go-runtime')+'-inputs.json',import.meta.url)));
const inspector='sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b';
assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(s=>s.key===k)));
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim(),sha=b=>createHash('sha256').update(b).digest('hex');
for(const key of keys){
 const s=inputs.rows.find(s=>s.key===key),dir=root+'/'+key,out=dir+'/output';
 if(mode==='stage'){
  const imageConfig=docker('image','inspect','--format','{{json .Config}}',s.base),rows=[];
  for(const target of s.binaries){
   const name=path.basename(target),cid=docker('create','--entrypoint','/bin/true',s.base);try{docker('cp',cid+':'+target,out+'/before-'+name);}finally{docker('rm',cid);}
   const info=docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','.5','--memory','128m','-v',out+':/output:ro',inspector,'go','version','-m','/output/before-'+name,'/output/'+name);
   const pair=info.split(/\n(?=\/output\/)/);assert.equal(pair.length,2);assert(pair[0].split('\n')[0].endsWith('go'+s.previousCompiler));assert(pair[1].split('\n')[0].endsWith('go'+s.compilerVersion));if(!services)assert(pair[1].includes('vcs.revision='+s.sourceRevision));assert(pair[1].includes('CGO_ENABLED='+(s.cgo?'1':'0')));
   const deps=t=>t.split('\n').map(l=>l.trim()).filter(l=>l.startsWith('dep\t')||l.startsWith('=>\t')).sort();if(text)verifyTextDelta(deps(pair[0]),deps(pair[1]));else assert.deepEqual(deps(pair[0]),deps(pair[1]),'Unreviewed module drift');
   fs.writeFileSync(dir+'/'+name+'-comparison.txt',info+'\n');rows.push({path:target,binarySha256:sha(fs.readFileSync(out+'/'+name)),unchangedModules:deps(pair[1]).length});
  }
  fs.writeFileSync(out+'/Dockerfile','FROM '+s.oldRef+'\n'+s.binaries.map(p=>'COPY --chmod=755 '+path.basename(p)+' '+p).join('\n')+'\n');
  assert.equal(docker('image','inspect','--format','{{.Id}}',s.oldRef),s.base);
  fs.writeFileSync(dir+'/stage.log',docker('build','--network','none','--pull=false','-t',s.candidate,out));
  assert.equal(docker('image','inspect','--format','{{json .Config}}',s.candidate),imageConfig);
  fs.writeFileSync(dir+'/stage.json',JSON.stringify({date:new Date().toISOString(),passed:true,key,base:s.base,candidate:s.candidate,imageId:docker('image','inspect','--format','{{.Id}}',s.candidate),configurationUnchanged:true,compilerVersion:s.compilerVersion,binaries:rows,changedFiles:[...s.binaries].sort(),sourceRevision:s.sourceRevision,...(text?{unrelatedDependenciesUnchanged:true,dependencyUpdate:{dependency:inputs.dependency,from:s.previous,to:inputs.version}}:{})},null,2)+'\n');
 }else{
  const b=JSON.parse(fs.readFileSync(dir+'/stage.json')),native=JSON.parse(fs.readFileSync(root+'/'+key+'-native.json'));assert.equal(native.status,'passed');assert.equal(native.imageId,b.imageId);assert.equal(docker('image','inspect','--format','{{.Id}}',s.candidate),b.imageId);assert(!fs.existsSync(dir+'/build.json'));if(text){const r=JSON.parse(fs.readFileSync(root+'/regression.json'));assert(r.passed&&r.before.panics>0&&r.after.panics===0&&r.after.wrongResults===0&&r.normalChecks===4);assert.equal(r.fixtureSha256,sha(fs.readFileSync(new URL('./text-native.go',import.meta.url))));}
  fs.writeFileSync(dir+'/build.json',JSON.stringify({...b,native:{...native,passed:true}},null,2)+'\n');
 }
 console.log(key+': '+mode+' passed');
}
