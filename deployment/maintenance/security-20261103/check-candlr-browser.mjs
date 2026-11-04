// Actual rebuilt UI, synthetic local accounts, no external network or production mounts.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {chromium} from '../../../portal/node_modules/playwright/index.mjs';
process.umask(0o077);const dir='/var/lib/utilibre-maintenance/security-20261103/candlr',base='http://127.0.0.1:4258';
const b=JSON.parse(fs.readFileSync(dir+'/build.json'));
if(process.argv[2]==='--inside'){
 const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']}),context=await browser.newContext(),external=new Set(),errors=[];
 try{
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(/^https?:$/.test(u.protocol)&&u.origin!==base){external.add(u.origin);return r.abort();}return r.continue();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/register');await p.locator('#username').waitFor();
  for(const [id,value]of Object.entries({username:'fictional_browser',email:'fictional@example.com',password:'Fictional-browser-only-2026!','confirm-password':'Fictional-browser-only-2026!'}))await p.locator('#'+id).fill(value);
  await Promise.all([p.waitForURL(base+'/'),p.locator('#register-btn').click()]);
  const types=await(await context.request.get(base+'/api/event-types')).json();
  const saved=await context.request.post(base+'/api/people',{data:{name:'Fictional Browser Example',event:{event_type_id:types[0].id,month:11,day:14,year:2000,year_known:true,notify:false,notes:'Fictional local browser check'}}});assert.equal(saved.status(),201);const person=await saved.json();
  await p.goto(base+'/',{waitUntil:'networkidle'});await p.getByText('Fictional Browser Example').first().waitFor();
  await p.reload({waitUntil:'networkidle'});await p.getByText('Fictional Browser Example').first().waitFor();
  const exported=await context.request.get(base+'/api/data/export?format=json');assert(exported.ok()&&(await exported.text()).includes('Fictional Browser Example'));
  await p.goto(base+'/settings',{waitUntil:'networkidle'});for(const id of ['ntfy','discord','telegram','pushover','gotify','webpush'])assert.equal(await p.locator('#'+id+'-enabled').isVisible(),false);
  await p.setViewportSize({width:390,height:844});await p.goto(base+'/',{waitUntil:'networkidle'});await p.getByText('Fictional Browser Example').first().waitFor();
  await p.screenshot({path:dir+'/mobile.png',fullPage:true});
  assert((await context.request.delete(base+'/api/people/'+person.id)).ok());assert.equal((await context.request.get(base+'/api/people/'+person.id)).status(),404);
  assert.deepEqual([...external],[]);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,imageId:b.imageId,date:new Date().toISOString(),syntheticAccount:true,savedRecordRendered:true,reloadPersistence:true,nativeExport:true,nativeDelete:true,disabledProvidersHidden:true,mobileViewport:390,externalBrowserOrigins:[...external],pageErrors:errors,network:'isolated loopback only',realPhoneTested:false,productionChanged:false}));
 }finally{await context.close();await browser.close();}
}else{
 assert.equal(process.argv.length,2);const name='maintenance-candlr-browser';
 const run=(exe,args,opts={})=>cp.execFileSync(exe,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:2*1024**2,...opts});
 assert.equal(run('docker',['ps','-aq','--filter','name=^/'+name+'$']).trim(),'');
 try{
  run('docker',['run','-d','--name',name,'--network','none','--read-only','--user','1000:1000','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/app/backend/data:rw,size=64m,uid=1000,gid=1000','-e','SECRET_KEY=Fictional-only-candlr-browser','-e','API_URL=http://127.0.0.1:8000','-e','BACKEND_PORT=8000','-e','SERVER_URL='+base,'-e','TIMEZONE=UTC','-e','ENABLE_REGISTRATIONS=true','-e','REGISTRATION_MAX_ALLOWED_USERS=2','-e','OIDC_ENABLED=false','-e','OIDC_DISABLE_PASSWORD_LOGIN=false','-e','CARDDAV_SYNC_INTERVAL_MINUTES=0','-e','UTILIBRE_DISABLE_UPDATE_CHECK=true','--entrypoint','sh',b.imageId,'-c','cd /app/backend && alembic upgrade head && exec supervisord -n -c /etc/supervisor/conf.d/candlr.conf']);
  let ready=false;for(let i=0;i<60;i++){try{run('docker',['exec',name,'node','-e',`Promise.all(['http://127.0.0.1:8000/health','${base}/login'].map(u=>fetch(u))).then(rs=>process.exit(rs.every(r=>r.ok)?0:1)).catch(()=>process.exit(1))`],{timeout:5000});ready=true;break;}catch{await new Promise(r=>setTimeout(r,300));}}assert(ready);
  fs.writeFileSync(dir+'/registration-status.json',run('docker',['exec',name,'node','-e',`Promise.all(['http://127.0.0.1:8000/auth/registration-status','http://127.0.0.1:4258/api/auth/registration-status'].map(async u=>{const r=await fetch(u);return {url:u,status:r.status,body:await r.text()}})).then(r=>console.log(JSON.stringify(r)))`]));
  const pid=run('docker',['inspect','--format','{{.State.Pid}}',name]).trim();assert(/^[1-9][0-9]*$/.test(pid));
  const text=run('nsenter',['--net=/proc/'+pid+'/ns/net','--',process.execPath,new URL(import.meta.url).pathname,'--inside']);const r=JSON.parse(text);assert(r.passed);fs.writeFileSync(dir+'/browser.json',JSON.stringify(r,null,2)+'\n');console.log('Candlr browser workflow passed in the isolated network.');
 }catch(e){fs.writeFileSync(dir+'/browser-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Candlr browser fixture failed; private evidence retained');}
 finally{try{run('docker',['rm','-f',name]);}catch{}}
}
