import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import {createHmac} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const out='/opt/utilibre/reports/trip-20261009',privateDir='/opt/utilibre/trip/private',base='https://trip.utilibre.org';
const users=JSON.parse(await readFile(privateDir+'/qa-users.json','utf8'));
function otp(key){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(key,'hex')).update(b).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const tls=https.createServer({key:await readFile(privateDir+'/preview.key'),cert:await readFile(privateDir+'/preview.crt')},(req,res)=>{const up=http.request({hostname:'127.0.0.1',port:3224,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});up.on('error',()=>{res.writeHead(502);res.end();});req.pipe(up);res.on('close',()=>up.destroy());});
await new Promise(r=>tls.listen(443,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--no-proxy-server','--host-resolver-rules=MAP trip.utilibre.org 127.0.0.1']});const result=[];
try {for (const [index,u] of users.entries()) {
 const ctx=await browser.newContext({locale:index?'es-ES':'en-US',viewport:{width:index?390:1280,height:850},serviceWorkers:'block',ignoreHTTPSErrors:true});ctx.setDefaultTimeout(25000);const hosts=new Set(),errors=[];
 // Do not generate automated tile traffic against the community tile service.
 let tilesMocked=0;await ctx.route('https://tile.openstreetmap.org/**',r=>{tilesMocked++;return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMXsAAAAASUVORK5CYII=','base64')});});
 const page=await ctx.newPage();page.on('request',r=>hosts.add(new URL(r.url()).hostname));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://auth.utilibre.org/if/flow/default-authentication-flow/');
 await page.locator('input[name="uidField"]').fill(u.username);await page.getByRole('button',{name:/^(Log in|Iniciar sesión|Acceder)$/}).click();
 await page.locator('ak-stage-password input[name="password"]:visible').fill(u.password);await page.getByRole('button',{name:/^(Continue|Continuar)$/}).click();
 await page.locator('ak-stage-authenticator-validate input[name="code"]:visible').fill(otp(u.totpKey));await page.getByRole('button',{name:/^(Continue|Continuar)$/}).click();await page.waitForURL('**/if/user/**');
 await page.goto(base+'/auth');await page.getByRole('button',{name:/sign in|iniciar sesión/i}).click();
 await page.waitForFunction(()=>Boolean(localStorage.getItem('TRIP_AT')),{timeout:30000});
 const token=await page.evaluate(()=>localStorage.getItem('TRIP_AT'));const settings=await ctx.request.get('http://127.0.0.1:3224/api/settings',{headers:{Authorization:'Bearer '+token}});assert(settings.ok());const user=await settings.json();assert.equal(user.username,u.username);assert.equal(user.is_admin,false);assert.equal(user.map_provider,'photon');
 await writeFile(privateDir+'/session-'+index+'.json',JSON.stringify({token,user}),{mode:0o600});await ctx.storageState({path:privateDir+'/browser-'+index+'.json'});
 await page.screenshot({path:out+'/native-'+index+'.png',fullPage:true});await writeFile(out+'/native-'+index+'.txt',await page.locator('body').innerText());
 assert.deepEqual([...hosts].filter(h=>!['trip.utilibre.org','auth.utilibre.org','tile.openstreetmap.org'].includes(h)),[]);
 result.push({index,nativeMFAandOIDC:true,nonAdmin:true,provider:user.map_provider,hosts:[...hosts],tilesMocked,errors});await ctx.close();
 }}finally{await browser.close();tls.closeAllConnections();await new Promise(r=>tls.close(r));await writeFile(out+'/oidc-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
