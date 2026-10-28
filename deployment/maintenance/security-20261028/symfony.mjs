// Exact two-service upstream source backports. No resolver, migration or live writes.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const input=JSON.parse(fs.readFileSync(new URL('./symfony-inputs.json',import.meta.url))),keys=process.argv.slice(2),root='/var/lib/utilibre-maintenance/security-20261028/symfony';
assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>input.rows.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const key of keys){
 const s=input.rows.find(s=>s.key===key),dir=root+'/'+key;fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'));
 const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error(key+': isolated candidate failed; see private evidence');}},docker=(...a)=>run('docker',a);
 const native=(id,state)=>JSON.parse(run('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','192m','--cpus','1','--pids-limit','32','--log-driver','none','-v',new URL('./symfony-check.php',import.meta.url).pathname+':/check:ro','--entrypoint','php',id,'-d','memory_limit=128M','/check',state,key]));
 for(const name of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',name),s.base);
 assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>=8*1024**3);
 const baseline=native(s.base,'baseline'),work=fs.mkdtempSync('/tmp/utilibre-symfony-');
 try{
  const old=JSON.parse(docker('image','inspect',s.base))[0],c=docker('create','--entrypoint','/bin/true',s.base);
  try{for(const f of s.files){fs.mkdirSync(work+'/'+f.path.split('/').slice(0,-1).join('/'),{recursive:true});docker('cp',c+':'+s.site+'/'+f.path,work+'/'+f.path);assert.equal(sha(fs.readFileSync(work+'/'+f.path)),f.beforeSha256);}}
  finally{docker('rm',c);}
  for(const file of s.patches){const p=input.patches.find(p=>p.file===file),bytes=fs.readFileSync(new URL('./'+file,import.meta.url));assert.equal(sha(bytes),p.sha256);fs.writeFileSync(work+'/'+file,bytes);run('git',['apply','--check',file],{cwd:work});run('git',['apply',file],{cwd:work});}
  assert(/^[A-Za-z0-9_:.-]*$/.test(old.Config.User||''));let recipe=`FROM ${s.base}\nUSER 0\n`;
  for(const f of s.files){assert.equal(sha(fs.readFileSync(work+'/'+f.path)),f.afterSha256);fs.chmodSync(work+'/'+f.path,0o644);recipe+=`COPY ${f.path} ${s.site}/${f.path}\n`;}
  recipe+=`USER ${old.Config.User||'0'}\n`;fs.writeFileSync(work+'/Dockerfile',recipe);fs.writeFileSync(dir+'/Dockerfile',recipe);
  run('docker',['build','--network','none','--pull=false','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,work],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
  const next=JSON.parse(docker('image','inspect',s.candidate))[0];assert.deepEqual(next.Config,old.Config);const n=native(next.Id,'fixed');
  fs.writeFileSync(dir+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),imageId:next.Id,passed:true,configurationUnchanged:true,changedFiles:s.files.map(f=>s.site+'/'+f.path).sort(),baseline,native:n,deployed:false},null,2)+'\n');
  console.log(key+': exact upstream header/YAML checks passed; full-image and application gates still required');
 }finally{fs.rmSync(work,{recursive:true});}
}
