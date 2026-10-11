// Bounded synthetic native-browser check. Default: isolated candidate; --public:
// exactly one 25 MB encrypted paste on our instance, deleted in finally.
import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {mkdtemp, mkdir, chown, writeFile, readFile, rm, chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomBytes, createHash} from 'node:crypto';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
assert(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--public'));
const live = process.argv.includes('--public');
const base = live ? 'https://paste.utilibre.org' : 'http://127.0.0.1:3185';
const recipe = fileURLToPath(new URL('../config/privatebin/', import.meta.url));
const output = await mkdtemp('/opt/utilibre/reports/privatebin-uploads-');
const temp = await mkdtemp('/opt/utilibre/privatebin-upload-test-');
const name = `utilibre-privatebin-upload-test-${process.pid}`, network = `${name}-net`;
const docker = (...args) => execFileSync('docker', args, {encoding:'utf8', stdio:['ignore','pipe','pipe'], maxBuffer:1024*1024});
let bridge, browser, page, receipt, created=false, networkCreated=false;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const errors=[], outside=new Set(), checks=[];
try {
  if (!live) {
    await mkdir(`${temp}/data`); await chown(`${temp}/data`,65534,82);
    const marker = `${temp}/data/.utilibre-temporary-volume`;
    await writeFile(marker, 'utilibre-privatebin-temporary-v1\n'); await chmod(marker,0o444);
    docker('network','create','--internal',network); networkCreated=true;
    const mounts = [['conf.php','/srv/cfg/conf.php'],['bootstrap5-utilibre.php','/srv/tpl/bootstrap5-utilibre.php'],['robots.txt','/var/www/robots.txt'],['manifest.json','/var/www/manifest.json'],['brand','/var/www/utilibre-brand'],['brand/favicon.ico','/var/www/favicon.ico'],['discovery-server.conf','/etc/nginx/server.d/utilibre-discovery.conf'],['discovery-location.conf','/etc/nginx/location.d/utilibre-discovery.conf'],['upload-limit.js','/var/www/js/utilibre-upload-limit.js'],['upload-guard.php','/srv/cfg/upload-guard.php'],['uploads.ini','/etc/php85/conf.d/zz-utilibre-uploads.ini'],['uploads-pool.conf','/etc/php85/php-fpm.d/zzz-utilibre-uploads.conf']].flatMap(([file,target])=>['-v',`${recipe}${file}:${target}:ro`]);
    docker('run','-d','--name',name,'--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--cpus','0.5','--memory','768m','--pids-limit','128','--log-driver','none','--tmpfs','/run:rw,exec,nosuid,nodev,size=16m,mode=0755,uid=65534,gid=82','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777','--tmpfs','/var/lib/nginx/tmp:rw,nosuid,nodev,noexec,size=128m,mode=0755,uid=65534,gid=82','-v',`${temp}/data:/srv/data`,...mounts,'docker.io/privatebin/nginx-fpm-alpine:2.0.6@sha256:13290e2f04bfd98cf8fc7e8d216fb76b2b2d12373d4923b859cd41c2d984fde8'); created=true;
    const ip=JSON.parse(docker('inspect',name))[0].NetworkSettings.Networks[network].IPAddress;
    bridge=spawn('socat',['TCP4-LISTEN:3185,bind=127.0.0.1,reuseaddr,fork,max-children=16',`TCP4:${ip}:8080`],{detached:true,stdio:'ignore'});
    let ready=false;for(let n=0;n<30;n++){try{ready=(await fetch(base,{signal:AbortSignal.timeout(1000)})).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500))}assert(ready);
    docker('exec',name,'nginx','-t');
    docker('exec',name,'php','-r',"require '/srv/cfg/upload-guard.php'; if(utilibreHasUploadHeadroom(false)||utilibreHasUploadHeadroom(1024**3-1)||!utilibreHasUploadHeadroom(1024**3))exit(1);");
    checks.push('candidate native config validation and low-disk admission boundary');
    for (const invalid of [null, 'wrong-volume\n']) {
      if (invalid === null) await rm(marker); else { await writeFile(marker,invalid); await chmod(marker,0o444); }
      for (const method of ['GET','POST']) {
        const response=await fetch(base+'/',{method}); assert.equal(response.status,503);
        assert.equal(response.headers.get('cache-control'),'no-store');
        assert.equal((await response.json()).status,1);
      }
    }
    await writeFile(marker,'utilibre-privatebin-temporary-v1\n'); await chmod(marker,0o444);
    assert((await fetch(base+'/')).ok);
    checks.push('missing/invalid volume marker fails GET health and POST admission; restored volume recovers');
  }
  browser=await chromium.launch();
  const context=await browser.newContext({locale:'en-US',viewport:{width:1280,height:900},acceptDownloads:true});
  context.on('request',r=>{const u=new URL(r.url());if(u.protocol.startsWith('http')&&u.origin!==base)outside.add(u.origin)});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  assert.equal((await page.goto(base+'/')).status(),200);
  // Inspect native AJAX in this disposable test page. Chromium may evict large
  // response bodies from its inspector cache; do not depend on that cache.
  await page.evaluate(()=>{
    jQuery.ajaxPrefilter(options=>{
      if(options.type.toUpperCase()!=='POST')return;
      const payload=JSON.parse(options.data),{ct,...fields}=payload;
      window.fixtureRequest={fields,ciphertextBytes:ct.length,filenameVisible:options.data.includes('fictional-25MB.bin')};
    });
    jQuery(document).ajaxComplete((_event,xhr,settings)=>{
      if(settings.type.toUpperCase()!=='POST')return;
      const {status,id,deletetoken,message}=xhr.responseJSON??{};
      window.fixtureReceipt={status,id,deletetoken,message};
    });
  });
  await page.locator('#message').fill('Fictional attachment check. Random test bytes, no personal information.');
  // File picker rejects 25 MB + 1 before the upstream FileReader/encryption path.
  let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++});
  await page.locator('#file').setInputFiles({name:'fictional-too-large.bin',mimeType:'application/octet-stream',buffer:Buffer.alloc(25_000_001)});
  await page.getByText('Files exceed 25 MB in total (25,000,000 bytes). Choose smaller files.',{exact:true}).waitFor();
  assert.equal(posts,0);assert.equal(await page.locator('#file').evaluate(e=>e.files.length),0);
  checks.push('25 MB + 1 rejected locally, without upload');
  const bytes=randomBytes(25_000_000), expected=hash(bytes);
  await page.locator('#file').setInputFiles({name:'fictional-25MB.bin',mimeType:'application/octet-stream',buffer:bytes});
  await page.waitForFunction(()=>jQuery.PrivateBin.AttachmentViewer.hasAttachmentData(),{},{timeout:60000});
  const expiration=await page.locator('#expiration select').count();
  if (expiration) await page.locator('#expiration select').selectOption('1week');
  else {await page.locator('#expiration button').click();await page.locator('#expiration a[data-expiration="1week"]').click();}
  const sent=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().startsWith(base),{timeout:120000});
  await page.locator('#sendbutton').click();
  const response=await sent;assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.fixtureReceipt,{},{timeout:120000});
  receipt=await page.evaluate(()=>window.fixtureReceipt);assert.equal(receipt.status,0,receipt.message);
  await page.waitForFunction(()=>location.hash.length>15);
  const link=page.url();
  await writeFile(`${output}/cleanup.json`,JSON.stringify(receipt),{mode:0o600});
  const posted=await page.evaluate(()=>window.fixtureRequest);
  assert.equal(posted.fields.meta.expire,'1week');assert(posted.ciphertextBytes<=35_000_000);
  assert.equal(posted.filenameVisible,false);
  const reader=await context.newPage(), readEvents=[];
  reader.on('pageerror',e=>readEvents.push({error:e.message}));
  reader.on('response',r=>readEvents.push({path:new URL(r.url()).pathname,status:r.status()}));
  reader.on('requestfailed',r=>readEvents.push({path:new URL(r.url()).pathname,failed:r.failure()?.errorText}));
  await reader.goto(link);
  const attachment=reader.locator('#attachment a[download="fictional-25MB.bin"]');
  try { await attachment.waitFor({timeout:60000}); }
  catch(error){
    const diagnostic={readEvents,alert:await reader.locator('#errormessage').innerText().catch(()=>''),attachmentLinks:await reader.locator('#attachment a[download]').count()};
    await writeFile(`${output}/failure.json`,JSON.stringify(diagnostic,null,2));
    console.error(JSON.stringify(diagnostic));throw error;
  }
  const download=reader.waitForEvent('download',{timeout:60000});await attachment.click();
  await (await download).saveAs(`${temp}/download.bin`);assert.equal(hash(await readFile(`${temp}/download.bin`)),expected);
  checks.push('25,000,000 random-byte attachment encrypted, downloaded and SHA-256 matched');
  const metadata=await (await fetch(`${base}/?${receipt.id}`,{headers:{'X-Requested-With':'JSONHttpRequest'}})).json();
  assert(metadata.meta.time_to_live>604000&&metadata.meta.time_to_live<=604800);
  checks.push('server remaining lifetime no greater than one week');
  assert.deepEqual(await page.locator('#pasteExpiration option').evaluateAll(items=>items.map(i=>i.value)),['5min','10min','1hour','1day','1week']);
  if (!live) {
    // Exercise server ciphertext enforcement without retaining any new content.
    await new Promise(resolve=>setTimeout(resolve,11000));
    const rejected=await (await fetch(base+'/',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'JSONHttpRequest'},body:JSON.stringify({...posted.fields,ct:randomBytes(26_250_003).toString('base64')})})).json();
    assert.equal(rejected.status,1);assert.match(rejected.message,/limited/);
    checks.push('server rejects ciphertext beyond 35,000,000 bytes');
    docker('exec',name,'php','-r',"define('PATH','/srv/');require PATH.'vendor/autoload.php';$m=new PrivateBin\\Model(new PrivateBin\\Configuration);$p=['v'=>2,'ct'=>'fictional-expired-record','meta'=>['expire_date'=>time()-1]];if(!$m->getStore()->create('1111111111111111',$p))exit(1);");
    docker('exec',name,'php','/srv/bin/administration','--purge');
    docker('exec',name,'php','-r',"define('PATH','/srv/');require PATH.'vendor/autoload.php';$m=new PrivateBin\\Model(new PrivateBin\\Configuration);if($m->getStore()->exists('1111111111111111'))exit(1);");
    checks.push('native scheduled-purge command removes expired fictional record');
  }
  const unkeyed=await context.newPage();await unkeyed.goto(`${base}/?${receipt.id}`);
  assert.equal(await unkeyed.locator('#attachment a[download]').count(),0);
  await page.goto(base+'/');await page.screenshot({path:`${output}/en-desktop.png`});
  const spanish=await browser.newContext({locale:'es-GT',viewport:{width:390,height:844}});
  spanish.on('request',r=>{const u=new URL(r.url());if(u.protocol.startsWith('http')&&u.origin!==base)outside.add(u.origin)});
  const mobile=await spanish.newPage();await mobile.goto(base+'/');await mobile.locator('#message').waitFor();
  assert.match(await mobile.locator('body').innerText(),/25 MB/);
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await mobile.screenshot({path:`${output}/es-mobile.png`});
  assert.deepEqual(errors,[]);assert.deepEqual([...outside],[]);
  const result={date:new Date().toISOString(),base,passed:true,checks,ciphertextBytes:posted.ciphertextBytes,rawBytes:bytes.length,browser:'Linux Chromium desktop and 390px mobile emulation',limitations:['not a physical phone/Opera test','raw file limit is browser-side; server limits encrypted bytes','earlier and whole-VM backups are separate'],output};
  await writeFile(`${output}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {
  try { if(receipt?.id&&receipt?.deletetoken){
    const r=await fetch(`${base}/?pasteid=${receipt.id}&deletetoken=${receipt.deletetoken}`,{headers:{'X-Requested-With':'JSONHttpRequest'}});
    assert.equal((await r.json()).status,0,'Synthetic paste deletion failed; inspect private cleanup receipt');
    await rm(`${output}/cleanup.json`,{force:true});
  } } finally {
  if(browser)await browser.close();
  if(bridge?.pid){try{process.kill(-bridge.pid,'SIGTERM')}catch{}}
  if(created)docker('rm','-f',name);if(networkCreated)docker('network','rm',network);
  await rm(temp,{recursive:true});
  }
}
