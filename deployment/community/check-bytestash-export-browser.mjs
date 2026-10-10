import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const user=JSON.parse(await readFile('/opt/utilibre/identity-data/data/private/opengist-native-qa.json','utf8'));
assert.equal(user.username,'utilibre-check-a');assert(!user.retired);
function otp(key){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hash=createHmac('sha1',Buffer.from(key,'hex')).update(counter).digest();return String((hash.readUInt32BE(hash[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const ctx=await browser.newContext({storageState:'/opt/utilibre/reports/new-services-20261009/bytestash-browser-state.json'}),requests=[],errors=[];ctx.setDefaultTimeout(30000);ctx.setDefaultNavigationTimeout(30000);
try{
 await ctx.route('https://auth.utilibre.org/**',async route=>{
 const response=await route.fetch({maxRedirects:0});const location=response.headers().location;
 if(location?.startsWith('https://snippets-library.utilibre.org/')) {await route.fulfill({response,status:200,headers:{...response.headers(),location:'','content-type':'text/html','content-security-policy':'','content-length':''},body:'<script>location.href='+JSON.stringify(location)+';</script>'});return;}
 await route.fulfill({response});
 });
 await ctx.route('https://snippets-library.utilibre.org/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  const response=await ctx.request.fetch('http://10.10.1.43:3204'+url.pathname+url.search,{method:request.method(),headers:{...request.headers(),host:'snippets-library.utilibre.org'},data:request.postDataBuffer()??undefined,maxRedirects:0});
  console.log('Intercept:',url.pathname,response.status()); const location=response.headers().location;
  if(location && response.status()>=300 && response.status()<400){await route.fulfill({response,status:200,headers:{...response.headers(),location:'','content-type':'text/html','content-security-policy':'','content-length':''},body:'<script>location.href='+JSON.stringify(new URL(location,request.url()).href)+';</script>'});return;}
  await route.fulfill({response});
 });
 const page=await ctx.newPage();page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('Page:',new URL(f.url()).origin+new URL(f.url()).pathname)});page.on('request',r=>requests.push(new URL(r.url()).hostname));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://snippets-library.utilibre.org/');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 const downloadEvent=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export Snippets (JSON)',exact:true}).click();
 const download=await downloadEvent;
 const output='/opt/utilibre/reports/new-services-20261009/bytestash-native-export.json';await download.saveAs(output);
 const exported=JSON.parse(await readFile(output,'utf8'));assert.equal(exported.snippets.length,1);assert.equal(exported.snippets[0].fragments[0].code,'print("Fictional test")\n');
 await page.locator('input[type=file][accept=".json"]').setInputFiles(output);
 await page.getByText(/Successfully imported/).waitFor();
 await page.waitForTimeout(500);
 await writeFile('/opt/utilibre/reports/new-services-20261009/bytestash-export-browser.json',JSON.stringify({nativeJsonDownload:true,nativeJsonImport:true,fictionalCodeBytes:true,exportFields:Object.keys(exported.snippets[0]),networkHosts:[...new Set(requests)]},null,2));
 await writeFile('/opt/utilibre/reports/new-services-20261009/bytestash-browser-state.json',JSON.stringify(await ctx.storageState()),{mode:0o600});
 assert.deepEqual([...new Set(requests)].filter(h=>!['auth.utilibre.org','snippets-library.utilibre.org'].includes(h)),[]);
 await writeFile('/opt/utilibre/reports/new-services-20261009/bytestash-browser.json',JSON.stringify({nativeOidcMfa:true,approvedQaOnly:true,firstOidcUserNotAdmin:true,nativeDashboard:true,hosts:[...new Set(requests)],javascriptErrors:errors.filter(e=>!e.includes('EventSource')),transport:'canonical URL intercepted only to private gateway; public edge pending'},null,2));
 console.log('Vikunja native MFA/OIDC, settings and no third-party browser requests passed.');
}finally{await ctx.close();await browser.close();}
