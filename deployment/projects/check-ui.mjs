import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
const dir='/opt/utilibre/reports/projects-launch-20261009';
const users=JSON.parse(await readFile('/opt/utilibre/projects/private/check-users.json','utf8'));
const report={date:new Date().toISOString(),transport:'Canonical HTTPS through loopback TLS to private gateway; public edge not yet ready',checks:[],externalHosts:[],externalResponses:[],blockedRequests:[],errors:[]};
const base='https://projects.utilibre.org';
function otp(key){const c=Buffer.alloc(8);c.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(key,'hex')).update(c).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const tls=https.createServer({key:await readFile(dir+'/preview.key'),cert:await readFile(dir+'/preview.crt')},(req,res)=>{const up=http.request({hostname:'127.0.0.1',port:3217,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});up.on('error',()=>{res.writeHead(502);res.end();});req.pipe(up);res.on('close',()=>up.destroy());});
tls.on('upgrade',(req,socket,head)=>{const up=http.request({hostname:'127.0.0.1',port:3217,path:req.url,method:req.method,headers:req.headers});up.on('upgrade',(r,other,extra)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(r.headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(extra.length)socket.write(extra);if(head.length)other.write(head);other.pipe(socket);socket.pipe(other);socket.on('error',()=>other.destroy());other.on('error',()=>socket.destroy());});up.on('error',()=>socket.destroy());up.end();});
await new Promise(r=>tls.listen(443,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--no-proxy-server','--host-resolver-rules=MAP projects.utilibre.org 127.0.0.1']});
const contexts=[];
const fixtures=JSON.parse(await readFile('/opt/utilibre/projects/private/native-fixtures.json','utf8'));
try{
 for(let i=0;i<2;i++){
  const context=await browser.newContext({storageState:'/opt/utilibre/projects/private/browser-state-'+i+'.json',ignoreHTTPSErrors:true,locale:i?'es-ES':'en-US',viewport:{width:i?390:1280,height:850}});contexts.push(context);
  const credentials=JSON.parse(await readFile('/opt/utilibre/projects/private/qa-session-'+i+'.json','utf8'));
  const headers={Authorization:'Bearer '+credentials.token,Cookie:credentials.cookies.map(c=>c.name+'='+c.value).join('; ')};
  const locale=await context.request.patch('http://127.0.0.1:3217/api/users/'+credentials.user.id,{headers,data:{language:i?'es-ES':'en-US'}});assert(locale.ok());
  const page=await context.newPage();page.on('response',r=>{if(new URL(r.url()).hostname==='external.projects.invalid')report.externalResponses.push(r.status());});page.on('requestfailed',r=>{if(new URL(r.url()).hostname==='external.projects.invalid')report.blockedRequests.push(r.failure()?.errorText);});page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['projects.utilibre.org','auth.utilibre.org'].includes(host)&&!r.url().startsWith('blob:'))report.externalHosts.push(host);});
  await page.goto(base+'/boards/'+fixtures[i].board.id,{waitUntil:'networkidle'});
  await page.getByText(fixtures[i].card.name,{exact:true}).waitFor();
  await page.screenshot({path:dir+'/board-'+i+'.png',fullPage:true});
  await writeFile(dir+'/board-'+i+'.txt',await page.locator('body').innerText());
  const actions=page.locator('[class*="BoardActions_wrapper"]').getByRole('button').filter({has:page.getByText('more_horiz',{exact:true})});
  console.log('Native board menu buttons:',await actions.count());
  await actions.first().click();
  await writeFile(dir+'/board-menu-'+i+'.txt',await page.locator('body').innerText());
  const downloadPromise=page.waitForEvent('download');
  await page.getByText(/Export as CSV|Exportar.*CSV/i).click();
  const download=await downloadPromise;await download.saveAs(dir+'/fictional-board-'+i+'.csv');const csv=await readFile(dir+'/fictional-board-'+i+'.csv','utf8');
  assert(csv.includes(fixtures[i].card.name));assert(csv.includes('Fictional Done'));assert(csv.includes('Fictional, quoted ""description"" only.'));assert(!csv.includes('Fictional task text omitted'));assert(!csv.includes('Fictional comment omitted'));assert(!csv.includes('Fictional Projects recovery attachment.'));assert(csv.includes('0/1'));
  report.checks.push({locale:i?'es-ES':'en-US',viewport:i?390:1280,nativeBoardVisible:true,nativeCsvDownload:true,expectedCsvScope:true,boardHorizontalScroll:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  await page.goto(base+'/cards/'+fixtures[i].card.id,{waitUntil:'networkidle'});await page.screenshot({path:dir+'/card-'+i+'.png',fullPage:true});
  const markup=await context.request.patch('http://127.0.0.1:3217/api/cards/'+fixtures[i].card.id,{headers,data:{description:'![Fictional external image](https://external.projects.invalid/pixel.png)'}});assert(markup.ok());
  await page.addInitScript(()=>{window.cspChecks=[];document.addEventListener('securitypolicyviolation',e=>window.cspChecks.push({directive:e.violatedDirective,blocked:e.blockedURI}));});
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.cspChecks.some(c=>c.directive==='img-src'&&c.blocked==='https://external.projects.invalid/pixel.png'));
  await context.request.patch('http://127.0.0.1:3217/api/cards/'+fixtures[i].card.id,{headers,data:{description:fixtures[i].card.description}});
  report.checks.push('Native Markdown external image blocked by CSP for QA '+i);
 }
 assert.deepEqual([...new Set(report.externalHosts)],['external.projects.invalid']);assert.deepEqual(report.externalResponses,[]);assert(report.blockedRequests.length>=2);assert(report.blockedRequests.every(s=>['csp','net::ERR_BLOCKED_BY_CSP'].includes(s)));assert.deepEqual(report.errors,[]);
}finally{await browser.close();tls.closeAllConnections();await new Promise(r=>tls.close(r));await writeFile(dir+'/browser-ui.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
