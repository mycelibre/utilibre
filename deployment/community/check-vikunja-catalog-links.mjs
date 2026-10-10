import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const [user]=JSON.parse(await readFile('/opt/utilibre/identity-data/data/private/native-navigation-qa.json','utf8'));
assert.equal(user.username,'utilibre-navigation-20261009-a');assert(!user.retired);
const out='/opt/utilibre/reports/native-navigation-20261009';
function otp(key){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(key,'hex')).update(b).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const context=await browser.newContext({locale:'en-US'});context.setDefaultTimeout(30000);const page=await context.newPage();const errors=[],hosts=new Set();
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>hosts.add(new URL(r.url()).hostname));
try{
 await page.goto('https://tasks.utilibre.org/login');await page.getByRole('textbox',{name:/username|email/i}).fill(user.username);await page.getByRole('button',{name:/continue|log in|sign in/i}).click();await page.locator('input[type=password]').waitFor();await page.waitForTimeout(700);await page.locator('input[type=password]').fill(user.password);await page.locator('input[type=password]').press('Enter');const code=page.locator('input[autocomplete="one-time-code"],input[name="code"]');await code.first().waitFor();await code.first().fill(otp(user.totpKey));await page.getByRole('button',{name:/continue|verify|sign in|log in/i}).click();await page.waitForURL('https://tasks.utilibre.org/');
 await writeFile(out+'/vikunja-browser-state.json',JSON.stringify(await context.storageState()),{mode:0o600});
 await page.goto('https://tasks.utilibre.org/user/settings/general');
 for(const [label,url]of [['More tools from Utilibre','https://utilibre.org/en/'],['Más herramientas de Utilibre','https://utilibre.org/es/']]){const link=page.getByRole('link',{name:label,exact:true});await link.waitFor();assert.equal(await link.getAttribute('href'),url);}
 await page.screenshot({path:out+'/vikunja-links-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/vikunja-links-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const token=await page.evaluate(()=>localStorage.getItem('token'));const r=await context.request.get('https://tasks.utilibre.org/api/v2/user',{headers:{Authorization:'Bearer '+token}});assert(r.ok());const me=await r.json();assert.equal(me.username,user.username);await writeFile(out+'/vikunja-fixture.json',JSON.stringify({userId:me.id,username:me.username,email:me.email}),{mode:0o600});
 assert.deepEqual(errors,[]);assert.deepEqual([...hosts].filter(h=>!['tasks.utilibre.org','auth.utilibre.org'].includes(h)),[]);await writeFile(out+'/vikunja-links.json',JSON.stringify({nativePublicOidcMfa:true,englishSpanishCatalogLinks:true,mechanism:'native OIDC extra_settings_links',surface:'authenticated Settings sidebar',existingUsersReceiveOnNextSignIn:true,noHorizontalOverflow:true,errors,hosts:[...hosts]},null,2));console.log('Native public OIDC claims rendered both catalog links in Vikunja Settings.');
}finally{await context.close();await browser.close();}
