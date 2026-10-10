import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const base=process.argv[2]||'http://127.0.0.1:3209/';
const report='/opt/utilibre/reports/unfurl-20261009';await mkdir(report,{recursive:true,mode:0o700});
const b=await chromium.launch();const c=await b.newContext({permissions:['clipboard-read','clipboard-write']});const outside=[],errors=[],requests=[];
await c.route('**/*',r=>{const u=new URL(r.request().url());requests.push(u.href);if(u.origin!==new URL(base).origin){outside.push(u.href);return r.abort()}return r.continue()});
const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(base);await p.getByLabel('URL to inspect').fill('https://example.invalid/library?book=fictional-title&count=24');await p.getByRole('button',{name:'Unfurl!',exact:true}).click();
 await p.getByRole('button',{name:'Text',exact:true}).waitFor({state:'visible',timeout:25000});await p.getByRole('button',{name:'Text',exact:true}).click();await p.locator('#unfurl_tree').getByText('fictional-title',{exact:false}).waitFor();
 await p.getByRole('button',{name:'Copy tree to clipboard',exact:true}).click();const copied=await p.evaluate(()=>navigator.clipboard.readText());assert.match(copied,/fictional-title/);assert.match(copied,/count/);
 await p.getByRole('button',{name:'Tree',exact:true}).click();await p.locator('#unfurl_d3_wrapper svg').waitFor();await p.getByRole('button',{name:'Graph',exact:true}).click();await p.locator('#unfurl_graph canvas').waitFor();
 assert(await p.getByRole('link',{name:'More tools from Utilibre',exact:true}).count());
 await p.setViewportSize({width:375,height:812});await p.screenshot({path:report+'/mobile.png',fullPage:true});
 assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);await writeFile(report+'/browser-result.json',JSON.stringify({date:new Date().toISOString(),base,nativeUrlParse:true,graphTreeText:true,clipboard:true,requests,outside,errors},null,2));console.log('PASS native URL parser, Graph/Tree/Text views, clipboard, own assets only');
}finally{await b.close()}
