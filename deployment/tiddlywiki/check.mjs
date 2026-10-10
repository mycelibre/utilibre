// Native single-file edit/save/reopen and deletion in disposable local documents.
import assert from 'node:assert/strict';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.argv[2]??'http://127.0.0.1:4197/';const report='/opt/utilibre/reports/single-file-20261009';await mkdir(report,{recursive:true,mode:0o700});
const browser=await chromium.launch();const results=[];
async function context(locale,width){
 const c=await browser.newContext({locale,viewport:{width,height:1000},isMobile:width===390,hasTouch:width===390,acceptDownloads:true,serviceWorkers:'block'});
 const requests=[],outside=[],errors=[];c.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());});
 await c.route(/^https?:/,r=>{requests.push({url:r.request().url(),method:r.request().method()});if(new URL(r.request().url()).origin!==new URL(base).origin){outside.push(r.request().url());return r.abort();}return r.continue();});return{c,requests,outside,errors};
}
const button=(p,name)=>p.locator(`button[class~="tc-btn-%24%3A%2Fcore%2Fui%2FButtons%2F${name}"]`).first();
try{
 for(const [language,locale,width] of [['en','en-GB',1280],['es','es-GT',390]]){
  const s=await context(locale,width);const p=await s.c.newPage();await p.goto(base+(language==='es'?'es/':''));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const first=p.waitForEvent('download');await p.locator(`a[download="tiddlywiki-${language}.html"]`).click();const original=`${report}/wiki-${language}-start.html`;await(await first).saveAs(original);await p.goto('file://'+original);
  assert.equal(await p.evaluate(()=>document.documentElement.lang),language==='es'?'es-ES':'en-GB');
  await button(p,'new-tiddler').click();const title=`Fictional workshop ${language}`;const text='Fictional agenda: repair a bicycle and record three imaginary tasks.';
  await p.locator('input.tc-titlebar').fill(title);await p.frameLocator('iframe.tc-edit-texteditor-body').locator('textarea').fill(text);await button(p,'save').click();
  assert.equal(await p.evaluate(title=>$tw.wiki.getTiddlerText(title),title),text);
  const download=p.waitForEvent('download');await button(p,'save-wiki').click();const saved=`${report}/wiki-${language}-saved.html`;await(await download).saveAs(saved);
  await p.waitForTimeout(450);await p.screenshot({path:`${report}/wiki-${language}-${width}.png`});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(s.errors,[]);assert.deepEqual(s.outside,[]);await s.c.close();
  const r=await context(locale,width);const q=await r.c.newPage();await q.goto('file://'+saved+'#'+encodeURIComponent(title));assert.equal(await q.evaluate(title=>$tw.wiki.getTiddlerText(title),title),text);
  const note=q.locator(`[data-tiddler-title="${title}"]`);await note.locator('button[class*="Buttons%2Fedit"]').click();await button(q,'delete').click();assert.equal(await q.evaluate(title=>$tw.wiki.tiddlerExists(title),title),false);
  const deleted=q.waitForEvent('download');await button(q,'save-wiki').click();const cleaned=`${report}/wiki-${language}-deleted.html`;await(await deleted).saveAs(cleaned);assert.deepEqual(r.errors,[]);assert.deepEqual(r.outside,[]);await r.c.close();
  const end=await context(locale,width);const z=await end.c.newPage();await z.goto('file://'+cleaned);assert.equal(await z.evaluate(title=>$tw.wiki.tiddlerExists(title),title),false);assert.deepEqual(end.errors,[]);assert.deepEqual(end.outside,[]);await end.c.close();
  results.push({language,locale,width,nativeLanguage:true,downloadEditSaveReopen:true,nativeDeleteSaveReopen:true,noHorizontalOverflow:true,externalRequests:[...s.outside,...r.outside,...end.outside],errors:[...s.errors,...r.errors,...end.errors],requests:s.requests});
 }
 await writeFile(`${report}/wiki-results.json`,JSON.stringify({date:new Date().toISOString(),base,results},null,2));console.log('PASS TiddlyWiki EN/ES native edit, full HTML download, independent reopen, delete/save/reopen, desktop/mobile; no external requests.');
}finally{await browser.close();}
