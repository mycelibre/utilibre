// Bounded operator test against our own instance; no visitor instrumentation.
// Optionally run inside an isolated client network namespace with tc netem.
import assert from 'node:assert/strict';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const mode=process.env.SPEED_PROTOCOL||'auto';
assert(['auto','h1','h2','h3'].includes(mode));
const order=process.env.SPEED_TEST_ORDER||'P_D';
assert(['P_D','P_U','P_D_U'].includes(order));
const flags=mode==='auto'?[]:mode==='h1'?['--disable-http2','--disable-quic']:mode==='h2'?['--disable-quic']:['--origin-to-force-quic-on=speed.utilibre.org:443'];
const browser=await chromium.launch({args:['--host-resolver-rules=MAP speed.utilibre.org 10.10.1.3',...flags]});
try {
  const page=await browser.newPage();
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const protocols=new Set(),statuses={};
  cdp.on('Network.responseReceived',e=>protocols.add(e.response.protocol));
  page.context().on('response',r=>{
    if(r.url().includes('/backend/'))statuses[r.status()]=(statuses[r.status()]||0)+1;
  });
  await page.goto('https://speed.utilibre.org/');
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
  console.log(JSON.stringify({date:new Date().toISOString(),mode,order,protocols:[...protocols],values,statuses}));
}finally{await browser.close()}
