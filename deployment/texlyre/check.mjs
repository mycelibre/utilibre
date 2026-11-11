import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
import {loadParser,parserDirectory} from '../toolbox/pdf-parser-input.mjs';
assert(process.argv.slice(2).length===0||['["--oct22"]','["--candidate"]','["--live"]'].includes(JSON.stringify(process.argv.slice(2))));
const oct22=process.argv.includes('--oct22');
const candidate=process.argv.includes('--candidate');
const live=process.argv.includes('--live');
const report=candidate||live?process.env.TEXLYRE_CHECK_REPORT:oct22?'/var/lib/utilibre-maintenance/security-20261022/texlyre':'/opt/utilibre/reports/texlyre-20261011';
if(candidate||live)assert(/^\/var\/lib\/utilibre-maintenance\/[a-zA-Z0-9/-]+$/.test(report)&&!report.includes('..'));
const base=candidate?'http://127.0.0.1:3442':oct22?'http://127.0.0.1:3441':'https://latex.utilibre.org';
const local=candidate||oct22;
const migration=process.env.TEXLYRE_MIGRATE_FROM_013==='1';
if(migration)assert(candidate,'Migration is restricted to the disposable candidate');
const getDocument=local||live?null:(await import('/opt/utilibre/evaluation-src/texlyre-20261011/node_modules/pdfjs-dist/legacy/build/pdf.mjs')).getDocument;
mkdirSync(report,{recursive:true});
const browser=await chromium.launch(local||live?{}:{args:['--host-resolver-rules=MAP latex.utilibre.org 10.10.1.3']});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const liveParser=live?await loadParser(parserDirectory):null;
if(live)await context.route(base+'/test-only-pdfjs/build/*',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').pop();
  assert(['pdf.mjs','pdf.worker.mjs'].includes(name));
  await route.fulfill({contentType:'application/javascript',body:liveParser.get('/'+name)});
});
const outside=[],errors=[],requests=[];
context.on('request',r=>{
  if(/^https?:/.test(r.url())) {
    requests.push({path:new URL(r.url()).pathname,method:r.method()});
    if(new URL(r.url()).origin!==base)outside.push(r.url());
  }
});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300))});
try {
  await page.goto(base);
  await page.getByRole('button',{name:'Try as Guest',exact:true}).click();
  for(const e of await page.locator('input[type=checkbox]').all())await e.check();
  await page.getByRole('button',{name:'Start Guest Session',exact:true}).click();
  await page.getByTitle('New Project',{exact:true}).click();
  await page.locator('#project-name').fill('Utilibre fictional practice');
  await page.getByRole('button',{name:'Create Project',exact:true}).click();
  await page.locator('#file-input').setInputFiles({name:'main.tex',mimeType:'text/plain',buffer:readFileSync(new URL('../../portal/public/examples/latex-practice.tex',import.meta.url))});
  await page.getByText('main.tex',{exact:true}).first().click();
  await page.waitForTimeout(600);
  console.log('Created guest project and imported synthetic main.tex');
  await page.getByTitle('Compile LaTeX (F9)',{exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.textLayer').length>0,null,{timeout:90000});
  const pdfDownload=page.waitForEvent('download');
  await page.getByTitle('Export',{exact:true}).click();
  const pdf=await pdfDownload; await pdf.saveAs(`${report}/practice.pdf`);
  const pdfBytes=[...readFileSync(`${report}/practice.pdf`)];
  const text=local||live?await page.evaluate(async bytes=>{
    // Pinned PDF.js runs in the actual browser, avoiding a test-only native
    // canvas dependency. PDF bytes arrive over Playwright, not an HTTP upload.
    const pdf=await import('/test-only-pdfjs/build/pdf.mjs');
    pdf.GlobalWorkerOptions.workerSrc='/test-only-pdfjs/build/pdf.worker.mjs';
    const d=await pdf.getDocument({data:new Uint8Array(bytes),isEvalSupported:false}).promise;
    return (await(await d.getPage(1)).getTextContent()).items.map(item=>item.str).join(' ');
  },pdfBytes):await(async()=>{const d=await getDocument({data:new Uint8Array(pdfBytes),isEvalSupported:false}).promise;return(await(await d.getPage(1)).getTextContent()).items.map(item=>item.str).join(' ');})();
  assert(text.includes('Práctica de Utilibre') && text.includes('español') && text.includes('2 + 3 = 5'),text);
  console.log('PDF download and extracted accents/formula passed');
  await page.getByTitle('Export Current Project',{exact:true}).click();
  const zipDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export 1 Project',exact:true}).click();
  const zip=await zipDownload;await zip.saveAs(`${report}/project.zip`);
  if(migration){
    // Only the loopback fixture changes. Keep the browser profile and its
    // IndexedDB intact while replacing the old static app with the candidate.
    const fixture='/var/lib/utilibre-maintenance/stabilization-20261111/texlyre/compat';
    renameSync(fixture+'/texlyre',fixture+'/previous');
    renameSync(fixture+'/next',fixture+'/texlyre');
    const response=await fetch(base+'/');assert(response.ok);
    assert.equal(await response.text(),readFileSync(fixture+'/texlyre/index.html','utf8'));
  }
  await page.reload();
  await page.getByText('main.tex',{exact:true}).first().waitFor();
  console.log('Native project export and reload persistence passed');
  await page.getByRole('button',{name:'Projects',exact:true}).click();
  await page.getByTitle('Import Projects',{exact:true}).click();
  await page.locator('input[type=file]').setInputFiles(`${report}/project.zip`);
  await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Select All',exact:true}).click();
  await page.getByLabel('Import as collaborator (preserve original ownership)').uncheck();
  await page.getByRole('button',{name:'Import 1 Project',exact:true}).click();
  await page.getByRole('button',{name:'Importing...',exact:true}).waitFor({state:'hidden',timeout:30000});
  if(candidate||live){
    // 0.14 names the split button after its default file; scope the action to
    // the imported project so this checks the restored copy, not the original.
    assert.equal(await page.locator('[data-role="project"]').count(),2);
    const restored=page.locator('[data-role="project"]').filter({has:page.getByRole('heading',{name:'Utilibre fictional practice (imported)',exact:true})});
    assert.equal(await restored.count(),1);
    await restored.locator('[data-role="project-open"] button.ui-split-main').click();
  }else{
    assert.equal(await page.getByRole('button',{name:'Open',exact:true}).count(),2);
    await page.getByRole('button',{name:'Open',exact:true}).first().click();
  }
  await page.getByText('main.tex',{exact:true}).first().click();
  assert((await page.locator('.cm-content').innerText()).includes('español'));
  console.log('Native project restore as independent copy passed');
  await page.screenshot({path:`${report}/editor.png`,fullPage:true});
  await page.getByRole('button',{name:'Upgrade Account',exact:true}).click();
  await page.locator('#username').fill('fictional-utilibre-check');
  await page.locator('#password').fill('Synthetic-only-practice-2026!');
  await page.locator('#confirmPassword').fill('Synthetic-only-practice-2026!');
  for(const e of await page.locator('input[type=checkbox]').all())await e.check();
  await page.locator('form').getByRole('button',{name:'Upgrade Account',exact:true}).click();
  await page.locator('#username').waitFor({state:'hidden'});
  await page.reload();
  await page.getByText('main.tex',{exact:true}).first().waitFor();
  assert.equal(await page.getByText('Guest Session Active',{exact:true}).count(),0);
  console.log('Native full local-account upgrade and reload persistence passed');
  assert.equal(outside.length,0,JSON.stringify(outside));
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert(requests.every(r=>['GET','HEAD'].includes(r.method)));
  console.log('No outside HTTP requests, content POSTs or browser errors observed');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
  const mobilePage=await mobile.newPage();
  await mobilePage.goto(base+'/');
  await mobilePage.getByRole('button',{name:'Try as Guest',exact:true}).click();
  await mobilePage.getByRole('button',{name:'Start Guest Session',exact:true}).waitFor();
  await mobilePage.screenshot({path:`${report}/mobile-login.png`,fullPage:true});
  const mobileOverflow=await mobilePage.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(mobileOverflow,false,'Mobile-emulated login overflows');
  await mobile.close();
  writeFileSync(`${report}/inspection.json`,JSON.stringify({date:new Date().toISOString(),passed:true,outside,errors,requests,guestProject:true,compiledPdfAccentsFormula:true,projectExportImport:true,localAccountUpgrade:true,reloadPersistence:true,migrationFrom013:migration,mobileEmulation:true,mobileOverflow,publicHttps:live,parserInjectedIntoTestBrowser:live,productionChanged:false},null,2));
} catch(e){writeFileSync(`${report}/browser-error.json`,JSON.stringify({message:e.message,outside,errors,requests},null,2));writeFileSync(`${report}/browser-body.txt`,await page.locator('body').innerText());await page.screenshot({path:`${report}/browser-error.png`});throw e;} finally {await browser.close();}
