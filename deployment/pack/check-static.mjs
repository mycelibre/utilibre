import {createRequire} from 'node:module';
import {strict as assert} from 'node:assert';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const require=createRequire(new URL('../../portal/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const {zipSync}=require('/opt/utilibre/src/mapshaper/node_modules/fflate');
const engine=require('/opt/utilibre/src/mapshaper/mapshaper.js');
const root='/home/ubuntu/freetools';
const fixture=await readFile(`${root}/portal/public/examples/map-fictional.geojson`,'utf8');
const shape=await new Promise((resolve,reject)=>engine.applyCommands('-i sample.geojson -o format=shapefile',{'sample.geojson':fixture},(e,r)=>e?reject(e):resolve(r)));
const zip=zipSync(Object.fromEntries(Object.entries(shape).map(([k,v])=>[k,new Uint8Array(v)])));
await writeFile(`${root}/portal/public/examples/map-fictional.zip`,zip);
const captures=`${root}/.impeccable/captures/pack`;
await mkdir(captures,{recursive:true});
const browser=await chromium.launch();
const checks=[];
try {
 const maps=process.env.MAPSHAPER_TEST_URL||'http://10.10.1.43:3170';
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
 const page=await context.newPage(); page.setDefaultTimeout(12000); const outside=[],errors=[];
 page.on('request',r=>{if(!r.url().startsWith(maps+'/')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))outside.push(r.url())});
 page.on('pageerror',e=>errors.push(e.message));
 for (const file of ['map-fictional.geojson','map-fictional.zip','map-fictional.csv']) {
  const response=await page.goto(maps); assert.equal(response.status(),200);
  await page.locator('input[type=file]').last().setInputFiles(`${root}/portal/public/examples/${file}`);
  await page.locator('#import-options .submit-btn').waitFor({state:'visible'});
  await page.locator('#import-options .submit-btn').click();
  await page.locator('.export-btn').waitFor({state:'visible'});
  if(file.endsWith('.geojson')){
   await page.locator('.simplify-btn').click();
   await page.locator('.simplify-options .submit-btn').click();
   await page.locator('.simplify-control .clicktext').fill('50%');
   await page.locator('.simplify-control .clicktext').press('Enter');
  }
  await page.locator('.export-btn').click();
  await page.locator(`.export-formats input[value="${file.endsWith('.csv')?'dsv':'geojson'}"]`).check();
  const pending=page.waitForEvent('download');await page.locator('.export-options #export-btn').click();
  const download=await pending;const output=await readFile(await download.path(),'utf8');
  if(file.endsWith('.csv'))assert(output.includes('books')&&output.includes('24'));
  else {const data=JSON.parse(output);assert.equal(data.features.length,3);assert.equal(data.features[0].properties.books,24);}
  checks.push(`Mapshaper ${file} import/export`);
 }
 await page.screenshot({path:`${captures}/mapshaper.png`,fullPage:true});
 assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);
 await context.close();
 if(process.argv.includes('--maps-only')){console.log(JSON.stringify({checks,outside,errors}));process.exitCode=0;}
 else {
  const calc=process.env.NUMBAT_TEST_URL||'http://10.10.1.43:3171';
  const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(12000);const outside=[],errors=[];
  page.on('request',r=>{if(!r.url().startsWith(calc+'/'))outside.push(r.url())});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(calc);await page.locator('#terminal:not(.hidden)').waitFor();
  for(const command of ['let flour = 250 g','flour * 1.5 -> g','60 W * 3 h -> kWh','5 km -> m','1 m + 1 s']) await page.evaluate(c=>window.jQuery('#terminal').terminal().exec(c),command);
  const output=await page.locator('#terminal').innerText();
  assert(output.includes('375'));assert(output.includes('0.18'));assert(output.includes('5000')||output.includes('5 000'));assert(/incompatible/i.test(output));
  assert.equal(new URL(page.url()).search,'');assert.equal(new URL(page.url()).hash,'');
  await page.locator('#share-calculation').click();const link=await page.locator('#share-link').inputValue();assert(link.includes('#code='));
  assert.equal(new URL(page.url()).hash,'');
  await page.goto(link);await page.reload();await page.locator('#terminal:not(.hidden)').waitFor();
  assert((await page.evaluate(()=>window.jQuery('#terminal').terminal().get_command())).includes('flour'));
  await page.reload();await page.locator('#terminal:not(.hidden)').waitFor();
  assert(!outside.length);assert.deepEqual(errors,[]);
  await page.screenshot({path:`${captures}/numbat.png`,fullPage:true});
  checks.push('Numbat units/variables/type error; explicit fragment handoff; no auto URL/no external calls');
  await context.close();console.log(JSON.stringify({date:new Date().toISOString(),checks,outside,errors}));
 }
}finally{await browser.close()}
