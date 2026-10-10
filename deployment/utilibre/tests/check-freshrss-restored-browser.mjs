// Read only the disposable account specified by the restore rehearsal.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(new URL('../../../portal/package.json',import.meta.url))('playwright-core');
const fixture=JSON.parse(await readFile(process.argv[2],'utf8'));
assert.match(fixture.username,/^utilibrerestore[0-9a-f]{12}$/);
const origin='http://127.0.0.1:33291';
const browser=await chromium.launch();
try {
 const context=await browser.newContext();
 const external=[];
 await context.route('**/*',route=>{
  if(new URL(route.request().url()).origin!==origin){external.push(new URL(route.request().url()).hostname);return route.abort()}
  return route.continue();
 });
 const page=await context.newPage();
 await page.goto(`${origin}/i/?c=auth&a=login`);
 await page.locator('input[name="username"]').fill(fixture.username);
 await page.locator('#passwordPlain').fill(fixture.password);
 await Promise.all([
  page.waitForURL(url=>url.searchParams.get('a')!=='login'),
  page.locator('form button[type="submit"]').click(),
 ]);
 await page.goto(`${origin}/i/?get=f_${fixture.feedId}&state=3`);
 await page.getByText(fixture.title,{exact:true}).first().waitFor();
 assert((await page.locator('body').innerText()).includes(fixture.feedName));
 assert.equal(await page.locator('input[name="username"]').count(),0);
 await page.screenshot({path:process.argv[3],fullPage:true});
 assert.deepEqual(external,[],'Restored fictional account must not request outside assets');
 await writeFile(process.argv[4],JSON.stringify({passed:true,checks:['native restored account login','fictional subscription and article visible','no external browser requests'],limitations:['one disposable account and article','no external feed retrieval or whole-host recovery']},null,2)+'\n');
 console.log('PASS: restored FreshRSS browser login and fictional article.');
}finally{await browser.close()}
