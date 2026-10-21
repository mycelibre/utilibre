// Existing immutable application image + native pip wheel install. No solving,
// no application startup, no writable production mounts and no runtime network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {specs,wheels,output} from './specs.mjs';
process.umask(0o077);
const selected=process.argv.slice(2);assert(selected.length&&selected.every(k=>specs.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
fs.mkdirSync(output,{recursive:true,mode:0o700});
let errorPath=output+'/error.log';
const run=(exe,args,options={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:48*1024**2,stdio:['pipe','pipe','pipe'],...options});}catch(e){fs.writeFileSync(errorPath,String(e.stdout||'')+String(e.stderr||e));throw Error('Bounded candidate operation failed; private diagnostic '+errorPath);}};
const docker=(args,options)=>run('docker',args,options);
const image=id=>JSON.parse(docker(['image','inspect',id]))[0];
const free=()=>{const s=fs.statfsSync(output);return s.bavail*s.bsize;};
for(const key of selected){
 const s=specs.find(x=>x.key===key),dir=output+'/'+key;fs.mkdirSync(dir,{recursive:true});errorPath=dir+'/error.log';
 const scratch=fs.mkdtempSync('/tmp/utilibre-certifi-');fs.chmodSync(scratch,0o755);
 const context=scratch+'/context',fixture=scratch+'/fixture';fs.mkdirSync(context);fs.mkdirSync(fixture,{mode:0o755});fs.chmodSync(fixture,0o755);
 try{
  assert(free()>8*1024**3,'8 GiB free-space safety floor');
  for(const name of s.containers)assert.equal(docker(['inspect','--format','{{.Image}}',name]).trim(),s.base,'Input changed');
  const base=image(s.base);
  const native=(id,file,args=[],mount=[])=>docker(['run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','384m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges',...mount,'--entrypoint',s.python,id,'-B','-',...args],{input:fs.readFileSync(new URL(file,import.meta.url))});
  const before=JSON.parse(native(s.base,'./check.py',[s.site,s.previous]));
  assert(before.blockedRootTrusted,'Declared vulnerable baseline no longer reproduced');
  for(const w of wheels){let bytes;const stored=output+'/'+w.file;if(fs.existsSync(stored))bytes=fs.readFileSync(stored);else{const r=await fetch(w.url,{signal:AbortSignal.timeout(30000),redirect:'error'});assert(r.ok);bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),w.sha256);fs.writeFileSync(stored,bytes);}assert.equal(sha(bytes),w.sha256);fs.writeFileSync(context+'/'+w.file,bytes,{mode:0o644});}
  const temp='/tmp/utilibre-certifi-20261021',pip=wheels[1],ca=wheels[0];
  const file=`FROM ${s.base}\n${base.Config.User?'USER 0\n':''}COPY ${ca.file} ${pip.file} ${temp}/\nRUN PYTHONPATH=${temp}/${pip.file} ${s.python} -B -m pip --isolated install --disable-pip-version-check --no-cache-dir --no-compile --no-deps --no-index --force-reinstall ${temp}/${ca.file} && rm ${temp}/${pip.file} ${temp}/${ca.file} && rmdir ${temp}\n${base.Config.User?'USER '+base.Config.User+'\n':''}`;
  fs.writeFileSync(context+'/Dockerfile',file);fs.writeFileSync(dir+'/Dockerfile',file);
  docker(['build','--network','none','--pull=false','--memory','384m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
  const next=image(s.candidate);assert.deepEqual(next.Config,base.Config,'Runtime configuration changed');
  const after=JSON.parse(native(next.Id,'./check.py',[s.site,ca.version]));
  const allowed=p=>p.startsWith(s.site+'/certifi/')||p.startsWith(s.site+'/certifi-'+s.previous+'.dist-info/')||p.startsWith(s.site+'/certifi-'+ca.version+'.dist-info/');
  const changed=[];for(const p of new Set([...Object.keys(before.files),...Object.keys(after.files)]))if(JSON.stringify(before.files[p])!==JSON.stringify(after.files[p])){assert(allowed(p),'Unrelated dependency changed: '+p);changed.push(p);}
  run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',fixture+'/key.pem','-out',fixture+'/cert.pem','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost']);
  // These are new, disposable fixture keys, never production credentials.
  for(const n of ['key.pem','cert.pem'])fs.chmodSync(fixture+'/'+n,0o644);
  const tls=JSON.parse(native(next.Id,'./tls.py',[],['--mount','type=bind,src='+fixture+',dst=/fixture,readonly']));
  fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),...s,imageId:next.Id,passed:true,deployed:false,configurationUnchanged:true,unrelatedDependencyFilesUnchanged:true,before:{version:before.version,blockedRootTrusted:before.blockedRootTrusted,caCount:before.caCount},after:{version:after.version,blockedRootTrusted:after.blockedRootTrusted,caCount:after.caCount},tls,changedFiles:changed,preManifest:sha(JSON.stringify(before.files)),postManifest:sha(JSON.stringify(after.files)),wheels},null,2)+'\n');
  console.log(JSON.stringify({key,imageId:next.Id,changedFiles:changed.length,regression:'vulnerable root present before; absent after',tls,passed:true,deployed:false}));
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
}
