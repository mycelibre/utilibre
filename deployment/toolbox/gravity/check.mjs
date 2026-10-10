import assert from 'node:assert/strict';
import {chromium} from '../../../portal/node_modules/playwright/index.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const base=process.argv[2]||'https://gravity.invalid/apps/gravity/';
const output='/opt/utilibre/reports/gravity-20261009';await mkdir(output,{recursive:true,mode:0o700});
const report={time:new Date().toISOString(),base,outside:[],requests:[],errors:[],consoleErrors:[],checks:[]};
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const csp="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'";
try{
 for(const [name,locale,viewport] of [['desktop','en-US',{width:1280,height:900}],['mobile','es-ES',{width:375,height:812}]]){
  const context=await browser.newContext({locale,viewport,serviceWorkers:'block'});
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(!['http:','https:'].includes(u.protocol))return route.continue();report.requests.push({path:u.pathname,method:route.request().method()});if(u.origin!==new URL(base).origin){report.outside.push(u.href);return route.abort();}if(u.hostname==='gravity.invalid')return route.fulfill({path:path.join('/opt/utilibre/src/gravity/dist',u.pathname.replace(/^\/apps\/gravity\//,'')||'index.html'),headers:{'Content-Security-Policy':csp}});return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
  await page.goto(base+'?promo=1');await page.locator('#preloader').waitFor({state:'detached',timeout:60000});
  await page.locator('.tour-title').filter({hasText:'What is gravity?'}).waitFor();
  const before=await page.locator('.tour-title').innerText();await page.locator('.tour-next').click();assert.notEqual(await page.locator('.tour-title').innerText(),before);await page.locator('.tour-prev').click();assert.equal(await page.locator('.tour-title').innerText(),before);
  await page.locator('[data-lang=pl]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('gravity-lang')),'pl');await page.reload();await page.locator('#preloader').waitFor({state:'detached',timeout:60000});assert.equal(await page.locator('[data-lang=pl]').getAttribute('class'),'lang-btn on');await page.locator('[data-lang=en]').click();
  await page.locator('.tour-skip').click();assert(await page.locator('#controls').isVisible());await page.getByRole('button',{name:'Replay guided tour',exact:false}).click();await page.locator('.tour-title').filter({hasText:'What is gravity?'}).waitFor();
  const state=await page.evaluate(()=>({canvas:!!document.querySelector('#scene').getContext('webgl2'),world:typeof window.world==='object',overflow:document.documentElement.scrollWidth>innerWidth+1,spanish:!!document.querySelector('[data-lang=es]'),musicHidden:!document.getElementById('music-toggle')}));assert(state.canvas&&state.world&&!state.overflow&&!state.spanish&&state.musicHidden);
  await page.waitForTimeout(1800);
  report.render = await page.evaluate(()=>({triangles:window.world.renderer.info.render.triangles,children:window.world.scene.children.length,position:window.world.camera.position.toArray()}));
  assert(report.render.triangles>0);
  await page.screenshot({path:output+'/'+name+'.png'});report.checks.push({name,locale,nextBack:true,languagePersists:true,exploreReplay:true,...state});await context.close();
 }
 assert.deepEqual(report.outside,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert(report.requests.every(r=>r.method==='GET'));
}finally{await browser.close();await writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');}
console.log('PASS native tour/next/back/explore/replay, WebGL, mobile layout, language persistence, no external requests.');
