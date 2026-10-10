// Native EN/ES privacy and embedded registration-page regression; no accounts/data mutations.
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
import { writeFile } from 'node:fs/promises';
const origin=process.env.UTILIBRE_FMD_CHECK_ORIGIN || 'https://fmd.utilibre.org';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try {
 for (const language of ['en','es']) {
  for (const embedded of [false,true]) {
   const context=await browser.newContext({locale:language,viewport:{width:390,height:844}});
   const page=await context.newPage();
   const external=[];page.on('request',request=>{if(!request.url().startsWith(origin))external.push(new URL(request.url()).origin);});
   const response=await page.goto(origin+'/privacy'+(embedded?'?embedded=true':''),{waitUntil:'networkidle'});
   if(response?.status()!==200)throw Error('Native privacy route did not return 200');
   await page.getByRole('heading',{name:language==='es'?'Privacidad en Utilibre':'Privacy on Utilibre',exact:true}).waitFor();
   const body=await page.locator('body').innerText();
   if(/It is not given to other parties|all important data is encrypted|fetch all data from the server/.test(body))throw Error('Unsupported assurance remains');
   const verified=language==='es'?'la descarga del ZIP y su apertura local pasaron con registros ficticios':'ZIP download and local reopening passed with fictional records';
   if(!body.includes(verified))throw Error('Current native browser-export verification note is missing');
   if(!await page.locator('a[href="https://tools.utilibre.org/utilibre-source/fmd-utilibre.tar.gz?revision=0.17.0-p3-20261010"]').count())throw Error('Current deployment source revision link is missing');
   if(!body.includes(language==='es'?'sin la ruta de la página, los parámetros de consulta ni el fragmento':'without the page path, query parameters or fragment'))throw Error('Origin-only tile disclosure is missing');
   const details=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:window.innerWidth,sections:document.querySelectorAll('main section').length}));
   if(details.width>details.viewport+1||details.sections!==6||external.length)throw Error('Privacy rendering/network scope failed');
   if(await page.getByRole('link',{name:language==='es'?'Volver a FMD':'Back to FMD',exact:true}).count() !== (embedded?0:1))throw Error('Embedded navigation mismatch');
   await page.getByRole('link',{name:language==='es'?'Más herramientas de Utilibre':'More tools from Utilibre',exact:true}).focus();
   if(!await page.evaluate(()=>document.activeElement?.tagName==='A'))throw Error('Keyboard link not focusable');
   await page.getByRole('combobox').selectOption(language==='es'?'en':'es');
   await page.getByRole('heading',{name:language==='es'?'Privacy on Utilibre':'Privacidad en Utilibre',exact:true}).waitFor();
   results.push({language,embedded,sections:details.sections,noHorizontalOverflow:true,noExternalRequests:true,nativeLanguageSwitch:true,keyboardLinks:true});
   await context.close();
  }
 }
 if (process.env.UTILIBRE_FMD_CHECK_REPORT) await writeFile(process.env.UTILIBRE_FMD_CHECK_REPORT,JSON.stringify({date:new Date().toISOString(),origin,results},null,2));
 console.log(JSON.stringify({origin,cases:results.length,passed:true}));
} catch(error) { console.log('FMD privacy check failed: '+error.message); process.exitCode=1; }
finally {await browser.close();}
