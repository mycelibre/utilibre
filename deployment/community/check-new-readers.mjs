import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {request} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const local=process.argv.includes('--backend'), only=process.argv.find(v=>v.startsWith('--only='))?.split('=')[1];
const targets=[['rimgo',3153,'/a/j2sOQkJ'],['gram',3154,'/natgeo']].filter(([name])=>!only||name===only);
const output=await mkdtemp('/tmp/utilibre-readers-check-');
let proxy,certificates;
if(local){
  certificates=await mkdtemp('/tmp/utilibre-readers-tls-');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=utilibre.org','-keyout',`${certificates}/key.pem`,'-out',`${certificates}/cert.pem`],{stdio:'ignore'});
  proxy=createServer({key:await readFile(`${certificates}/key.pem`),cert:await readFile(`${certificates}/cert.pem`)},(req,res)=>{
    const target=targets.find(([name])=>req.headers.host===`${name}.utilibre.org`);
    if(!target){res.writeHead(404);res.end();return;}
    const up=request({host:'10.10.1.43',port:target[1],path:req.url,method:req.method,headers:req.headers,timeout:45000},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res)});
    up.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end()});req.pipe(up);
  });
  await new Promise(resolve=>proxy.listen(443,'127.0.0.1',resolve));
}
const browser=await chromium.launch({headless:true,args:local?[`--host-resolver-rules=${targets.map(([name])=>`MAP ${name}.utilibre.org 127.0.0.1`).join(',')}`,'--no-proxy-server']:[]});
try{
  for(const [service,,path] of targets){
    const origin=`https://${service}.utilibre.org`;
    for(const [name,width] of [['desktop',1280],['mobile',390]]){
      const context=await browser.newContext({viewport:{width,height:844},ignoreHTTPSErrors:local});
      const page=await context.newPage(),external=new Set(),failed=[];
      page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.add(r.url())});
      page.on('response',r=>{if(r.status()>=400)failed.push([r.status(),r.url()])});
      page.on('pageerror',e=>failed.push(['JS',e.message]));
      assert.equal((await page.goto(origin+path,{waitUntil:'networkidle',timeout:60000})).status(),200);
      if(service==='rimgo'){
        await page.locator('video').first().evaluate(async v=>{
          v.muted=true;
          await Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error(`Playback timeout: state ${v.readyState}, error ${v.error?.message}, source ${v.currentSrc}`)),15000))]);
        });
        await page.waitForFunction(()=>document.querySelector('video')?.currentTime>1,null,{timeout:15000});
        assert.ok(await page.locator('link[rel="stylesheet"]').count());
      }else{
        assert.match(await page.title(),/natgeo/i);
        await page.waitForFunction(()=>[...document.images].filter(i=>i.src.includes('/mediaproxy')&&i.naturalWidth>0).length>=2,null,{timeout:30000});
        const post=page.locator('a[href^="/p/"]').first();
        assert.ok(await post.count());await post.click();
        await page.waitForLoadState('networkidle');assert.match(await page.title(),/post by natgeo/i);
        await page.waitForFunction(()=>[...document.images].some(i=>i.src.includes('/mediaproxy')&&i.naturalWidth>0),null,{timeout:30000});
        if(await page.locator('video').count()){
          await page.locator('video').first().evaluate(async v=>{
            v.muted=true;
            await Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error(`Instagram playback timeout: ${v.error?.message}`)),15000))]);
          });
          await page.waitForFunction(()=>document.querySelector('video')?.currentTime>1,null,{timeout:15000});
        }
      }
      await page.screenshot({path:`${output}/${service}-${name}.png`});
      console.log({service,name,external:[...external],failed,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual([...external],[]);assert.deepEqual(failed,[]);
      await page.goto(origin+(service==='rimgo'?'/privacy':'/'));
      assert.ok(await page.locator('a[href^="https://utilibre.org"]').count(),'Native operator/privacy return link');
      await context.close();
    }
  }
  console.log(`New readers ${local?'protected backend':'public HTTPS'} actual content/media, desktop/mobile and privacy checks passed. Screenshots: ${output}`);
}finally{
  await browser.close();if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve))}
  if(certificates)await rm(certificates,{recursive:true});
}
