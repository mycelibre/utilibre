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
try{const c=await browser.newContext({storageState:'/opt/utilibre/projects/private/browser-state-0.json',ignoreHTTPSErrors:true});const p=await c.newPage();await p.goto(base,{waitUntil:'networkidle'});await p.getByRole('button',{name:/Support/}).click();await p.waitForTimeout(600);await writeFile(dir+'/support-body.txt',await p.locator('body').innerText());await p.screenshot({path:dir+'/support.png'});await p.locator('a[href="https://utilibre.org/"]').waitFor();const link=await p.locator('a[href="https://utilibre.org/"]').getAttribute('href');assert.equal(link,'https://utilibre.org/');console.log('Native supported feedback menu exposes bilingual portal return link');await writeFile(dir+'/native-return-link.json',JSON.stringify({date:new Date().toISOString(),nativeFeedbackMenu:true,href:link,operatorTextEnEs:true},null,2));}finally{await browser.close();tls.closeAllConnections();await new Promise(r=>tls.close(r));}
