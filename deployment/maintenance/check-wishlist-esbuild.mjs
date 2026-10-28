// Disposable blank SQLite installation: never attach visitor data or credentials.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
process.umask(0o077);
const jose=process.argv[2]==='--jose',oct28=process.argv[2]==='--oct28'||jose;
const netReview=process.argv[2]==='--caddy-net'||oct28;
const caddyReview=process.argv[2]==='--caddy'||netReview;
const appLeaves=process.argv[2]==='--app-leaves';
const closure=process.argv[2]==='--closure';
assert(!process.argv[2]||caddyReview||appLeaves||closure,'Only explicit review candidates are supported');
const image=jose?'utilibre-wishlist:caddy-jose-security-20261028':oct28?'utilibre-wishlist:caddy-go-security-20261028':closure?'utilibre-wishlist:0.67.1-js-closure-20261012':appLeaves?'utilibre-wishlist:0.67.1-mysql-security-20261011':caddyReview?'utilibre-wishlist:0.67.1-caddy-security-20261011'+(netReview?'-p2':''):'utilibre-wishlist:0.67.1-esbuild-security-20261011';
const name='maintenance-wishlist-security-stage',network=name+'-isolated';let base='http://127.0.0.1:32795',address,createdNetwork=false;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000});
let browser,created=false;
try{
 if(oct28){docker('network','create','--internal',network);createdNetwork=true;const subnet=JSON.parse(docker('network','inspect',network))[0].IPAM.Config[0].Subnet;address=execFileSync('python3',['-c','import ipaddress,sys;print(ipaddress.ip_network(sys.argv[1])[10])',subnet],{encoding:'utf8'}).trim();base='http://'+address+':3280';}
 docker('run','-d','--name',name,'--network',oct28?network:'bridge',...(oct28?['--ip',address]:[]),'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','512m','--cpus','1','--pids-limit','128','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777','--tmpfs','/usr/src/app/data:rw,nosuid,nodev,noexec,size=64m,uid=1000,gid=1000','--tmpfs','/usr/src/app/uploads:rw,nosuid,nodev,noexec,size=16m,uid=1000,gid=1000',...(oct28?[]:['-p','127.0.0.1:32795:3280']),'-e','ORIGIN='+base,'-e','CHECKPOINT_DISABLE=1','-e','PRISMA_HIDE_UPDATE_MESSAGE=1','-e','LOG_LEVEL=warn','-e','XDG_CONFIG_HOME=/tmp/caddy-config','-e','XDG_DATA_HOME=/tmp/caddy-data',image);
 created=true;
 let ready=false;
 for(let i=0;i<90;i++){
  try{const r=await fetch(base+'/login');if(r.status===200){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 assert(ready,'Native migrations/seed/patch/start must complete');
 const moduleCheck=docker('exec',name,'node','--input-type=commonjs','-e',`const assert=require('node:assert/strict');const p=require('./node_modules/.pnpm/esbuild@0.19.12/node_modules/esbuild');assert.equal(p.version,'0.19.12');assert.match(p.transformSync('const n: number = 7;', {loader:'ts'}).code,/const n = 7/);console.log('Exact API version and native transform passed');`);
 assert.match(moduleCheck,/passed/);
 browser=await chromium.launch();
 const context=await browser.newContext({locale:'en-US',serviceWorkers:'block'}),page=await context.newPage();
 const outside=new Set(),errors=[];
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){outside.add(u.origin);return route.abort();}return route.continue();});
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await page.goto(base+'/setup-wizard/step/1');
 const password=randomBytes(24).toString('base64url');
 for(const [key,value] of Object.entries({name:'Fictional Maintainer',username:'fictional-maintainer',email:'fictional@example.invalid',password}))await page.locator(`[name="${key}"]`).fill(value);
 await page.locator('#confirmpassword').fill(password);
 await page.locator('button[type="submit"]').click();
 await page.waitForURL('**/setup-wizard/step/2');
 await page.goto(base+'/lists/create');
 await page.locator('[name="name"]').fill('Fictional maintenance gifts');
 await page.getByRole('button',{name:'Create',exact:true}).click();
 await page.waitForURL(u=>/^\/lists\/[^/]+$/.test(u.pathname)&&!u.pathname.endsWith('/create'));
 const listPath=new URL(page.url()).pathname;
 await page.goto(base+listPath+'/create-item');
 await page.locator('[name="name"]').fill('Fictional paper notebook');
 await page.locator('[name="formatted-price"]').fill('12.50');
 await page.getByRole('button',{name:'Create item',exact:true}).click();
 await page.waitForURL(u=>u.pathname==='/lists'||u.pathname===listPath);
 await page.goto(base+listPath);
 await page.getByTestId('name').filter({hasText:'Fictional paper notebook'}).waitFor();
 await page.reload();await page.getByTestId('name').filter({hasText:'Fictional paper notebook'}).waitFor();
 const denied=await fetch(base+listPath,{redirect:'manual'});assert([302,303,307].includes(denied.status));
 assert.deepEqual([...outside],[]);assert.deepEqual(errors,[]);
 const report={checkedAt:new Date().toISOString(),image,imageId:docker('image','inspect',image,'--format','{{.Id}}').trim(),nativeBlankDatabaseStartup:true,esbuildVersion:'0.19.12',typescriptTransform:true,nativeAccountCreated:true,listCreated:true,itemCreated:true,reloadPersistence:true,anonymousListDenied:true,pageErrors:errors,externalBrowserOrigins:[...outside],limitation:'Disposable local account only; production OIDC, backups and email not re-tested.'};
 const directory=jose?'/var/lib/utilibre-maintenance/security-20261028/jose-caddy':oct28?'/var/lib/utilibre-maintenance/security-20261028/caddy':closure?'/var/lib/utilibre-maintenance/js-closure-20261012/wishlist':appLeaves?'/var/lib/utilibre-maintenance/app-leaves-20261011':caddyReview?'/var/lib/utilibre-maintenance/caddy-security-20261011'+(netReview?'/net':''):'/var/lib/utilibre-maintenance/browser-binaries-20261011';
 await mkdir(directory,{recursive:true,mode:0o700});
 await writeFile(directory+'/wishlist-stage.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log('Wishlist exact esbuild API, migrations/seed/patch, native account/list/item/reload and anonymous denial passed. No external browser requests.');
}finally{
 if(browser)await browser.close();
 if(created)try{docker('rm','-f',name);}catch{}
 if(createdNetwork)docker('network','rm',network);
}
