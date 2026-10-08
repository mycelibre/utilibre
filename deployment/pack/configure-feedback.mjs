// Populate the native FormBuilder through its supported setData interface.
// Run only against the operator-owned feedback form created by the native UI.
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(new URL('../../portal/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const fields=JSON.parse(await readFile(new URL('./feedback-fields.json',import.meta.url),'utf8'));
const browser=await chromium.launch({args:['--ignore-certificate-errors','--host-resolver-rules=MAP forms.utilibre.org 127.0.0.1:8443']});
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true,storageState:'/opt/utilibre/pack-secrets/forms-owner-keys-state.json'});
 const p=await context.newPage();p.setDefaultTimeout(15000);
 await p.goto('https://forms.utilibre.org/form/1/edit');
 await p.locator('.editor-ui').waitFor();
 await p.evaluate(async fields=>{await formBuilder.promise;formBuilder.actions.setData(fields)},fields);
 await p.locator('button.form-save').first().click();
 await p.waitForTimeout(500);
 console.log('Native form fields saved; no hidden identifiers or diagnostics added.');
 await p.goto('https://forms.utilibre.org/form/1/options');
 console.log((await p.locator('body').innerText()).slice(-4400));
 await context.storageState({path:'/opt/utilibre/pack-secrets/forms-owner-keys-state.json',indexedDB:true});
}finally{await browser.close()}
