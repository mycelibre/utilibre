// Disposable native instance only: no real paste data or full-stack backup.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdtemp,mkdir,chmod,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(new URL('../../../portal/package.json',import.meta.url))('playwright-core');
const recipe=fileURLToPath(new URL('../config/privatebin/',import.meta.url));
const report='/opt/utilibre/reports/privatebin-discovery-20261009';
const temp=await mkdtemp('/opt/utilibre/privatebin-discovery-check-'),name='utilibre-privatebin-discovery-check',network=name+'-net';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const base='http://127.0.0.1:43218';
let bridge,browser,created=false,networkCreated=false;
const result={checkedAt:new Date().toISOString(),checks:[]};
try{
 await mkdir(temp+'/data');await chmod(temp,0o755);await chmod(temp+'/data',0o777);
 docker('network','create','--internal',network);networkCreated=true;
 const mounts=[['conf.php','/srv/cfg/conf.php'],['bootstrap5-utilibre.php','/srv/tpl/bootstrap5-utilibre.php'],['robots.txt','/var/www/robots.txt'],['manifest.json','/var/www/manifest.json'],['brand','/var/www/utilibre-brand'],['brand/favicon.ico','/var/www/favicon.ico'],['discovery-server.conf','/etc/nginx/server.d/utilibre-discovery.conf'],['discovery-location.conf','/etc/nginx/location.d/utilibre-discovery.conf']].flatMap(([file,target])=>['-v',recipe+file+':'+target+':ro']);
 docker('run','-d','--name',name,'--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--cpus','0.5','--memory','256m','--pids-limit','96','--log-driver','none','--tmpfs','/run:rw,exec,nosuid,nodev,size=16m,mode=0755,uid=65534,gid=82','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777','--tmpfs','/var/lib/nginx/tmp:rw,nosuid,nodev,noexec,size=32m,mode=0755,uid=65534,gid=82','-v',temp+'/data:/srv/data',...mounts,'docker.io/privatebin/nginx-fpm-alpine:2.0.6@sha256:13290e2f04bfd98cf8fc7e8d216fb76b2b2d12373d4923b859cd41c2d984fde8');created=true;
 const ip=JSON.parse(docker('inspect',name))[0].NetworkSettings.Networks[network].IPAddress;
 bridge=spawn('socat',['TCP4-LISTEN:43218,bind=127.0.0.1,reuseaddr,fork,max-children=16',`TCP4:${ip}:8080`],{detached:true,stdio:'ignore'});
 let ready=false;for(let n=0;n<25;n++){try{ready=(await fetch(base,{signal:AbortSignal.timeout(1000)})).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500))}assert(ready);
 docker('exec',name,'nginx','-t');docker('exec',name,'php','-l','/srv/tpl/bootstrap5-utilibre.php');
 browser=await chromium.launch();
 for(const lang of ['en','es']){
  const ctx=await browser.newContext({locale:lang==='es'?'es-GT':'en-US',viewport:{width:lang==='es'?390:1280,height:900}});const page=await ctx.newPage();const errors=[],hosts=new Set();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>hosts.add(new URL(r.url()).hostname));
  const response=await page.goto(base+'/');assert.equal(response.status(),200);await page.locator('#message').waitFor({state:'visible'});
  assert.match(await page.title(),lang==='es'?/Compartir texto cifrado/:/Encrypted text sharing/);
  assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'index, follow');
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://paste.utilibre.org/');
  assert.match(await page.locator('meta[name=description]').getAttribute('content'),lang==='es'?/Compartí.*Elegí.*necesitás/:/browser encrypts/);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'https://paste.utilibre.org/utilibre-brand/icon-512.png');
  assert(await page.locator('#utilibre-home-title').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual([...hosts],['127.0.0.1']);assert.deepEqual(errors,[]);await page.screenshot({path:`${report}/candidate-${lang}.png`,fullPage:true});result.checks.push(`${lang} exact homepage metadata, local assets, no browser error or overflow`);
  if(lang==='en'){
   const fictional='Fictional PrivateBin discovery check. No personal data.';
   await page.locator('#message').fill(fictional);const post=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().startsWith(base));await page.locator('#sendbutton').click();const receipt=await(await post).json();assert.equal(receipt.status,0);await page.waitForFunction(()=>location.hash.length>15);const link=page.url();
   const reader=await ctx.newPage();const pasteResponse=await reader.goto(link);assert.match(pasteResponse.headers()['x-robots-tag'],/noindex/);await reader.waitForFunction(expected=>document.body.innerText.includes(expected),fictional);assert.match(await reader.locator('meta[name=robots]').getAttribute('content'),/noindex/);assert.equal(await reader.locator('link[rel=canonical]').count(),0);assert.equal(await reader.locator('#utilibre-home-title').count(),0);
   const unkeyed=await ctx.newPage();await unkeyed.goto(link.split('#')[0]);assert(!(await unkeyed.locator('body').innerText()).includes(fictional));
   const deleted=await page.evaluate(async({id,token})=>{const r=await fetch(`/?pasteid=${id}&deletetoken=${token}`,{headers:{'X-Requested-With':'JSONHttpRequest'}});return {status:r.status,robots:r.headers.get('x-robots-tag'),body:await r.json()}},{id:receipt.id,token:receipt.deletetoken});assert.equal(deleted.body.status,0);assert.match(deleted.robots,/noindex/);
   result.checks.push('native encrypted fictional paste create/decrypt, unkeyed view, noindex and delete');
  }
  await ctx.close();
 }
 for(const path of ['/?utilibre_discovery_check=1','/index.php','/utilibre-discovery-not-found']){
  const response=await fetch(base+path);assert.match(response.headers.get('x-robots-tag'),/noindex/);const html=await response.text();assert.match(html,/name="robots" content="noindex/);assert(!html.includes('rel="canonical"'));result.checks.push(path+' stays noindex');
 }
 const head=await fetch(base+'/',{method:'HEAD'});assert.equal(head.headers.get('x-robots-tag'),null);
 for(const [path,type,minBytes]of[['/favicon.ico','image/x-icon',100],['/utilibre-brand/favicon-48.png','image/png',100],['/utilibre-brand/icon-512.png','image/png',100],['/robots.txt','text/plain',100]]){const r=await fetch(base+path);assert.equal(r.status,200);assert(r.headers.get('content-type').includes(type));assert((await r.arrayBuffer()).byteLength>minBytes);if(path!=='/robots.txt'){assert.equal(r.headers.get('x-robots-tag'),null);assert(!String(r.headers.get('vary')).includes('Cookie'))}}
 const robots=await(await fetch(base+'/robots.txt')).text();assert(robots.includes('Allow: /$')&&robots.includes('Disallow: /?'));
 result.checks.push('real favicon and PNG MIME/bytes, strict homepage robots, GET/HEAD consistency, icons indexable');result.passed=true;await writeFile(report+'/candidate-result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{if(browser)await browser.close();if(bridge?.pid){try{process.kill(-bridge.pid,'SIGTERM')}catch{}}if(created)docker('rm','-f',name);if(networkCreated)docker('network','rm',network);await rm(temp,{recursive:true,force:true});}
