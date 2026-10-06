import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {request} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const origin='https://wiki.utilibre.org', local=process.argv.includes('--backend');
const output=await mkdtemp('/tmp/utilibre-breezewiki-check-');
let proxy,certificates;
if(local){
  certificates=await mkdtemp('/tmp/utilibre-breezewiki-tls-');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=wiki.utilibre.org','-keyout',`${certificates}/key.pem`,'-out',`${certificates}/cert.pem`],{stdio:'ignore'});
  proxy=createServer({key:await readFile(`${certificates}/key.pem`),cert:await readFile(`${certificates}/cert.pem`)},(req,res)=>{
    const up=request({host:'10.10.1.43',port:3134,path:req.url,method:req.method,headers:{...req.headers,host:'wiki.utilibre.org'},timeout:35000},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res)});
    up.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end()});req.pipe(up);
  });
  await new Promise(resolve=>proxy.listen(443,'127.0.0.1',resolve));
}
const browser=await chromium.launch({headless:true,args:local?['--host-resolver-rules=MAP wiki.utilibre.org 127.0.0.1','--no-proxy-server']:[]});
try{
  for(const [name,width] of [['desktop',1280],['mobile',390]]){
    const context=await browser.newContext({viewport:{width,height:844},ignoreHTTPSErrors:local});
    const page=await context.newPage(), external=new Set(), failed=[];
    page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.add(new URL(r.url()).hostname)});
    page.on('response',r=>{if(r.status()>=400)failed.push({status:r.status(),path:r.url().slice(origin.length)})});
    const response=await page.goto(`${origin}/minecraft/wiki/Minecraft`,{waitUntil:'networkidle',timeout:60000});
    assert.equal(response.status(),200);
    assert.match(await page.locator('#content').innerText(),/sandbox game/i);
    assert.equal(await page.locator('link[href*="/static/main.css"]').count(),1);
    assert.ok(await page.evaluate(()=>document.styleSheets.length>=2));
    console.log({failed,images:await page.evaluate(()=>[...document.images].slice(0,6).map(img=>({src:img.currentSrc,width:img.naturalWidth})))});
    assert.ok(await page.evaluate(()=>[...document.images].filter(img=>img.complete&&img.naturalWidth>0).length>=2));
    await page.screenshot({path:`${output}/${name}.png`});
    console.log({name,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),external:[...external],failed});
    assert.deepEqual([...external],[]);
    assert.deepEqual(failed,[]);
    await context.close();
  }
  console.log(`BreezeWiki ${local?'protected backend':'public HTTPS'} real article, styles and images pass. Screenshots: ${output}`);
}finally{
  await browser.close();
  if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve))}
  if(certificates)await rm(certificates,{recursive:true});
}
