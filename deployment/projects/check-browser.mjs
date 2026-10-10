import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
const dir='/opt/utilibre/reports/projects-launch-20261009';
const users=JSON.parse(await readFile('/opt/utilibre/projects/private/check-users.json','utf8'));
const report={date:new Date().toISOString(),transport:'Canonical HTTPS through loopback TLS to private gateway; public edge not yet ready',checks:[],externalHosts:[],errors:[]};
const base='https://projects.utilibre.org';
function otp(key){const c=Buffer.alloc(8);c.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(key,'hex')).update(c).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const tls=https.createServer({key:await readFile(dir+'/preview.key'),cert:await readFile(dir+'/preview.crt')},(req,res)=>{const up=http.request({hostname:'127.0.0.1',port:3217,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});up.on('error',()=>{res.writeHead(502);res.end();});req.pipe(up);res.on('close',()=>up.destroy());});
tls.on('upgrade',(req,socket,head)=>{const up=http.request({hostname:'127.0.0.1',port:3217,path:req.url,method:req.method,headers:req.headers});up.on('upgrade',(r,other,extra)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(r.headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(extra.length)socket.write(extra);if(head.length)other.write(head);other.pipe(socket);socket.pipe(other);socket.on('error',()=>other.destroy());other.on('error',()=>socket.destroy());});up.on('error',()=>socket.destroy());up.end();});
await new Promise(r=>tls.listen(443,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--no-proxy-server','--host-resolver-rules=MAP projects.utilibre.org 127.0.0.1']});
const contexts=[];
try{
 for(const [i,u] of users.entries()){
  const context=await browser.newContext({ignoreHTTPSErrors:true,locale:i===1?'es-ES':'en-US',viewport:{width:i===1?390:1280,height:850}});contexts.push(context);
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['projects.utilibre.org','auth.utilibre.org'].includes(host))report.externalHosts.push(host);});
  await page.goto('https://auth.utilibre.org/if/flow/default-authentication-flow/');
  await page.locator('input[name="uidField"]').fill(u.username);await page.getByRole('button',{name:/^(Log in|Iniciar sesión|Acceder)$/}).click();
  await page.locator('ak-stage-password input[name="password"]:visible').fill(u.password);await page.getByRole('button',{name:/^(Continue|Continuar)$/}).click();
  await page.locator('ak-stage-authenticator-validate input[name="code"]:visible').fill(otp(u.totpKey));await page.getByRole('button',{name:/^(Continue|Continuar)$/}).click();await page.waitForURL('**/if/user/**');
  await page.goto(base,{waitUntil:'networkidle'});
  await page.screenshot({path:dir+'/login-'+i+'.png'});
  await page.getByRole('button',{name:/Continue with Utilibre|Continuá con Utilibre/}).click();
  if(i===2){await page.getByText(/not have permission|Permission denied|not allowed|Access denied/i).first().waitFor({timeout:20000});report.checks.push('Unapproved identity denied by native Authentik app gate');continue;}
  await page.waitForURL(base+'/',{timeout:30000});await page.waitForTimeout(1500);
  const cookies=await context.cookies(base);const token=cookies.find(c=>c.name==='accessToken')?.value;assert(token,'Native OIDC did not issue an app session');
  const response=await context.request.get('http://127.0.0.1:3217/api/users/me',{headers:{Authorization:'Bearer '+token,Cookie:cookies.map(c=>c.name+'='+c.value).join('; ')}});assert(response.ok(),'native user lookup');const own=(await response.json()).item;assert.equal(own.isAdmin,false);assert.equal(own.email,u.email);
  await writeFile('/opt/utilibre/projects/private/qa-session-'+i+'.json',JSON.stringify({token,cookies,user:own}),{mode:0o600});
  await context.storageState({path:'/opt/utilibre/projects/private/browser-state-'+i+'.json'});
  await page.screenshot({path:dir+'/dashboard-'+i+'.png',fullPage:true});
  report.checks.push('Approved QA '+i+': real Authentik MFA/native OIDC callback and non-admin account passed');
 }
 assert.deepEqual([...new Set(report.externalHosts)],[]);
}finally{await browser.close();tls.closeAllConnections();await new Promise(r=>tls.close(r));await writeFile(dir+'/browser-login.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
