import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import process from 'node:process';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const [user]=JSON.parse(await readFile('/opt/utilibre/beaverhabits/private/qa.json','utf8'));
const base=process.env.BASE_URL || 'http://127.0.0.1:3216';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext();
try{
 const page=await context.newPage();page.setDefaultTimeout(20000);
 await page.goto(base+'/login');await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForURL(base+'/gui');
 await page.goto(base+'/gui/export');
 const english='Export active habits and completion records as JSON. Archived habits, account settings and attached note images are not included. Protect this file: it includes your account email.';
 const spanish='Exportá los hábitos activos y sus registros de finalización como JSON. No se incluyen hábitos archivados, ajustes de cuenta ni imágenes adjuntas a notas. Protegé el archivo: incluye el correo de tu cuenta.';
 await page.getByText(english+' '+spanish,{exact:true}).waitFor();
 assert(await page.getByRole('button',{name:'Export JSON',exact:true}).isVisible());
 await writeFile('/opt/utilibre/reports/beaver-20261009/export-copy-p7.json',JSON.stringify({nativeRenderedEnglish:true,nativeRenderedSpanishVoseo:true,exportButtonPreserved:true,context:'networkless restored fictional account',productionWrites:false},null,2));
 console.log('Both native export warning languages rendered; Export JSON remains available.');
}finally{await context.close();await browser.close();}
