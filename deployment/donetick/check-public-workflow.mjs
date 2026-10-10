import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const out='/opt/utilibre/reports/donetick-public-20261009',base='https://chores.utilibre.org';
const record=JSON.parse(await readFile(out+'/native-data-private.json','utf8'));const cid=record.created.res;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results=[];
try{for(const [label,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]] ){
 const c=await browser.newContext({storageState:out+'/browser-state-0.json',viewport,isMobile:label==='mobile',locale:'en-US'});c.setDefaultTimeout(20000);const p=await c.newPage();const errors=[],badAssets=[],hosts=new Set();
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('request',r=>hosts.add(new URL(r.url()).hostname));p.on('response',r=>{if(r.status()>=400)badAssets.push({path:new URL(r.url()).pathname,status:r.status()})});
 await p.goto(base+'/chores/'+cid);await p.getByText('Fictional public water the paper fern',{exact:true}).first().waitFor();await p.getByRole('button',{name:'Mark as done',exact:true}).waitFor();
 if(label==='desktop'){const done=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/chores/'+cid+'/do'&&r.request().method()==='POST');await p.getByRole('button',{name:'Mark as done',exact:true}).click();assert((await done).ok());await p.waitForTimeout(500);}
 await p.screenshot({path:out+'/public-task-'+label+'.png',fullPage:true});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.goto(base+'/settings/account');await p.getByRole('button',{name:'Change Password',exact:true}).waitFor();await p.getByRole('button',{name:'Delete Account',exact:true}).waitFor();
 await p.goto(base+'/settings/privacy');await p.getByRole('link',{name:'Read Utilibre’s privacy notes'}).waitFor();
 assert.deepEqual(errors,[]);assert.deepEqual(badAssets,[]);assert.deepEqual([...hosts].filter(h=>!['chores.utilibre.org'].includes(h)),[]);results.push({viewport:label,taskRendered:true,completion:label==='desktop',accountControls:true,privacyLinks:true,noPageOverflow:true,errors,badAssets,hosts:[...hosts]});await c.close();
}await writeFile(out+'/public-workflow.json',JSON.stringify(results,null,2));console.log('Public native completion, desktop/mobile rendering, assets and account controls passed.');}finally{await browser.close();}
