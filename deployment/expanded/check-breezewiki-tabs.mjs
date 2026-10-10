// Offline native-module regression: JSONP-off pages must not initialize JSONP.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const source='/opt/utilibre/expanded-src/breezewiki-utilibre-p1/static';
const fixture=`<!doctype html><script>const BWData={jsonp:false}</script>
<script type="importmap">{"imports":{"preact":"/preact.js","jsonp":"/jsonp.js"}}</script>
<body class="bw-tabs-nojs"><div class="wds-tabber">
<div class="wds-tabs__wrapper"><button class="wds-tabs__tab wds-is-current" data-hash="first">First</button><button class="wds-tabs__tab" data-hash="second">Second</button></div>
<div class="wds-tab__content wds-is-current">Fictional first pane</div><div class="wds-tab__content">Fictional second pane</div>
</div><script type="module" src="/tabs.js"></script></body>`;
let jsonpRequests=0;
const server=http.createServer(async(req,res)=>{
 if(req.url==='/jsonp.js'){jsonpRequests++;res.writeHead(500);return res.end('JSONP must remain unused')}
 if(['/tabs.js','/preact.js'].includes(req.url)){res.setHeader('Content-Type','text/javascript');return res.end(await readFile(source+req.url))}
 res.setHeader('Content-Type','text/html');res.end(fixture);
});
await new Promise(resolve=>server.listen(43220,'127.0.0.1',resolve));
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
 await page.goto('http://127.0.0.1:43220/');
 await page.waitForFunction(()=>!document.body.classList.contains('bw-tabs-nojs'));
 await page.getByRole('button',{name:'Second'}).click();
 assert.equal(await page.locator('.wds-tab__content.wds-is-current').innerText(),'Fictional second pane');
 assert.equal(new URL(page.url()).hash,'#second');
 await page.getByRole('button',{name:'First'}).click();
 assert.equal(await page.locator('.wds-tab__content.wds-is-current').innerText(),'Fictional first pane');
 await page.goto('http://127.0.0.1:43220/?fixture=second-load#second');
 await page.waitForFunction(()=>!document.body.classList.contains('bw-tabs-nojs'));
 assert.equal(await page.locator('.wds-tab__content.wds-is-current').innerText(),'Fictional second pane');
 assert.deepEqual(errors,[]);assert.equal(jsonpRequests,0);
 const result={nativeTabsSwitch:true,hashSelection:true,jsonpRequests,pageErrors:errors};
 await writeFile('/opt/utilibre/reports/frontend-reliability-20261009/breezewiki-tabs.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
