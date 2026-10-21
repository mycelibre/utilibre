// Synthetic 2.0.6 -> 2.1.0 compatibility check. Never mounts production data.
import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {mkdtemp, mkdir, chown, chmod, writeFile, readFile, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
const root=fileURLToPath(new URL('../../../',import.meta.url));
const previous='utilibre-privatebin:2.0.6-php-security-20261011-p3';
const candidate='utilibre-privatebin:2.1.0-security-20261021-p2';
const baseline='ed2291d';
const report=await mkdtemp('/opt/utilibre/reports/privatebin-upgrade-');
const temp=await mkdtemp('/tmp/utilibre-privatebin-compat-');
const name=`utilibre-privatebin-compat-${process.pid}`,network=`${name}-net`;
const base='http://127.0.0.1:43219';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',maxBuffer:1024**2,timeout:30000,stdio:['ignore','pipe','pipe']});
const sum=b=>createHash('sha256').update(b).digest('hex');
const errors=[],outside=new Set(),checks=[];
let bridge,browser,created=false,networkCreated=false;
function stop(){
  if(bridge?.pid){try{process.kill(-bridge.pid,'SIGTERM')}catch{} bridge=undefined;}
  if(created){docker('rm','-f',name);created=false;}
}
async function start(image,config){
  const mounts=[['conf.php','/srv/cfg/conf.php'],['bootstrap5-utilibre.php','/srv/tpl/bootstrap5-utilibre.php'],['robots.txt','/var/www/robots.txt'],['manifest.json','/var/www/manifest.json'],['brand','/var/www/utilibre-brand'],['brand/favicon.ico','/var/www/favicon.ico'],['discovery-server.conf','/etc/nginx/server.d/utilibre-discovery.conf'],['discovery-location.conf','/etc/nginx/location.d/utilibre-discovery.conf'],['upload-limit.js','/var/www/js/utilibre-upload-limit.js'],['upload-guard.php','/srv/cfg/upload-guard.php'],['uploads.ini','/etc/php85/conf.d/zz-utilibre-uploads.ini'],['uploads-pool.conf','/etc/php85/php-fpm.d/zzz-utilibre-uploads.conf']].flatMap(([s,d])=>['-v',`${config}/${s}:${d}:ro`]);
  docker('run','-d','--name',name,'--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--cpus','0.5','--memory','768m','--memory-swap','768m','--pids-limit','128','--log-driver','none','--tmpfs','/run:rw,exec,nosuid,nodev,size=16m,mode=0755,uid=65534,gid=82','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777','--tmpfs','/var/lib/nginx/tmp:rw,nosuid,nodev,noexec,size=128m,mode=0755,uid=65534,gid=82','-v',`${temp}/data:/srv/data`,...mounts,image);created=true;
  const ip=JSON.parse(docker('inspect',name))[0].NetworkSettings.Networks[network].IPAddress;
  bridge=spawn('socat',['TCP4-LISTEN:43219,bind=127.0.0.1,reuseaddr,fork,max-children=8',`TCP4:${ip}:8080`],{detached:true,stdio:'ignore'});
  for(let n=0;n<30;n++){
    try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}
    await new Promise(r=>setTimeout(r,500));
  }
  throw Error('Isolated PrivateBin did not start');
}
async function page(){
  const context=await browser.newContext({locale:'en-US',acceptDownloads:true});
  context.on('request',r=>{const u=new URL(r.url());if(u.protocol.startsWith('http')&&u.origin!==base)outside.add(u.origin);});
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  return context.newPage();
}
async function send(p,text,file,password,burn=false){
  await p.goto(base+'/');await p.locator('#message').fill(text);
  if(file)await p.locator('#file').setInputFiles({name:'fictional-upgrade.txt',mimeType:'text/plain',buffer:file});
  if(password)await p.locator('#passwordinput').fill(password);
  if(burn)await p.locator('#burnafterreading').check();
  const response=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().startsWith(base));
  await p.locator('#sendbutton').click();const receipt=await(await response).json();assert.equal(receipt.status,0,receipt.message);
  await p.waitForFunction(()=>location.hash.length>15);
  return {link:p.url(),receipt};
}
try{
  assert.equal(docker('image','inspect',previous,'--format','{{.Id}}').trim(),'sha256:4bd1fbaaae5c7e0e74285412a4cd7b02de6c456a8d4b5d8430791e05e70e8915');
  await mkdir(`${temp}/old`);await mkdir(`${temp}/data`);await chown(`${temp}/data`,65534,82);
  await writeFile(`${temp}/data/.utilibre-temporary-volume`,'utilibre-privatebin-temporary-v1\n');await chmod(`${temp}/data/.utilibre-temporary-volume`,0o444);
  // This committed configuration contains no credentials or user content.
  const archive=execFileSync('git',['archive',baseline,'deployment/utilibre/config/privatebin'],{cwd:root,maxBuffer:1024**2});
  execFileSync('tar',['-xf','-','-C',`${temp}/old`],{input:archive});
  docker('network','create','--internal',network);networkCreated=true;
  browser=await chromium.launch();
  await start(previous,`${temp}/old/deployment/utilibre/config/privatebin`);
  const writer=await page(),file=Buffer.from('Fictional pre-upgrade attachment. Árbol, año, 123.\n');
  const old=await send(writer,'Fictional protected paste created on 2.0.6.',file,'Synthetic-only-7!');
  await writer.context().close();stop();
  await start(candidate,`${root}deployment/utilibre/config/privatebin`);
  const reader=await page();await reader.goto(old.link);
  await reader.locator('#passworddecrypt').fill('Synthetic-only-7!');
  await reader.locator('#passwordform button[type=submit]').click();
  await reader.getByText('Fictional protected paste created on 2.0.6.',{exact:true}).waitFor();
  const attachment=reader.locator('#attachment a[download="fictional-upgrade.txt"]');
  const downloaded=reader.waitForEvent('download');await attachment.click();await(await downloaded).saveAs(`${temp}/result.txt`);
  assert.equal(sum(await readFile(`${temp}/result.txt`)),sum(file));
  checks.push('2.0.6 password-protected paste and UTF-8 attachment decrypt after 2.1.0 upgrade; file SHA-256 matches');
  const stranger=await page();await stranger.goto(old.link.split('#')[0]);
  assert(!(await stranger.locator('body').innerText()).includes('Fictional protected paste created on 2.0.6.'));
  const deleted=await fetch(`${base}/?pasteid=${old.receipt.id}&deletetoken=${old.receipt.deletetoken}`,{headers:{'X-Requested-With':'JSONHttpRequest'}});
  assert.equal((await deleted.json()).status,0);
  const absent=await fetch(`${base}/?${old.receipt.id}`,{headers:{'X-Requested-With':'JSONHttpRequest'}});assert.equal((await absent.json()).status,1);
  checks.push('unkeyed old paste does not reveal content; original deletion token removes the upgraded paste');
  await new Promise(r=>setTimeout(r,11000));
  const burner=await page(),burn=await send(burner,'Fictional one-time check.',null,null,true);
  const first=await page();await first.goto(burn.link);
  await first.locator('#loadconfirm-open-now').click();await first.getByText('Fictional one-time check.',{exact:true}).waitFor();
  const spent=await fetch(`${base}/?${burn.receipt.id}`,{headers:{'X-Requested-With':'JSONHttpRequest'}});assert.equal((await spent.json()).status,1);
  checks.push('new native burn-after-reading paste decrypts once and is then absent');
  assert.deepEqual(errors,[]);assert.deepEqual([...outside],[]);
  const result={date:new Date().toISOString(),passed:true,previous,candidate,checks,externalRequests:[...outside],browser:'Linux Chromium; synthetic isolated data only',limitations:['not a real-device or Opera test','no real paste read or copied'],report};
  await writeFile(`${report}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){
  await writeFile(`${report}/failure.json`,JSON.stringify({error:error.message,checks,errors},null,2));throw error;
}finally{
  if(browser)await browser.close();stop();if(networkCreated)docker('network','rm',network);
  assert(temp.startsWith('/tmp/utilibre-privatebin-compat-'));await rm(temp,{recursive:true});
}
