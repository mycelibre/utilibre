// Exact-image native maintenance release; never logs private config or user rows.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,statfsSync} from 'node:fs';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
import {followupInputModule} from './penpot-followup-policy.mjs';
import {refreshStaticUpstreams} from '../xlib-followup/policy.mjs';
process.umask(0o077);
assert(process.argv.length<=4);
const selected=followupInputModule(process.argv[3]),followup=selected!==null;
const {inputs:nativeInputs,liveNative,directory:followupDirectory}=followup?await import(selected):{};
const directory=followup?followupDirectory:'/var/lib/utilibre-maintenance/native-final',receipt=directory+'/penpot-release.json';
const cwd='/home/ubuntu/freetools/deployment/expanded';
const compose=['compose','--env-file',cwd+'/.env','--project-directory',cwd,'-p','utilibre-expanded','-f',cwd+'/compose.yaml'];
const command=(name,args,options={})=>{try{return execFileSync(name,args,{encoding:'utf8',timeout:120000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...options});}catch{throw Error('Bounded maintenance command failed; private output withheld.');}};
const docker=(...args)=>command('docker',args);
const inspect=name=>JSON.parse(docker('inspect',name))[0];
const config=()=>JSON.parse(docker(...compose,'config','--format','json')).services;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalized=value=>{const{image,...rest}=value;return hash(rest);};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const candidates=followup?nativeInputs():JSON.parse(readFileSync(directory+'/penpot-libxml.json'));
assert.equal(candidates.status,'passed');assert.equal(candidates.fullApplicationGate?.status,'passed');
async function ready(attempts=90){
 for(let n=0;n<attempts;n++){
  try{
   assert.equal(docker('exec','utilibre-expanded-penpot-exporter-1','node','-e',`Promise.all(['http://127.0.0.1:6061/readyz','http://penpot-backend:6060/readyz'].map(async u=>{if(!(await fetch(u,{signal:AbortSignal.timeout(4000)})).ok)throw Error('not-ready')})).then(()=>console.log('ready')).catch(()=>process.exit(1))`).trim(),'ready');
   const response=await fetch('http://10.10.1.43:3131/readyz',{signal:AbortSignal.timeout(5000)});await response.body?.cancel();assert.equal(response.status,200);return;
  }catch{if(n===attempts-1)throw Error('Penpot native readiness failed');await delay(1000);}
 }
}
async function publicGate(){
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({locale:'en-US'}),page=await context.newPage(),origins=new Set(),errors=[];
  page.on('pageerror',()=>errors.push('script error'));
  page.on('request',r=>{const u=new URL(r.url());if(['http:','https:','ws:','wss:'].includes(u.protocol))origins.add(u.origin);});
  const response=await page.goto('https://design.utilibre.org/',{waitUntil:'networkidle',timeout:45000});assert.equal(response.status(),200);
  await page.getByRole('heading',{name:'Log into my account',exact:true}).waitFor({state:'visible',timeout:30000});
  assert.deepEqual([...origins],['https://design.utilibre.org']);
  await Promise.all([page.waitForURL(u=>u.origin==='https://auth.utilibre.org',{timeout:30000}),page.getByText('Utilibre',{exact:true}).click()]);
  await page.locator('input[autocomplete="username"]:visible').first().waitFor({state:'visible',timeout:30000});
  assert.deepEqual([...origins].sort(),['https://auth.utilibre.org','https://design.utilibre.org']);assert.equal(errors.length,0);
  return {status:'passed',nativeLoginVisible:true,oidcStart:true,requestOrigins:[...origins].sort(),credentialsSubmitted:false};
 }finally{await browser.close();}
}
function toFile(path,name,args){const fd=openSync(path,'wx',0o600);try{command(name,args,{stdio:['ignore',fd,'pipe']});}finally{closeSync(fd);}}
async function snapshot(){
 const target='/opt/utilibre/expanded-backups/'+new Date().toISOString().replace(/[:.]/g,'-');mkdirSync(target,{mode:0o700});
 const paused=['penpot-backend','penpot-admin-console','penpot-exporter'];
 assert(paused.every(s=>inspect('utilibre-expanded-'+s+'-1').State.Running));
 try{
  docker(...compose,'stop','-t','30',...paused);
  toFile(target+'/penpot.dump','docker',[...compose,'exec','-T','penpot-db','pg_dump','-U','penpot','-d','penpot','-Fc']);
  toFile(target+'/files.tar.gz','tar',['-C','/opt/utilibre/expanded-data','-czf','-','penpot-assets']);
  toFile(target+'/private-config.tar.gz','tar',['-C',cwd,'-czf','-','.env']);
  writeFileSync(target+'/SHA256SUMS',command('sha256sum',['penpot.dump','files.tar.gz','private-config.tar.gz'],{cwd:target}));
 }finally{docker(...compose,'start',...paused);refreshStaticUpstreams('expanded',docker);}
 await ready();
 command('sha256sum',['--check','SHA256SUMS'],{cwd:target});command('tar',['-tzf',target+'/files.tar.gz']);
 const database=inspect('utilibre-expanded-penpot-db-1'),name='maintenance-penpot-restore-'+process.pid;
 let created=false;
 try{
  docker('run','-d','--name',name,'--network','none','--memory','512m','--cpus','1','--pids-limit','128','--log-driver','none','--user','70:70','--security-opt','no-new-privileges:true','--tmpfs','/var/lib/postgresql/data:rw,nosuid,nodev,size=256m,uid=70,gid=70','--tmpfs','/var/run/postgresql:rw,nosuid,nodev,size=8m,uid=70,gid=70','-e','POSTGRES_HOST_AUTH_METHOD=trust',database.Image);created=true;
  let up=false;for(let n=0;n<40;n++){try{docker('exec',name,'pg_isready','-U','postgres');up=true;break;}catch{}await delay(500);}assert(up,'Restore PostgreSQL readiness');
  docker('exec',name,'createdb','-U','postgres','penpot');
  const fd=openSync(target+'/penpot.dump','r');try{command('docker',['exec','-i',name,'pg_restore','-U','postgres','-d','penpot','--no-owner','--no-acl','--exit-on-error'],{stdio:[fd,'pipe','pipe']});}finally{closeSync(fd);}
  assert(Number(docker('exec',name,'psql','-U','postgres','-d','penpot','-Atc',"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"))>0);
  writeFileSync(target+'/RESTORE-VERIFIED.txt',new Date().toISOString()+'\nPenpot-only native PostgreSQL restore and archive integrity passed. Asset archive was not restored into a live application. On-host recovery snapshot, not an off-host backup.\n');
 }finally{if(created)docker('rm','-f',name);}
 return {path:target,nativeDatabaseRestore:true,archiveIntegrity:true,offHost:false};
}
if(process.argv[2]==='prepare'){
 const space=statfsSync(directory);assert(space.bavail*space.bsize>8*1024**3);
 const c=config(),rows=[];
 for(const component of ['backend','exporter']){
  const service='penpot-'+component,name='utilibre-expanded-'+service+'-1',live=inspect(name),candidate=candidates[component];
  assert(live.State.Running);assert.equal(live.Config.Image,c[service].image);assert.equal(inspect(candidate.image).Id,candidate.imageId);
  if(followup){assert.equal(live.Image,candidates.originals[component].imageId);assert.equal(live.Config.Image,candidates.originals[component].image);}
  rows.push({name,service,oldRef:live.Config.Image,oldImage:live.Image,newRef:candidate.image,newImage:candidate.imageId,configHash:normalized(c[service])});
 }
 const untouched=['penpot-frontend','penpot-admin-console'].map(service=>{const x=inspect('utilibre-expanded-'+service+'-1');return{service,image:x.Image,containerId:x.Id,configHash:hash(c[service])};});
 await ready();const beforePublic=await publicGate();const backup=await snapshot();
 writeFileSync(receipt,JSON.stringify({date:new Date().toISOString(),status:'prepared',rows,untouched,backup,beforePublic,...(followup?{evidence:candidates.evidence}:{})},null,2)+'\n');
 console.log('Penpot-only consistency snapshot and isolated native restore passed; exact image release prepared.');
}else if(process.argv[2]==='apply'){
 const report=JSON.parse(readFileSync(receipt));assert.equal(report.status,'prepared');assert(Date.now()-Date.parse(report.date)<3600000);
 if(followup)assert.deepEqual(report.evidence,candidates.evidence);
 const save=()=>writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');report.status='applying';save();
 try{
  for(const row of report.rows){
   const c=config();assert.equal(c[row.service].image,row.newRef);assert.equal(normalized(c[row.service]),row.configHash);assert.equal(inspect(row.newRef).Id,row.newImage);
   for(const u of report.untouched){const x=inspect('utilibre-expanded-'+u.service+'-1');assert.equal(x.Id,u.containerId);assert.equal(x.Image,u.image);assert.equal(hash(c[u.service]),u.configHash);}
   await releaseReviewedRow(row,inspect(row.name).Image,{save,delay:()=>delay(2000),inspect:async name=>{
    const x=inspect(name);
    if(name===row.name&&x.State?.Running){try{await ready(1);x.State.Health={Status:'healthy'};}catch{x.State.Health={Status:'starting'};}}
    return x;
   },start:()=>{docker(...compose,'up','-d','--no-deps','--no-build','--pull','never',row.service);refreshStaticUpstreams('expanded',docker);},rollback:()=>{
    const path=directory+'/penpot-rollback-'+row.service+'.json';writeFileSync(path,JSON.stringify({services:{[row.service]:{image:row.oldRef}}}));
    docker(...compose,'-f',path,'up','-d','--no-deps','--no-build','--pull','never',row.service);
    refreshStaticUpstreams('expanded',docker);
   }});
  }
  for(const row of report.rows){
   if(followup)liveNative(docker,row.name);
   assert.equal(docker('exec',row.name,'dpkg-query','-W','-f','${Version}','libxml2'),'2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1');
   docker('exec',row.name,'cmp','/usr/lib/x86_64-linux-gnu/libxml2.so.2','/opt/imagick/lib/deps/libxml2.so.2');
  }
  report.public=await publicGate();report.status='passed';report.completedAt=new Date().toISOString();
  if(followup)report.groups=[{status:'passed',completedAt:report.completedAt,rows:report.rows}];
  save();console.log('Penpot backend/exporter released; exact images, native readiness, public login/OIDC and origin checks passed.');
 }catch{
  report.status='failed';report.rollback='attempting';save();
  try{
   for(const row of report.rows){assert.equal(inspect(row.oldRef).Id,row.oldImage);assert.equal(normalized(config()[row.service]),row.configHash);}
   const path=directory+'/penpot-rollback-pair.json';writeFileSync(path,JSON.stringify({services:Object.fromEntries(report.rows.map(row=>[row.service,{image:row.oldRef}]))}));
   docker(...compose,'-f',path,'up','-d','--no-deps','--no-build','--pull','never',...report.rows.map(row=>row.service));
   refreshStaticUpstreams('expanded',docker);
   await ready();await publicGate();for(const row of report.rows)assert.equal(inspect(row.name).Image,row.oldImage);report.rollback='verified';
  }catch{report.rollback='unverified';}
  save();throw Error('Penpot release failed; exact-image rollback '+report.rollback+'. Reconcile source pins before continuing. No user data restored.');
 }
}else throw Error('Use prepare, change only two exact image pins, then apply.');
