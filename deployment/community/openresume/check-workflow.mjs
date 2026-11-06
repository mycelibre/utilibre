// Bounded synthetic checks. Default target is loopback; never reads a real user's draft.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
import {resumeExamples} from '../../../portal/src/pages/resume-examples.ts';
const base=process.env.CV_TEST_ORIGIN || 'http://127.0.0.1:13205';
const report=process.env.CV_REPORT_DIR || '/var/lib/utilibre-maintenance/cv-20261106/browser';
const source=process.env.CV_BUILD_SOURCE || '/var/lib/utilibre-maintenance/cv-20261106/source';
const samples=process.env.CV_SAMPLE_DIR || '/var/lib/utilibre-maintenance/cv-20261106/samples';
assert(['127.0.0.1','resume-builder.utilibre.org'].includes(new URL(base).hostname));
await mkdir(report,{recursive:true,mode:0o700});await mkdir(samples,{recursive:true});
const require=createRequire(source+'/package.json');const pdfjs=require('pdfjs-dist/build/pdf.js');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
async function pdfText(path){const doc=await pdfjs.getDocument({data:new Uint8Array(await readFile(path)),isEvalSupported:false}).promise;let text='';for(let i=1;i<=doc.numPages;i++)text+=(await (await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join(' ');const pages=doc.numPages;await doc.destroy();return {text:text.replace(/\s+/g," ").trim(),pages};}
function state(x,lang){const first=x.id==='primer-empleo';return {resume:{profile:{name:x.name,email:'practica@example.invalid',phone:'',url:'',summary:x.summary,location:'Guatemala · '+(lang==='es'?'ejemplo ficticio':'fictional example')},workExperiences:[{company:'',jobTitle:first?'':x.experience,date:'',descriptions:first?[]:x.activities}],educations:[{school:x.education,degree:'',date:'',gpa:'',descriptions:[]}],projects:[{project:first?x.experience:'',date:'',descriptions:first?x.activities:[]}],skills:{descriptions:x.skills,featuredSkills:Array.from({length:6},()=>({skill:'',rating:4}))},custom:{descriptions:[]}},settings:{themeColor:'#345d68',fontFamily:'Roboto',fontSize:'11',documentSize:'Letter',formToShow:{workExperiences:!first,educations:true,projects:first,skills:true,custom:false},formToHeading:lang==='es'?{workExperiences:'EXPERIENCIA',educations:'EDUCACIÓN',projects:'PROYECTOS',skills:'HABILIDADES',custom:'INFORMACIÓN ADICIONAL'}:{workExperiences:'WORK EXPERIENCE',educations:'EDUCATION',projects:'PROJECTS',skills:'SKILLS',custom:'ADDITIONAL INFORMATION'},formsOrder:first?['educations','projects','workExperiences','skills','custom']:['workExperiences','educations','projects','skills','custom'],showBulletPoints:{educations:true,projects:true,skills:true,custom:true}}};}
try {
 for(const lang of ['es','en'])for(const x of resumeExamples[lang]){
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:lang});
  await context.addInitScript(s=>{if(!localStorage.getItem('open-resume-state')) localStorage.setItem('open-resume-state',JSON.stringify(s));},state(x,lang));
  const page=await context.newPage(),requests=[],errors=[];
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push({origin:new URL(r.url()).origin,method:r.method()});});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+(lang==='es'?'/es':'')+'/resume-builder');
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  const label=lang==='es'?'Nombre':'Name';await page.getByLabel(label,{exact:true}).waitFor();
  // Real editing through the existing native input, then native PDF generation.
  await page.getByLabel(label,{exact:true}).fill(x.name+' · prueba');
  await page.getByLabel(label,{exact:true}).fill(x.name);
  await page.waitForTimeout(600);
  const link=page.getByRole('link',{name:lang==='es'?'Descargar PDF':'Download PDF',exact:true});await link.waitFor({timeout:45000});
  const downloadEvent=page.waitForEvent('download');await link.click();const download=await downloadEvent;const path=samples+'/'+x.id+'-'+lang+'.pdf';await download.saveAs(path);
  const output=await pdfText(path);assert(output.text.includes(x.name));assert(output.text.includes(x.summary));assert(output.text.includes(x.activities[0]));assert.equal(output.pages,1,'fictional example should fit one page');
  await page.reload();assert.equal(await page.getByLabel(label,{exact:true}).inputValue(),x.name);
  assert(requests.every(r=>r.origin===new URL(base).origin&&['GET','HEAD'].includes(r.method)),JSON.stringify(requests));assert.deepEqual(errors,[]);
  if(x.id==='primer-empleo')await page.locator('iframe').first().screenshot({path:report+'/preview-'+lang+'.png'});
  results.push({example:x.id,language:lang,pdfReadable:true,pages:output.pages,persistence:true,externalRequests:0,uploads:0});await context.close();
 }
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,locale:'es-GT'});
  const page=await context.newPage();await page.goto(base+'/es/resume-builder');await page.waitForFunction(()=>document.querySelector('a[download]')?.getAttribute('href')?.startsWith('blob:'));
  await page.getByLabel('Nombre',{exact:true}).fill('Lucía Prueba Ñ');
  await page.getByLabel('Perfil profesional',{exact:true}).fill('Currículum ficticio para una prueba de descarga.');
  const fields=page.getByRole('textbox',{name:'Actividades y logros',exact:true});
  await fields.first().fill('<img src=x onerror=alert(1)> texto de práctica');
  await page.waitForTimeout(500);assert.equal(await page.locator('[contenteditable] img').count(),0,'pasted/imported HTML must remain inert');
  await fields.first().fill('Organización de materiales y atención al público.');
  await page.waitForTimeout(500);
  const saved=await page.evaluate(()=>localStorage.getItem('open-resume-state'));
  await page.getByRole('link',{name:'English',exact:true}).click();await page.waitForFunction(()=>document.querySelector('input[name=name]')?.value==='Lucía Prueba Ñ');
  assert.equal(await page.getByLabel('Name',{exact:true}).inputValue(),'Lucía Prueba Ñ');
  assert.equal(await page.evaluate(()=>localStorage.getItem('open-resume-state')),saved,'language switch must preserve complete draft');
  await page.getByRole('link',{name:'Español',exact:true}).click();await page.waitForFunction(()=>document.querySelector('input[name=name]')?.value==='Lucía Prueba Ñ');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(overflow<=1,'horizontal overflow '+overflow);
  await page.screenshot({path:report+'/'+(mobile?'mobile':'desktop')+'-es.png',fullPage:false});
  const link=page.getByRole('link',{name:'Descargar PDF',exact:true});await link.scrollIntoViewIfNeeded();
  const event=page.waitForEvent('download');await link.click();const download=await event;const file=report+'/'+(mobile?'mobile':'desktop')+'.pdf';await download.saveAs(file);assert((await pdfText(file)).text.includes('Lucía Prueba Ñ'));
  results.push({viewport:mobile?'390x844 touch emulation':'1440x1000 desktop',typedPdf:true,languageSwitchPreservesDraft:true,inertPastedMarkup:true,horizontalOverflow:overflow});await context.close();
 }
 await writeFile(report+'/results.json',JSON.stringify({date:new Date().toISOString(),target:base,browser:browser.version(),results,realPhoneTest:false},null,2));console.log('PASS: six readable single-page PDFs, draft persistence, local requests, Spanish/English switching, inert markup, desktop and mobile-emulated download.');
} finally {await browser.close();}
