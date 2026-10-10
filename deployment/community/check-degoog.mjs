import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {request} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const origin='https://degoog.utilibre.org',local=process.argv.includes('--backend');
const output=await mkdtemp('/tmp/utilibre-degoog-check-');
let proxy,certificates;
if(local){
  certificates=await mkdtemp('/tmp/utilibre-degoog-tls-');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=degoog.utilibre.org','-keyout',`${certificates}/key.pem`,'-out',`${certificates}/cert.pem`],{stdio:'ignore'});
  proxy=createServer({key:await readFile(`${certificates}/key.pem`),cert:await readFile(`${certificates}/cert.pem`)},(req,res)=>{
    const up=request({host:'10.10.1.43',port:3156,path:req.url,method:req.method,headers:{...req.headers,host:'degoog.utilibre.org'},timeout:35000},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res)});
    up.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end()});req.pipe(up);
  });
  await new Promise(resolve=>proxy.listen(443,'127.0.0.1',resolve));
}
const browser=await chromium.launch({headless:true,args:local?['--host-resolver-rules=MAP degoog.utilibre.org 127.0.0.1','--no-proxy-server','--ignore-certificate-errors']:[]});
try{
  for(const [name,width,lang] of [['desktop',1280,'en'],['mobile',390,'es']]){
    const context=await browser.newContext({viewport:{width,height:844},locale:lang,ignoreHTTPSErrors:local});
    const page=await context.newPage(),external=new Set(),failed=[];
    context.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.add(new URL(r.url()).origin)});
    // Native no-provider state intentionally returns 404 and renders a favicon placeholder.
    page.on('response',r=>{const path=new URL(r.url()).pathname;if(r.status()>=400&&!(r.status()===404&&path==='/api/proxy/favicon'))failed.push([r.status(),path])});
    page.on('pageerror',e=>failed.push(['JS',e.message]));
    assert.equal((await page.goto(origin,{waitUntil:'networkidle'})).status(),200);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    await page.locator('#search-input').fill('linux');
    await page.locator('#btn-search').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('a')].some(a=>a.href==='https://en.wikipedia.org/wiki/Linux'),{},{timeout:30000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${output}/${name}.png`});
    console.log({name,external:[...external],failed});
    assert.deepEqual([...external],[]);assert.deepEqual(failed,[]);
    const api=await page.evaluate(async()=>{
      const r=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'linux',type:'it'})});return {status:r.status,data:await r.json()};
    });
    assert.equal(api.status,200);assert.ok(api.data.results.length>0);
    assert.ok(api.data.engineTimings.some(e=>e.id==='searx-hackernews-engine'&&e.status==='ok'));
    const denied=await page.evaluate(async()=>{
      const paths=['/settings/general','/api/settings','/api/store/repos','/api/indexer/export'];
      return Promise.all(paths.map(async path=>[path,(await fetch(path)).status]));
    });
    assert.ok(denied.every(([,status])=>status===404),JSON.stringify(denied));
    assert.equal(await page.evaluate(async()=>(await fetch('/api/search',{method:'DELETE'})).status),405);
    await context.close();
  }
  console.log(`DeGoog ${local?'protected backend':'public HTTPS'} real search, EN/ES mobile, client privacy and operator-route denial passed. Screenshots: ${output}`);
}finally{
  await browser.close();if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve))}
  if(certificates)await rm(certificates,{recursive:true});
}
