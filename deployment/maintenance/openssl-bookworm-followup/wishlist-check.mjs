// Reuse the established native Wishlist account/list/item fixture on blank state.
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync,spawn} from 'node:child_process';import {randomBytes} from 'node:crypto';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012/images/wishlist',proof=JSON.parse(fs.readFileSync(dir+'/build.json')),image=proof.imageId;
assert(proof.passed);assert(!fs.existsSync(dir+'/application.json'));
const tag=randomBytes(4).toString('hex'),network='maintenance-openssl-wishlist-'+tag,name=network+'-app',base='http://127.0.0.1:32795';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000}).trim();
let browser,bridge;
try{
 docker('network','create','--internal',network);
 docker('run','-d','--name',name,'--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','512m','--cpus','1','--pids-limit','128','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777','--tmpfs','/usr/src/app/data:rw,nosuid,nodev,noexec,size=64m,uid=1000,gid=1000','--tmpfs','/usr/src/app/uploads:rw,nosuid,nodev,noexec,size=16m,uid=1000,gid=1000','-e','ORIGIN='+base,'-e','CHECKPOINT_DISABLE=1','-e','PRISMA_HIDE_UPDATE_MESSAGE=1','-e','LOG_LEVEL=warn','-e','XDG_CONFIG_HOME=/tmp/caddy-config','-e','XDG_DATA_HOME=/tmp/caddy-data',image);
 const ip=docker('inspect',name,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}');bridge=spawn('socat',['TCP4-LISTEN:32795,bind=127.0.0.1,reuseaddr,fork',`TCP4:${ip}:3280`],{detached:true,stdio:'ignore'});
 let ready=false;for(let i=0;i<90;i++){try{if(bridge.exitCode===null&&(await fetch(base+'/login',{signal:AbortSignal.timeout(1000)})).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'Native blank migrations/start must complete');
 browser=await chromium.launch();const context=await browser.newContext({locale:'en-US',serviceWorkers:'block'}),page=await context.newPage(),outside=new Set(),errors=[];
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){outside.add(u.origin);return route.abort();}return route.continue();});page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await page.goto(base+'/setup-wizard/step/1');const password=randomBytes(24).toString('base64url');
 for(const [key,value] of Object.entries({name:'Fictional Maintainer',username:'fictional-maintainer',email:'fictional@example.invalid',password}))await page.locator(`[name="${key}"]`).fill(value);
 await page.locator('#confirmpassword').fill(password);await page.locator('button[type="submit"]').click();await page.waitForURL('**/setup-wizard/step/2');
 await page.goto(base+'/lists/create');await page.locator('[name="name"]').fill('Fictional maintenance gifts');await page.getByRole('button',{name:'Create',exact:true}).click();await page.waitForURL(u=>/^\/lists\/[^/]+$/.test(u.pathname)&&!u.pathname.endsWith('/create'));const listPath=new URL(page.url()).pathname;
 await page.goto(base+listPath+'/create-item');await page.locator('[name="name"]').fill('Fictional paper notebook');await page.locator('[name="formatted-price"]').fill('12.50');await page.getByRole('button',{name:'Create item',exact:true}).click();await page.waitForURL(u=>u.pathname==='/lists'||u.pathname===listPath);
 await page.goto(base+listPath);await page.getByTestId('name').filter({hasText:'Fictional paper notebook'}).waitFor();await page.reload();await page.getByTestId('name').filter({hasText:'Fictional paper notebook'}).waitFor();
 const denied=await fetch(base+listPath,{redirect:'manual'});assert([302,303,307].includes(denied.status));assert.deepEqual([...outside],[]);assert.deepEqual(errors,[]);
 fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),imageId:image,passed:true,nativeBlankDatabaseStartup:true,nativeAccountCreated:true,listCreated:true,itemCreated:true,reloadPersistence:true,anonymousListDenied:true,externalBrowserOrigins:[...outside],fictionalDataOnly:true,network:'internal; no external browser requests',limitation:'Synthetic local account only; production OIDC/email not re-tested.'},null,2)+'\n');console.log('Wishlist native account, list, item, persistence and anonymous denial passed.');
}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stderr||e.message));throw Error('Wishlist native fixture failed; private diagnostics retained.');}
finally{if(browser)await browser.close();if(bridge?.pid)try{process.kill(-bridge.pid,'SIGTERM');}catch{}try{docker('rm','-f','-v',name);}catch{}try{docker('network','rm',network);}catch{}}
