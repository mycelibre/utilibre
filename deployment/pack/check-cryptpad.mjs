import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../portal/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
// Certificate bypass is only for this loopback private-CA test, never production.
const publicTest=process.env.PACK_PUBLIC==='1';
const browser=await chromium.launch(publicTest?{}:{args:['--ignore-certificate-errors','--host-resolver-rules=MAP pad.utilibre.org 127.0.0.1:8443, MAP sandbox-pad.utilibre.org 127.0.0.1:8443']});
try {
 const a=await browser.newContext({ignoreHTTPSErrors:!publicTest,acceptDownloads:true,storageState:'/opt/utilibre/pack-secrets/cryptpad-owner-state.json'});
 const b=await browser.newContext({ignoreHTTPSErrors:!publicTest});
 const p=await a.newPage();p.setDefaultTimeout(18000);const outside=[];
 for(const c of [a,b])c.on('request',r=>{const u=new URL(r.url());if(!['pad.utilibre.org','sandbox-pad.utilibre.org'].includes(u.hostname)&&!['blob:','data:'].includes(u.protocol))outside.push(u.origin)});
 await p.goto('https://pad.utilibre.org/code/');const f=p.frameLocator('#sbox-iframe');
 await f.getByRole('button',{name:/^create$/i}).click();
 await f.locator('.CodeMirror-code').click();await p.keyboard.type('# Fictional workshop\n\nThree volunteers, one shared plan.');
 await p.waitForTimeout(1600);
 await f.getByRole('button',{name:'Share',exact:true}).click();
 await p.waitForTimeout(1000);
 const share=p.frames().find(fr=>fr.url().includes('/secureiframe/'));
 if(!share)throw Error('Native sharing frame unavailable');
 await share.getByText('Edit',{exact:true}).click();
 const url=await share.locator('#cp-share-link-preview').inputValue();assert.ok(url.includes('#'));
 await writeFile('/opt/utilibre/pack-secrets/cryptpad-test-document-url.txt',url,{mode:0o600});
 await share.getByRole('button',{name:'Cancel',exact:true}).click();
 const q=await b.newPage();await q.goto(url);const g=q.frameLocator('#sbox-iframe');
 await g.getByText('Three volunteers, one shared plan.',{exact:true}).first().waitFor();
 const noStore=g.getByRole('button',{name:/don't store/i});if(await noStore.isVisible())await noStore.click();
 await g.locator('.CodeMirror-code').click();await q.keyboard.press('Control+End');await q.keyboard.type('\nA second participant edited this.');
 await f.getByText('A second participant edited this.',{exact:true}).first().waitFor();
 await p.reload();await f.getByText('A second participant edited this.',{exact:true}).first().waitFor();
 console.log('Two independent clients edited; owner reload retained content.');
 await f.getByRole('button',{name:'File',exact:true}).click();
 console.log('file menu',(await f.locator('body').innerText()).slice(-2000));
 assert.deepEqual(outside,[]);console.log('External browser requests: 0');
 await a.storageState({path:'/opt/utilibre/pack-secrets/cryptpad-owner-state.json',indexedDB:true});
}finally{await browser.close()}
