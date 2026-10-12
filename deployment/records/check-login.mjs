import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHmac,randomBytes} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
process.umask(0o077);
const gristOnly=process.argv.includes('--grist-only');
const fixtureRun=process.argv.find(arg=>arg.startsWith('--run='))?.slice(6)||'records11';
assert.match(fixtureRun,/^[a-z0-9]{1,20}$/,'Bounded existing QA fixture run required');
const selectedAccount=process.argv.find(arg=>arg.startsWith('--account='))?.slice(10);
if(selectedAccount!==undefined)assert.match(selectedAccount,/^[012]$/);
const dir='/opt/utilibre/reports/records-20261011';
await mkdir(dir,{recursive:true});
const users=JSON.parse(await readFile('/opt/utilibre/identity-data/data/private/projects-check-users-'+fixtureRun+'.json','utf8'));
const report={date:new Date().toISOString(),environment:'Headless Chromium; real public HTTPS; synthetic approved and denied identities',checks:[],externalHosts:[],errors:[]};
function otp(key){const c=Buffer.alloc(8);c.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(key,'hex')).update(c).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const browser=await chromium.launch({args:['--no-sandbox']});
try {
 for(const [i,u] of users.entries()){
  if(selectedAccount!==undefined&&i!==Number(selectedAccount))continue;
  const context=await browser.newContext({locale:i===1?'es-ES':'en-US',viewport:{width:i===1?390:1280,height:850}});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['grist.utilibre.org','candlr.utilibre.org','bookplate.utilibre.org','auth.utilibre.org'].includes(host))report.externalHosts.push(host);});
  await page.goto('https://auth.utilibre.org/if/flow/default-authentication-flow/');
  await page.locator('input[name="uidField"]').fill(u.username);await page.getByRole('button',{name:/^(Log in|Iniciar sesión|Acceder)$/}).click();
  try{await page.locator('ak-stage-password input[name="password"]:visible').fill(u.password);}
  catch(error){
   const diagnostic={path:new URL(page.url()).pathname,inputs:await page.locator('input:visible').evaluateAll(nodes=>nodes.map(n=>({name:n.name,type:n.type}))),invalidCredentials:await page.getByText(/invalid credentials|incorrect password|invalid password/i).count(),limited:await page.getByText(/too many|rate limit|demasiad|throttl/i).count()};
   await writeFile(dir+'/login-identification.json',JSON.stringify(diagnostic,null,2),{mode:0o600});throw error;
  }
  await page.getByRole('button',{name:/^(Continue|Continuar)$/}).click();
  try{await page.locator('ak-stage-authenticator-validate input[name="code"]:visible').fill(otp(u.totpKey));}
  catch(error){
   // Diagnostic structure only: never capture passwords, challenge values,
   // flow query strings, QR enrollment secrets or arbitrary page text.
   const diagnostic={path:new URL(page.url()).pathname,inputs:await page.locator('input:visible').evaluateAll(nodes=>nodes.map(n=>({name:n.name,type:n.type}))),invalidCredentials:await page.getByText(/invalid credentials|incorrect password|invalid password/i).count(),userHome:new URL(page.url()).pathname.startsWith('/if/user/')};
   await writeFile(dir+'/login-structure.json',JSON.stringify(diagnostic,null,2),{mode:0o600});throw error;
  }
  await page.getByRole('button',{name:/^(Continue|Continuar)$/}).click();await page.waitForURL('**/if/user/**');
  for(const app of gristOnly?['grist']:['grist','candlr']){
   await page.goto(`https://${app}.utilibre.org/`,{waitUntil:'networkidle'});
   if(app==='candlr')await page.getByRole('link',{name:'Sign in with Utilibre'}).click();
   if(i===2){await page.getByText(/not have permission|Permission denied|not allowed|Access denied/i).first().waitFor({timeout:20000});report.checks.push(app+': unapproved identity denied');continue;}
   await page.waitForURL(`https://${app}.utilibre.org/**`,{timeout:30000});
   await page.waitForTimeout(1800);
   await page.screenshot({path:dir+`/${app}-${i}.png`,fullPage:true});
   const response=await context.request.get(`https://${app}.utilibre.org/`+(app==='grist'?'api/session/access/active':'api/auth/me'));
   assert.equal(response.status(),200,app+' authenticated account lookup');
   const data=await response.json();
   assert(JSON.stringify(data).includes(u.email),app+' account must match identity');
   if(app==='candlr')assert.equal(data.is_admin,false);
   report.checks.push(app+': approved identity '+i+' authenticated over public HTTPS');
  }
  await context.storageState({path:`/opt/utilibre/records/private/browser-state-${i}.json`});
  await context.close();
 }
 const accounts=[];
 for(let i=0;!gristOnly&&i<2;i++){
  const account={name:'Synthetic reader '+i,email:`utilibre-bookplate-check-${i}@utilibre.org`,password:randomBytes(36).toString('base64url')};
  const path=`/opt/utilibre/records/private/bookplate-check-${i}.json`;
  try{Object.assign(account,JSON.parse(await readFile(path,'utf8')));}catch{
   await writeFile(path,JSON.stringify(account),{flag:'wx',mode:0o600});
   const create=await fetch('http://172.29.158.13:3000/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://bookplate.utilibre.org','X-Forwarded-Host':'bookplate.utilibre.org','X-Forwarded-Proto':'https'},body:JSON.stringify(account)});
   assert(create.ok,'native operator-only provisioning');
  }
  const context=await browser.newContext();const page=await context.newPage();
  page.on('request',r=>{const host=new URL(r.url()).hostname;if(host!=='bookplate.utilibre.org')report.externalHosts.push(host);});
  await page.goto('https://bookplate.utilibre.org/login');
  await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(account.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL('https://bookplate.utilibre.org/',{timeout:20000});
  await page.screenshot({path:dir+`/bookplate-${i}.png`,fullPage:true});
  await context.storageState({path:`/opt/utilibre/records/private/bookplate-state-${i}.json`});
  accounts.push(account.email);await context.close();
 }
 if(!gristOnly)report.checks.push('Bookplate: two separate native accounts signed in via public HTTPS');
 assert.deepEqual([...new Set(report.externalHosts)],[],'Unexpected browser egress');
} finally {
 await browser.close();
 report.externalHosts=[...new Set(report.externalHosts)];
 await writeFile(dir+'/login.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
