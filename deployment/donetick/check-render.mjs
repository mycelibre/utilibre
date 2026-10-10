import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const out='/opt/utilibre/reports/donetick-20261009';const d=JSON.parse(await readFile(out+'/native-data-private.json','utf8'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const c=await browser.newContext({storageState:out+'/browser-state-0.json'});c.setDefaultTimeout(20000);
try{
 await c.route('https://chores.utilibre.org/**',async r=>{const q=r.request(),u=new URL(q.url());const response=await c.request.fetch('http://127.0.0.1:3215'+u.pathname+u.search,{method:q.method(),headers:{...q.headers(),host:'chores.utilibre.org'},data:q.postDataBuffer()??undefined,maxRedirects:0});await r.fulfill({response});});
 const p=await c.newPage();await p.goto('https://chores.utilibre.org/settings/account');await p.getByRole('button',{name:'Change Password',exact:true}).waitFor();await p.getByRole('button',{name:'Delete Account',exact:true}).waitFor();
 await p.goto('https://chores.utilibre.org/chores/'+d.created.res);await p.getByText('Fictional water the paper fern',{exact:true}).first().waitFor();
 const keys=await p.evaluate(()=>Object.keys(localStorage));assert(keys.includes('token'));
 await p.goto('https://chores.utilibre.org/settings/privacy');await p.getByRole('link',{name:'Read Utilibre’s privacy notes'}).waitFor();
 await writeFile(out+'/native-ui.json',JSON.stringify({taskVisible:true,changePasswordControl:true,deleteAccountControl:true,privacyLinks:true,sessionStoragePersists:true},null,2));console.log('Native task/account controls and Utilibre privacy links passed.');
}finally{await c.close();await browser.close();}
