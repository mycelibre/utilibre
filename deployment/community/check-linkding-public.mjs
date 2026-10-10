import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const base='https://bookmarks.utilibre.org';
const out='/opt/utilibre/reports/linkding-public-20261009';
const user=JSON.parse(await readFile('/opt/utilibre/identity-data/data/private/linkding-public-qa-20261009.json','utf8'));
assert.equal(user.username,'utilibre-linkding-public-20261009-a');assert(!user.retired);
await mkdir(out,{recursive:true,mode:0o700});
const report={publicHttps:true,noInterception:true,checks:[],externalHosts:[],errors:[],layouts:[]};
function otp(key){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(key,'hex')).update(b).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const fixture={url:'https://utilibre.org/en/about#fictional-linkding-public-20261009',title:'Fictional public bookmark check',description:'Disposable verification description',notes:'Fictional private note: export and reopen.',tags:['fictional','publiccheck']};
const browser=await chromium.launch({headless:true}),ctx=await browser.newContext({viewport:{width:1280,height:900},locale:'en-US'});
const page=await ctx.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(30000);
ctx.on('request',r=>{if(/^https?:/.test(r.url())){const host=new URL(r.url()).hostname;if(!['auth.utilibre.org','bookmarks.utilibre.org'].includes(host))report.externalHosts.push(host)}});
page.on('pageerror',e=>report.errors.push(e.message));
async function bookmarks(){const r=await ctx.request.get(base+'/api/bookmarks/?limit=100');assert.equal(r.status(),200);return (await r.json()).results;}
async function checkFixture(){const rows=await bookmarks();assert.equal(rows.length,1);const b=rows[0];assert.equal(b.url,fixture.url);assert.equal(b.title,fixture.title);assert.equal(b.description,fixture.description);assert.equal(b.notes,fixture.notes);assert.deepEqual([...b.tag_names].sort(),fixture.tags);assert.equal(b.unread,true);assert.equal(b.shared,false);return b;}
async function remove(){const rows=await bookmarks();assert.equal(rows.length,1);assert.equal(rows[0].url,fixture.url);await page.goto(base+'/bookmarks',{waitUntil:'networkidle'});await page.locator(`button[name="remove"][value="${rows[0].id}"]`).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await page.waitForTimeout(600);assert.equal((await bookmarks()).length,0);}
try{
 await page.goto('https://auth.utilibre.org/if/flow/default-authentication-flow/');
 await page.locator('input[name="uidField"]').fill(user.username);await page.getByRole('button',{name:/^(Log in|Iniciar sesión|Acceder)$/}).click();
 await page.locator('ak-stage-password input[name="password"]:visible').fill(user.password);await page.getByRole('button',{name:/^(Continue|Continuar)$/}).click();
 await page.locator('ak-stage-authenticator-validate input[name="code"]:visible').fill(otp(user.totpKey));await page.getByRole('button',{name:/^(Continue|Continuar)$/}).click();await page.waitForURL('**/if/user/**');
 await page.goto(base+'/login/');await page.locator('a[href*="oidc/authenticate"]').click();await page.waitForURL(base+'/bookmarks');
 report.checks.push('Native public OIDC/MFA login');assert.equal((await bookmarks()).length,0);
 await page.goto(base+'/bookmarks/new',{waitUntil:'networkidle'});
 const metadata=page.waitForResponse(r=>new URL(r.url()).pathname.replace(/\/$/,'')==='/api/bookmarks/check'&&r.status()===200);await page.getByLabel('URL',{exact:true}).fill(fixture.url);await metadata;
 await page.getByLabel('Title',{exact:true}).fill(fixture.title);await page.getByLabel('Description',{exact:true}).fill(fixture.description);await page.getByLabel('Tags',{exact:true}).fill(fixture.tags.join(' '));
 await page.locator('details.notes summary').click();await page.getByLabel('Notes',{exact:true}).fill(fixture.notes);await page.getByLabel('Mark as unread',{exact:true}).check();
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForURL(base+'/bookmarks');await checkFixture();report.checks.push('Native browser save/title/description/tags/notes/unread; private default');
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:`${out}/bookmarks-${width}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);report.layouts.push({width,overflow:false});}
 await page.goto(base+'/settings',{waitUntil:'networkidle'});const downloading=page.waitForEvent('download');await page.locator('a[href="/settings/export"]').click();const download=await downloading;const exported=`${out}/fictional-bookmarks.html`;await download.saveAs(exported);
 const html=await readFile(exported,'utf8');for(const needle of [fixture.url,fixture.title,fixture.notes,'fictional','publiccheck'])assert(html.includes(needle));report.checks.push('Native Settings HTML download includes fictional URL/title/notes/tags');
 await remove();report.checks.push('Native bookmark Remove/Confirm leaves zero bookmarks');
 await page.goto(base+'/settings',{waitUntil:'networkidle'});await page.locator('input[name="import_file"]').setInputFiles(exported);assert.equal(await page.locator('input[name="map_private_flag"]').isChecked(),false);
 await page.locator('form[action="/settings/import"] input[type="submit"]').click();await page.getByText('1 bookmarks were successfully imported.',{exact:true}).waitFor();await checkFixture();report.checks.push('Native Settings HTML import restores exact checked fields and private/unread flags');
 await page.goto(base+'/bookmarks',{waitUntil:'networkidle'});await page.reload({waitUntil:'networkidle'});await checkFixture();report.checks.push('Imported bookmark survives reload');
 await remove();report.checks.push('Imported fixture removed through native confirmation');
 assert.deepEqual(report.externalHosts,[]);assert.deepEqual(report.errors,[]);
 await writeFile(`${out}/browser-state.json`,JSON.stringify(await ctx.storageState()),{mode:0o600});
 report.success=true;await writeFile(`${out}/public-result.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});report.failure=e.message;await writeFile(`${out}/failed-result.json`,JSON.stringify(report,null,2)+'\n');throw e}
finally{await ctx.close();await browser.close()}
