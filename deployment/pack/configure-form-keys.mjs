// One-time native owner key wizard. Never print keys or browser state.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(new URL('../../portal/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const browser=await chromium.launch({args:['--ignore-certificate-errors','--host-resolver-rules=MAP forms.utilibre.org 127.0.0.1:8443']});
try {
 const context=await browser.newContext({ignoreHTTPSErrors:true,storageState:'/opt/utilibre/pack-secrets/forms-owner-state.json',permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 await page.goto('https://forms.utilibre.org/user/e2ee-public-key');
 // Fails rather than overwriting an existing key: only initial Generate exists.
 await page.getByRole('button',{name:'Generar',exact:true}).click();
 await page.getByRole('button',{name:'Copiar la clave al portapapeles',exact:true}).click();
 const key=await page.evaluate(()=>navigator.clipboard.readText());
 if(key.length<100)throw Error('No native private key');
 await writeFile('/opt/utilibre/pack-secrets/forms-owner-private-key.txt',key,{mode:0o600});
 await page.getByRole('checkbox').click();
 await page.locator('#pasted-private-key').fill(key);
 await page.getByRole('button',{name:'Restaurar',exact:true}).click();
 await page.getByRole('checkbox').nth(0).click();
 await page.getByRole('checkbox').nth(1).click();
 await page.getByRole('button',{name:'Guardar',exact:true}).click();
 await page.waitForTimeout(800);
 await context.storageState({path:'/opt/utilibre/pack-secrets/forms-owner-keys-state.json',indexedDB:true});
 console.log('Native key generated, private backup saved, restore verified and public key saved.');
}finally{await browser.close()}
