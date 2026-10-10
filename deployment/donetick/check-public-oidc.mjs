import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const users=JSON.parse(await readFile('/opt/utilibre/identity-data/data/private/donetick-public-qa.json','utf8'));
const out='/opt/utilibre/reports/donetick-public-20261009';
function otp(key){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(key,'hex')).update(b).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{for (const [index,u] of users.entries()){
 assert(!u.retired);const ctx=await browser.newContext({locale:'en-US',viewport:index===0?{width:1440,height:1000}:{width:390,height:844},isMobile:index===1,deviceScaleFactor:1});const hosts=new Set(),errors=[];ctx.setDefaultTimeout(20000);ctx.setDefaultNavigationTimeout(30000);
 const page=await ctx.newPage();page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('Page',new URL(f.url()).hostname,new URL(f.url()).pathname)});page.on('request',r=>hosts.add(new URL(r.url()).hostname));page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('https://chores.utilibre.org/login');await page.getByRole('button',{name:'Utilibre',exact:true}).click();
 await page.getByRole('textbox',{name:/username|email/i}).fill(u.username);await page.getByRole('button',{name:/continue|log in|sign in/i}).click();
 await page.locator('input[type=password]').waitFor();await page.waitForTimeout(700);await page.locator('input[type=password]').fill(u.password);await page.locator('input[type=password]').press('Enter');
 const code=page.locator('input[autocomplete="one-time-code"],input[name="code"]');await code.first().waitFor().catch(async error=>{await page.screenshot({path:out+'/auth-stage.png',fullPage:true});console.log('Auth visible text',await page.locator('body').innerText());console.log('Inputs',await page.locator('input').evaluateAll(xs=>xs.map(x=>({name:x.name,type:x.type,autocomplete:x.autocomplete,placeholder:x.placeholder}))));throw error});await code.first().fill(otp(u.totpKey));await page.getByRole('button',{name:/continue|verify|sign in|log in/i}).click();
 await page.waitForURL('https://chores.utilibre.org/',{timeout:45000});await page.waitForTimeout(1500);
 await writeFile(out+'/browser-state-'+index+'.json',JSON.stringify(await ctx.storageState()),{mode:0o600});
 await writeFile(out+'/native-page-'+index+'.txt',await page.locator('body').innerText(),{mode:0o600});
 assert.deepEqual([...hosts].filter(h=>!['auth.utilibre.org','chores.utilibre.org'].includes(h)),[]);
 await page.screenshot({path:out+'/public-login-'+index+'.png',fullPage:true});assert.deepEqual(errors,[]);results.push({index,hosts:[...hosts],errors,publicHttpsTransport:true});await ctx.close();
}
 await writeFile(out+'/oidc-browser.json',JSON.stringify(results,null,2));console.log('Two distinct fictional native OIDC/MFA logins completed.');
}finally{await browser.close();}
