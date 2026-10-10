// Fictional disposable outputs only; never log generated passwords.
import assert from 'node:assert/strict';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const publicCheck=process.env.UTILIBRE_PUBLIC_CHECK==='1';
const browser=await chromium.launch();
try {
 for(const [name,base,path]of [
  ['IT Tools',publicCheck?'https://dev.utilibre.org':'http://127.0.0.1:3219','/token-generator'],
  ['OmniTools',publicCheck?'https://tools.utilibre.org':'http://127.0.0.1:3213','/string/password-generator'],
 ]) {
  const context=await browser.newContext();
  await context.addInitScript(()=>{
   const original=crypto.getRandomValues.bind(crypto);
   window.utilibreRandomCalls=0;
   crypto.getRandomValues=(array)=>{window.utilibreRandomCalls++;return original(array);};
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+path);
  const output=page.locator('textarea:visible').first();await output.waitFor();
  await page.waitForFunction(()=>window.utilibreRandomCalls>0);
  const before=await output.inputValue();
  const calls=await page.evaluate(()=>window.utilibreRandomCalls);
  if(name==='IT Tools'){
   assert.equal(before.length,64);
   await page.getByRole('button',{name:'Refresh',exact:true}).click();
   assert.equal((await output.inputValue()).length,64);
  }else{
   assert.equal(before.length,12);
   await page.locator('input[type=number]').first().fill('40');
   await page.waitForFunction(()=>document.querySelector('textarea').value.length===40);
   assert.equal((await output.inputValue()).length,40);
  }
  assert.notEqual(await output.inputValue(),before);
  assert(await page.evaluate(()=>window.utilibreRandomCalls)>calls,'Native generation did not use WebCrypto');
  assert.equal(errors.length,0,'Application raised a browser error');
  console.log(name+': native output length, regeneration and WebCrypto calls passed; output discarded');
  await context.close();
 }
 const context=await browser.newContext();
 await context.addInitScript(()=>{
  const original=crypto.getRandomValues.bind(crypto);window.utilibreRandomCalls=0;
  crypto.getRandomValues=array=>{window.utilibreRandomCalls++;return original(array);};
 });
 const page=await context.newPage();
 await page.goto((publicCheck?'https://dev.utilibre.org':'http://127.0.0.1:3219')+'/bip39-generator');
 const phrase=page.getByPlaceholder('Your mnemonic...');await phrase.waitFor();
 const before=await phrase.inputValue();assert.equal(before.trim().split(/\s+/).length,12);
 const calls=await page.evaluate(()=>window.utilibreRandomCalls);assert(calls>0);
 await page.locator('.n-form-item').filter({has:page.getByPlaceholder('Your string...')}).getByRole('button').first().click();
 assert.notEqual(await phrase.inputValue(),before);assert.equal((await phrase.inputValue()).trim().split(/\s+/).length,12);
 assert(await page.evaluate(()=>window.utilibreRandomCalls)>calls);
 console.log('IT Tools BIP39: native 12-word phrase and WebCrypto regeneration passed; output discarded');
 await context.close();
} finally {await browser.close();}
