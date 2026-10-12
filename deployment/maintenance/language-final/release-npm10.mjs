// Four bounded image-only releases, with exact-byte evidence and rollback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {replaceImagePins,namespaceDependents,readinessSeconds,releaseGroup} from './release.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/npm10-final-20261011',file=dir+'/release.json';fs.mkdirSync(dir,{recursive:true});
const specs=JSON.parse(fs.readFileSync(new URL('./npm10-images.json',import.meta.url)));
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}});}catch{throw Error('Bounded Docker operation failed; sensitive output withheld.');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0];
const compose=g=>['compose','--profile','*','--project-directory',g.cwd,...(g.project==='utilibre-community'?['--env-file',g.cwd+'/.env.rallly']:[]),'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services[g.service];
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=s=>{const {image,...rest}=s;return createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex');};
async function publicStatus(g){const r=await fetch(g.url,{redirect:'manual',signal:AbortSignal.timeout(15000)});await r.body?.cancel();return r.status;}
function repin(g,from,to){let n=0;for(const f of g.files){const out=replaceImagePins(fs.readFileSync(f,'utf8'),[{from,to}]);if(out.replaced){fs.writeFileSync(f,out.text);n+=out.replaced;}}assert(n>=1);}
function tunnelUnused(g){
 if(g.key!=='kuma-npm10')return;
 const x=inspect(g.name);assert(!x.Config.Env.some(e=>/^CLOUDFLARED_TOKEN=.+/.test(e)));assert(!JSON.stringify(x.Config.Cmd).includes('cloudflared'));
 // Boolean only: never print stored token or inspect monitor/user activity.
 docker('exec',g.name,'node','-e',"const d=require('/app/node_modules/@louislam/sqlite3');const db=new d.Database('/app/data/kuma.db',d.OPEN_READONLY);db.get(\"SELECT value FROM setting WHERE key='cloudflaredTunnelToken'\",(e,r)=>{if(e)process.exitCode=1;else if(r&&r.value&&!['null','\\\"\\\"',''].includes(r.value))process.exitCode=1;db.close()})");
 assert(!docker('top',g.name,'-eo','pid,comm').split('\n').some(s=>s.trim().split(/\s+/).at(-1)==='cloudflared'));
}
async function gate(g,version){
 const max=readinessSeconds([inspect(g.name)]);let ready=false;
 for(let i=0;i<max;i++){const x=inspect(g.name);if(x.Image===g[version+'Image']&&x.State.Running&&x.State.Health?.Status==='healthy'&&x.RestartCount===0){ready=true;break;}await new Promise(r=>setTimeout(r,1000));}assert(ready,g.name+' native health');
 assert.equal(await publicStatus(g),g.publicStatus);
 if(g.key==='projects-npm10')cp.execFileSync('systemctl',['is-active','--quiet','utilibre-projects-firewall.service']);
 if(g.key==='kuma-npm10'){
  if(version==='new')docker('exec',g.name,'test','!','-e','/usr/bin/cloudflared');
  for(const pathname of ['/dashboard','/setup','/socket.io/'])assert.equal(await publicStatus({url:'https://status.utilibre.org'+pathname}),404,'Public administration boundary');
 }
 if(g.key==='gathio-npm10'&&version==='new')cp.execFileSync(process.execPath,['deployment/maintenance/check-gathio-live.mjs'],{timeout:60000,stdio:['ignore','pipe','pipe']});
}
const mode=process.argv[2];assert(['prepare','apply'].includes(mode));
if(mode==='prepare'){
 const native=JSON.parse(fs.readFileSync(dir+'/native.json'));assert.equal(native.status,'passed');assert(Date.now()-Date.parse(native.completedAt)<86400000);
 const groups=[];
 for(const s of specs){const name=s.containers[0],x=inspect(name),l=x.Config.Labels,candidate=inspect(s.candidate);assert.equal(x.Image,s.baseId);assert.equal(x.State.Health?.Status,'healthy');
  const proof=native.rows.find(r=>r.key===s.key&&r.imageId===candidate.Id&&r.status==='passed');assert(proof);
  const g={key:s.key,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),service:l['com.docker.compose.service'],name,oldRef:s.base,oldImage:s.baseId,newRef:s.candidate,newImage:candidate.Id,status:'prepared',url:s.url};
  assert.equal(config(g).image,g.oldRef);g.configHash=hash(config(g));g.publicStatus=await publicStatus(g);assert([200,301,302,303,307,308].includes(g.publicStatus));tunnelUnused(g);groups.push(g);
 }
 const containers=JSON.parse(docker('inspect',...docker('ps','-q').trim().split('\n')));assert.deepEqual(namespaceDependents(containers,new Set(groups.map(g=>g.name))),[]);
 fs.writeFileSync(file,JSON.stringify({status:'prepared',date:new Date().toISOString(),groups},null,2)+'\n');console.log('Four native-verified candidates prepared; production unchanged.');
}else{
 const r=JSON.parse(fs.readFileSync(file));assert(Date.now()-Date.parse(r.date)<86400000);assert.equal(r.groups.length,4);assert(['prepared','applying'].includes(r.status));const save=()=>fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');r.status='applying';save();
 for(const g of r.groups){const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>=8*1024**3);if(g.status==='passed'){await gate(g,'new');continue;}
  const validate=()=>{assert.equal(inspect(g.oldRef).Id,g.oldImage);assert.equal(inspect(g.newRef).Id,g.newImage);assert.equal(hash(config(g)),g.configHash);assert([g.oldRef,g.newRef].includes(config(g).image));};let rollback=false;
  await releaseGroup(g,{preflight:()=>{validate();assert.equal(inspect(g.name).Image,g.oldImage);assert.equal(config(g).image,g.oldRef);tunnelUnused(g);},save,recreate:()=>{validate();if(!rollback)repin(g,g.oldRef,g.newRef);assert.equal(config(g).image,rollback?g.oldRef:g.newRef);docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',g.service);},gate:v=>gate(g,v),rollbackPins:()=>{rollback=true;validate();repin(g,g.newRef,g.oldRef);}});
  console.log(g.key+': deployed/native health/public route passed');
 }
 r.status='passed';r.completedAt=new Date().toISOString();save();
}
