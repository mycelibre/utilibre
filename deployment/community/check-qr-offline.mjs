import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {request} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const origin='https://qrtools.utilibre.org', local=process.argv.includes('--backend');
const output=await mkdtemp('/tmp/utilibre-qr-offline-check-');
let proxy,certificates;
if(local){
  certificates=await mkdtemp('/tmp/utilibre-qr-offline-tls-');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=qrtools.utilibre.org','-keyout',`${certificates}/key.pem`,'-out',`${certificates}/cert.pem`],{stdio:'ignore'});
  proxy=createServer({key:await readFile(`${certificates}/key.pem`),cert:await readFile(`${certificates}/cert.pem`)},(req,res)=>{
    const up=request({host:'10.10.1.43',port:3155,path:req.url,method:req.method,headers:{...req.headers,host:'qrtools.utilibre.org'},timeout:10000},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res)});
    up.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end()});req.pipe(up);
  });
  await new Promise(resolve=>proxy.listen(443,'127.0.0.1',resolve));
}
const browser=await chromium.launch({headless:true,args:local?['--host-resolver-rules=MAP qrtools.utilibre.org 127.0.0.1','--no-proxy-server','--ignore-certificate-errors']:[]});
try{
  for(const [name,width,lang] of [['desktop',1280,'en'],['mobile',390,'es']]){
    const context=await browser.newContext({viewport:{width,height:844},locale:'en-US',ignoreHTTPSErrors:local});
    const page=await context.newPage(),external=new Set(),failed=[];
    context.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.add(r.url())});
    page.on('response',r=>{if(r.status()>=400)failed.push([r.status(),r.url()])});
    page.on('pageerror',e=>{failed.push(['JS',e.message]);console.log('JS error',e.message)});
    page.on('console',m=>{if(m.type()==='error')console.log('Browser error',m.text())});
    assert.equal((await page.goto(`${origin}/?lang=${lang}`,{waitUntil:'networkidle'})).status(),200);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    await page.locator('[data-type="url"]').click();
    await page.locator('#qrForm input[name="url"]').fill('https://utilibre.org/es');
    await page.locator('#generateBtn').click();
    await page.locator('.qr-image').waitFor();
    await page.waitForFunction(()=>document.querySelector('.qr-image')?.naturalWidth>0);
    const decoded=await page.evaluate(()=>{
      const img=document.querySelector('.qr-image'),canvas=document.createElement('canvas');
      canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      return jsQR(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height)?.data;
    });
    assert.equal(decoded,'https://utilibre.org/es');
    assert.equal(await page.evaluate(()=>localStorage.getItem('qr-history')),null);
    for(const format of ['PNG','SVG','PDF']){
      console.log('Export',name,format);
      const pending=page.waitForEvent('download');
      await page.locator(`#export${format}`).click();
      const download=await pending,bytes=await readFile(await download.path());
      assert.ok(bytes.length>100,format);
      if(format==='SVG')assert.match(bytes.toString(),/<svg/);
      if(format==='PDF')assert.equal(bytes.subarray(0,4).toString(),'%PDF');
    }
    // Feed the generated QR through a real canvas MediaStream. This tests the
    // scanner pipeline; it does not claim physical phone-camera coverage.
    await page.evaluate(()=>{
      const img=document.querySelector('.qr-image'),canvas=document.createElement('canvas');
      canvas.width=640;canvas.height=480;
      const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,640,480);ctx.drawImage(img,192,112,256,256);
      navigator.mediaDevices.getUserMedia=async()=>{
        const stream=canvas.captureStream(10);window.testCameraStream=stream;
        const redraw=setInterval(()=>{if(stream.getTracks().every(t=>t.readyState==='ended'))return clearInterval(redraw);ctx.drawImage(img,192,112,256,256)},100);
        return stream;
      };
    });
    await page.locator('#showScannerBtn').click();
    await page.locator('#startScannerBtn').click();
    await page.locator('#scannerResult').waitFor({state:'visible'});
    assert.equal(await page.locator('#resultContent').innerText(),'https://utilibre.org/es');
    assert.equal(await page.evaluate(()=>window.testCameraStream.getTracks().every(t=>t.readyState==='ended')),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${output}/${name}.png`});
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-type="text"]').waitFor();
    console.log({name,decoded,external:[...external],failed});
    assert.deepEqual([...external],[]);assert.deepEqual(failed,[]);
    await context.close();
  }
  console.log(`QR Offline ${local?'protected backend':'public HTTPS'} generation, decoding, PNG/SVG/PDF, synthetic camera, Spanish/mobile, privacy and offline checks passed. Screenshots: ${output}`);
}finally{
  await browser.close();if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve))}
  if(certificates)await rm(certificates,{recursive:true});
}
