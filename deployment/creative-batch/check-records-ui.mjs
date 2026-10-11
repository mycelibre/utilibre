import {chromium} from '../../portal/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox']});const reports=[];
for(const name of ['grist','candlr','bookplate']){
 const state='/opt/utilibre/records/private/'+(name==='bookplate'?'bookplate-state-0':'browser-state-0')+'.json';
 const c=await browser.newContext({storageState:state}),p=await c.newPage(),requests=[];
 p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(new URL(r.url()).origin);});
 await p.goto(`https://${name}.utilibre.org/`,{waitUntil:'networkidle'});
 const report={name,body:(await p.locator('body').innerText()).slice(0,9000),origins:[...new Set(requests)]};reports.push(report);
 await p.screenshot({path:'/opt/utilibre/reports/records-20261011/'+name+'-final.png'});await c.close();
}
await browser.close();await writeFile('/opt/utilibre/reports/records-20261011/ui.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
