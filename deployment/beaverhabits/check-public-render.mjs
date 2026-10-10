import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const out='/opt/utilibre/reports/beaver-public-20261009',base='https://habits.utilibre.org';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results=[];
try{for(const [index,viewport]of [{width:1440,height:1000},{width:390,height:844}].entries()){
 const c=await browser.newContext({storageState:out+'/browser-state-'+index+'.json',viewport,isMobile:index===1});c.setDefaultTimeout(20000);const p=await c.newPage();const errors=[],badAssets=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('response',r=>{if(r.status()>=400)badAssets.push({path:new URL(r.url()).pathname,status:r.status()})});
 await p.goto(base+'/gui');await p.getByText('Habits',{exact:true}).waitFor();await p.waitForTimeout(750);await writeFile(out+'/public-dom-'+index+'.txt',await p.locator('body').innerText(),{mode:0o600});await p.screenshot({path:out+'/public-data-'+index+'.png',fullPage:true});assert(await p.locator('a[href*="/gui/habits/"]').count()>=2);await p.waitForTimeout(400);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:out+'/public-data-'+index+'.png',fullPage:true});
 await p.goto(base+'/gui/export');await p.getByRole('button',{name:'Export JSON',exact:true}).waitFor();await p.getByText(/Exportá los hábitos activos y sus registros/).waitFor();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:out+'/public-export-'+index+'.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(badAssets,[]);results.push({viewport,index,habitVisible:true,bilingualExportWarning:true,noPageOverflow:true,errors,badAssets});await c.close();
}await writeFile(out+'/public-render.json',JSON.stringify(results,null,2));console.log('Public habit/export desktop and mobile layout, assets and console checks passed.');}finally{await browser.close();}
