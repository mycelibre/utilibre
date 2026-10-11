import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import dns from 'node:dns';
import { isIP } from 'node:net';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
const base = process.env.SPEEDTEST_BASE || 'http://127.0.0.1:3225';
const origin = new URL(base).origin;
// Explicit test-only edge override for a VM without public-IP hairpin routing.
const edge = process.env.SPEEDTEST_EDGE_IP;
if (edge) {
  assert(isIP(edge), 'The edge override must be an IP address');
  const lookup = dns.lookup;
  dns.lookup = (hostname, ...args) => lookup(hostname === new URL(base).hostname ? edge : hostname, ...args);
}
const report = process.env.SPEEDTEST_REPORT || '/opt/utilibre/reports/librespeed-20261011';
mkdirSync(report, { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true, args: edge ? [`--host-resolver-rules=MAP ${new URL(base).hostname} ${edge}`] : [] });
try {
  for (const lang of ['en', 'es']) {
    const context = await browser.newContext({viewport: lang === 'es' ? {width:390,height:844} : {width:1280,height:900}});
    const outside = new Set(), paths = new Set(), failures = [];
    context.on('request', request => {
      const url = new URL(request.url());
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        paths.add(url.pathname);
        if (url.origin !== origin) outside.add(url.origin);
      }
    });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    const response = await page.goto(`${base}/${lang === 'es' ? 'es.html' : ''}`);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
    await page.waitForTimeout(800);
    assert(![...paths].some(path=>path.startsWith('/backend/')), 'No automatic network test on load');
    await page.locator('#startStopBtn').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#startStopBtn').className === 'running');
    await page.waitForFunction(()=>/^(Test finished|Prueba terminada)/.test(document.querySelector('#state').textContent), null, {timeout:65000});
    const values = await page.locator('#dlText, #ulText, #pingText, #jitText').allTextContents();
    assert(values.every(value=>Number.isFinite(Number(value)) && Number(value)>=0), JSON.stringify(values));
    assert(Number(values[0])>0 && Number(values[1])>0, `Throughput must be positive: ${values}`);
    assert.deepEqual([...outside], [], 'No third-party browser requests');
    assert(![...paths].some(path=>/getIP|telemetry|results/.test(path)), 'No IP lookup/results upload');
    assert.deepEqual(failures, []);
    assert.equal((await context.cookies()).length, 0);
    assert.equal(await page.evaluate(()=>localStorage.length + sessionStorage.length), 0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({path:`${report}/${lang}.png`,fullPage:true});
    await page.locator('#startStopBtn').click();
    await page.waitForTimeout(500);
    await page.locator('#startStopBtn').click();
    await page.waitForFunction(()=>/^(Test stopped|Prueba detenida)/.test(document.querySelector('#state').textContent));
    results.push({language:lang,viewport:page.viewportSize(),values,paths:[...paths].sort(),thirdPartyRequests:outside.size,passed:'load, keyboard start, complete test, stop, no storage, no overflow'});
    await context.close();
  }
  for (const path of ['/getIP?isp=true','/backend/getIP.php?isp=true','/stats','/results','/index-classic.html','/settings.toml','/missing-file']) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 404, path);
  }
  assert.equal((await fetch(`${base}/backend/empty.php`,{headers:{Origin:'https://unrelated.invalid'}})).status,403);
  assert.equal((await fetch(`${base}/backend/empty.php`,{method:'POST',body:new Uint8Array(21*1024*1024+1)})).status,413);
  assert.equal((await fetch(`${base}/healthz`,{method:'POST',body:'not a test endpoint'})).status,403);
  assert.equal((await fetch(`${base}/results/telemetry`,{method:'POST',body:'synthetic'})).status,403);
  // One bounded response and eight short overlapping streams, never a load test.
  const started = performance.now();
  const bounded = await fetch(`${base}/backend/garbage.php?ckSize=1024`, {signal:AbortSignal.timeout(15000)});
  assert.equal(bounded.status,200);
  const bytes = (await bounded.arrayBuffer()).byteLength;
  const seconds = (performance.now()-started)/1000;
  assert.equal(bytes,32*1024*1024, 'Untrusted chunk-size query cannot expand a response');
  assert.equal(bounded.headers.get('access-control-allow-origin'),null);
  const controllers = Array.from({length:8},()=>new AbortController());
  let statuses;
  try {
    const responses = await Promise.all(controllers.map(controller=>fetch(`${base}/backend/garbage.php`, {signal:controller.signal})));
    statuses = responses.map(response=>response.status);
    assert.equal(statuses.filter(status=>status===200).length,6, JSON.stringify(statuses));
    assert.equal(statuses.filter(status=>status===429).length,2, JSON.stringify(statuses));
  } finally { controllers.forEach(controller=>controller.abort()); }
  const headers = (await fetch(`${base}/`)).headers;
  assert.equal(headers.get('referrer-policy'),'no-referrer');
  assert(headers.get('content-security-policy').includes("connect-src 'self'"));
  assert.equal(headers.get('content-encoding'),null);
  assert(headers.get('cache-control').includes('no-store'));
  writeFileSync(`${report}/summary.json`,JSON.stringify({date:new Date().toISOString(),base,edgeOverride:edge||null,browser:browser.version(),results,limits:{bytes,seconds,statuses},security:'unused GET routes 404; cross-origin denied; oversized uploads 413; health/telemetry POST denied; CSP; no compression'},null,2));
  console.log(JSON.stringify({passed:true,report,results},null,2));
} finally { await browser.close(); }
