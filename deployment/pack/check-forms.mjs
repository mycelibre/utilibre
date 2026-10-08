import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
const require=createRequire(new URL('../../portal/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const owner=JSON.parse(await readFile('/opt/utilibre/pack-secrets/liberaforms-owner.json','utf8'));
const browser=await chromium.launch({args:['--host-resolver-rules=MAP forms.utilibre.org 127.0.0.1:8443']});
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true,acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(12000);const outside=[];
 page.on('request',r=>{if(!r.url().startsWith('https://forms.utilibre.org/')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))outside.push(new URL(r.url()).origin)});
 await page.goto('https://forms.utilibre.org/user/login');
 await page.locator('#username').fill(owner.username);await page.locator('#password').fill(owner.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.waitForTimeout(500);
 console.log((await page.locator('body').innerText()).slice(-2500));
 console.log('external origins',outside);
 await context.storageState({path:'/opt/utilibre/pack-secrets/forms-owner-state.json'});
 console.log('links',await page.locator('a').evaluateAll(a=>a.filter(e=>e.getBoundingClientRect().height).map(e=>({label:e.textContent.trim(),path:e.getAttribute('href')}))));
}finally{await browser.close()}
