import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage();await page.setContent('<!doctype html><title>Fictional sanitizer fixture</title>');await page.addScriptTag({path:'/opt/utilibre/community-src/donetick-frontend/sanitize-check.js'});
 const result=await page.evaluate(()=>{const clean=SanitizeFixture.sanitizeHtml('<p>Fictional note</p><img src="/fictional.png" dt-data-path="users/7/fictional.png" onerror="/* inert fictional event */"><script type="text/plain">Fictional inert script</script><a href="javascript:void(0)">Fictional link</a>');const doc=new DOMParser().parseFromString(clean,'text/html');return {text:doc.querySelector('p')?.textContent,keepsNativeImageKey:doc.querySelector('img')?.getAttribute('dt-data-path')==='users/7/fictional.png',noScript:!doc.querySelector('script'),noEvent:!doc.querySelector('[onerror]'),noScriptProtocol:!doc.querySelector('a').hasAttribute('href')};});
 assert.deepEqual(result,{text:'Fictional note',keepsNativeImageKey:true,noScript:true,noEvent:true,noScriptProtocol:true});await writeFile('/opt/utilibre/reports/donetick-20261009/sanitizer.json',JSON.stringify(result,null,2));console.log('Browser sanitizer preserves native image keys and strips executable markup.');
}finally{await browser.close();}
