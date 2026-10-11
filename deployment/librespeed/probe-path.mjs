// Bounded operator test against our own instance; no visitor instrumentation.
// Optionally run inside an isolated client network namespace with tc netem.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(process.env.SPEED_PLAYWRIGHT_PACKAGE||new URL('../../portal/package.json',import.meta.url));
const {chromium}=require('playwright-core');
const path=process.env.SPEED_PATH||'edge';
assert(['edge','public'].includes(path), 'Use only the fixed edge or public instance');
const mode=process.env.SPEED_PROTOCOL||'auto';
assert(['auto','h1','h2','h3'].includes(mode));
const order=process.env.SPEED_TEST_ORDER||'P_D';
assert(['P_D','P_U','P_D_U'].includes(order));
const flags=mode==='auto'?[]:mode==='h1'?['--disable-http2','--disable-quic']:mode==='h2'?['--disable-quic']:['--origin-to-force-quic-on=speed.utilibre.org:443'];
const origin='https://speed.utilibre.org';
const browser=await chromium.launch({
  ...(process.env.SPEED_CHROME?{executablePath:process.env.SPEED_CHROME}:{}),
  args:[...(path==='edge'?['--host-resolver-rules=MAP speed.utilibre.org 10.10.1.3']:[]),...flags],
});
try {
  const page=await browser.newPage();
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const protocols=new Set(),statuses={};
  let outsideRequests=0,pageErrors=0;
  page.on('pageerror',()=>pageErrors++);
  page.context().on('request',request=>{
    const url=new URL(request.url());
    if(['http:','https:'].includes(url.protocol)&&url.origin!==origin)outsideRequests++;
  });
  cdp.on('Network.responseReceived',e=>protocols.add(e.response.protocol));
  page.context().on('response',r=>{
    if(r.url().includes('/backend/'))statuses[r.status()]=(statuses[r.status()]||0)+1;
  });
  const response=await page.goto(origin,{timeout:20000});
  assert.equal(response.status(),200,'Public page must load normally');
  assert.equal(new URL(page.url()).origin,origin,'No cross-origin redirect');
  const server=await response.serverAddr();
  await page.evaluate(order=>{
    s.setParameter('test_order',order);
    s.setParameter('count_ping',3);
    s.setParameter('time_dl_max',8);
    s.setParameter('time_ul_max',8);
    s.setParameter('time_auto',false);
  },order);
  await page.locator('#startStopBtn').click();
  await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('Test finished'),null,{timeout:45000});
  const values=await page.locator('#dlText,#ulText,#pingText,#jitText').allTextContents();
  const storageEntries=await page.evaluate(()=>localStorage.length+sessionStorage.length);
  const cookies=(await page.context().cookies()).length;
  const result={date:new Date().toISOString(),path,mode,order,browser:browser.version(),server,
    measurementSecondsPerDirection:8,protocols:[...protocols],values,
    units:['Mbps download','Mbps upload','ms ping','ms jitter'],statuses,outsideRequests,pageErrors,storageEntries,cookies};
  console.log('UTILIBRE_SPEED_RESULT '+JSON.stringify(result));
  assert.equal(outsideRequests,0,'No third-party application requests');
  assert.equal(pageErrors,0,'No page errors');
  assert.equal(storageEntries+cookies,0,'No saved results or identifiers');
  assert.deepEqual(Object.keys(statuses),['200'],'All observed test responses must succeed');
  assert(Number(values[2])>0,'Native ping must complete');
  if(order.includes('D'))assert(Number(values[0])>0,'Native download must complete');
  if(order.includes('U'))assert(Number(values[1])>0,'Native upload must complete');
}finally{await browser.close()}
