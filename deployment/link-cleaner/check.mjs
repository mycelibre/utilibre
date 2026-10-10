import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const base=process.argv[2]||'https://cleaner.invalid/apps/link-cleaner/';
const report='/opt/utilibre/reports/link-cleaner-20261009';await mkdir(report,{recursive:true,mode:0o700});
const b=await chromium.launch();const c=await b.newContext({acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});const requests=[],outside=[],errors=[];
await c.addInitScript(()=>{localStorage.setItem('settings','fictional-other-tool');localStorage.setItem('history','fictional-other-history')});
await c.route('**/*',async r=>{const u=new URL(r.request().url());requests.push(u.href);if(u.origin!==new URL(base).origin){outside.push(u.href);return r.abort()}if(u.hostname==='cleaner.invalid'){const rel=u.pathname.replace(/^\/apps\/link-cleaner\//,'');return r.fulfill({path:path.join('/opt/utilibre/src/url-parameter-cleaner/dist/site',rel||'index.html')})}return r.continue()});
const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(base);await p.locator('#url-input').fill('https://example.invalid/article?id=42&utm_source=fixture&tag=a%2Bb&tag=b#section\nhttps://example.invalid/private?token=fictional-token&fbclid=fixture#fictional-key\njavascript:alert(1)');
 await p.getByRole('button',{name:'Review cleaned URLs',exact:true}).click();await p.getByText('2 valid · 2 cleaned · 2 parameters removed · 1 invalid',{exact:true}).waitFor();
 await p.getByRole('button',{name:'Copy valid results',exact:true}).click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),'https://example.invalid/article?id=42&tag=a%2Bb&tag=b#section\nhttps://example.invalid/private?token=fictional-token#fictional-key');
 let d=p.waitForEvent('download');await p.getByRole('button',{name:'Export audit JSON',exact:true}).click();await(await d).saveAs(report+'/fictional-redacted.json');const audit=await readFile(report+'/fictional-redacted.json','utf8');assert.doesNotMatch(audit,/fictional-token|fictional-key|utm_source=fixture/);assert.equal(JSON.parse(audit).redacted,true);
 await p.locator('#custom-remove').fill('campaign_id, affiliate_*');await p.locator('#custom-keep').fill('affiliate_code');d=p.waitForEvent('download');await p.getByRole('button',{name:'Export rule profile',exact:true}).click();await(await d).saveAs(report+'/fictional-rules.json');await p.reload();await p.locator('#import-profile').setInputFiles(report+'/fictional-rules.json');await p.waitForFunction(()=>document.querySelector('#custom-keep').value==='affiliate_code');assert.equal(await p.locator('#custom-remove').inputValue(),'campaign_id, affiliate_*');
 assert.equal(await p.locator('#url-input').inputValue(),'');assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),{settings:'fictional-other-tool',history:'fictional-other-history'});
 await p.setViewportSize({width:375,height:812});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:report+'/mobile.png',fullPage:true});
 assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);await writeFile(report+'/result.json',JSON.stringify({date:new Date().toISOString(),base,knownTrackersRemoved:true,unknownQueryAndFragmentPreserved:true,redactedExport:true,profileRoundtrip:true,noAppStorage:true,requests,outside,errors},null,2));console.log('PASS native conservative cleaning, clipboard, redacted JSON, profile roundtrip, mobile width, no outside requests or application storage');
}finally{await b.close()}
