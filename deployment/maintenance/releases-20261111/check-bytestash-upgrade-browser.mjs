// Native export/import against the disposable upgrade fixture only.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
const directory=process.argv[2];
assert(directory?.startsWith('/var/lib/utilibre-maintenance/held-upgrades-20261111/bytestash/'));
const input=JSON.parse(await readFile(directory+'/browser-input.json','utf8'));
assert.match(input.network,/^maintenance-bytestash-[a-f0-9]{8}$/);
const network=JSON.parse(execFileSync('docker',['network','inspect',input.network],{encoding:'utf8'}))[0];
assert.equal(network.Internal,true);
const base=new URL(input.base);
assert.equal(base.protocol,'https:');
assert(Object.values(network.Containers).some(c=>c.IPv4Address.split('/')[0]===base.hostname));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:900},locale:'en-US'});
const outside=[],errors=[];
try {
 await context.addCookies(input.cookies);
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(['http:','https:'].includes(url.protocol)&&url.origin!==base.origin){outside.push(url.origin);return route.abort();}
  return route.continue();
 });
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base.href,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 const event=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export Snippets (JSON)',exact:true}).click();
 const download=await event,output=directory+'/native-export.json';
 await download.saveAs(output);
 const exported=JSON.parse(await readFile(output,'utf8'));
 assert.equal(exported.snippets.length,1);
 assert.equal(exported.snippets[0].fragments[0].code,input.expectedCode);
 await page.locator('input[type=file][accept=".json"]').setInputFiles(output);
 await page.getByText(/Successfully imported/).waitFor();
 await page.reload({waitUntil:'networkidle'});
 const response=await context.request.get(base.origin+'/api/snippets');
 assert.equal(response.status(),200);
 const data=await response.json();
 assert.equal(data.pagination.total,2);
 assert.equal(data.data.length,2);
 assert(data.data.every(s=>s.fragments[0].code===input.expectedCode));
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:directory+'/native-mobile.png',fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 assert.equal(overflow,false);
 assert.deepEqual(outside,[]);
 assert.deepEqual(errors,[]);
 await writeFile(directory+'/browser-result.json',JSON.stringify({passed:true,nativeJsonDownload:true,nativeJsonImport:true,reloadedCopies:2,fictionalCodeBytes:true,externalRequests:outside,javascriptErrors:errors,mobileViewport:{width:390,height:844},horizontalOverflow:overflow,realPhone:false},null,2)+'\n',{mode:0o600});
 console.log('Native ByteStash export/import, persistence, local assets and narrow viewport passed');
} finally {await context.close();await browser.close();}
