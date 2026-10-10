// Read-only public metadata/icon check. Never fetch an existing paste.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(new URL('../../../portal/package.json',import.meta.url))('playwright-core');
const base='https://paste.utilibre.org',report='/opt/utilibre/reports/privatebin-discovery-20261009';
const result={checkedAt:new Date().toISOString(),checks:[]};
const browser=await chromium.launch();
try{
 for(const [locale,title]of [['en-US','Encrypted text sharing'],['es-GT','Compartir texto cifrado']]){
  const ctx=await browser.newContext({locale,viewport:{width:locale==='es-GT'?390:1280,height:900}}),page=await ctx.newPage(),hosts=new Set(),errors=[];
  page.on('request',r=>hosts.add(new URL(r.url()).hostname));page.on('pageerror',e=>errors.push(e.message));
  const r=await page.goto(base+'/');assert.equal(r.status(),200);assert(!r.headers()['x-robots-tag']);await page.locator('#message').waitFor({state:'visible'});assert((await page.title()).startsWith(title));assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'index, follow');assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),base+'/');assert(await page.locator('link[rel=icon][sizes="512x512"]').count());assert.deepEqual([...hosts],[new URL(base).hostname]);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:report+'/public-'+locale+'.png',fullPage:true});
  result.checks.push(locale+' homepage metadata, native editor, local assets and no overflow');await ctx.close();
 }
}finally{await browser.close()}
const curl=(path,...args)=>execFileSync('curl',['--fail','--silent','--show-error','--max-time','30',...args,base+path]);
const head=curl('/','-I').toString();assert(!/^x-robots-tag:.*noindex/im.test(head));result.checks.push('HEAD homepage omits noindex consistently');
for(const path of ['/?utilibre_discovery_check=1','/index.php','/utilibre-discovery-not-found']){const raw=curl(path,'-i').toString();assert(/^x-robots-tag:.*noindex/im.test(raw));assert(/name="robots" content="noindex/.test(raw));assert(!raw.includes('rel="canonical"'));result.checks.push(path+' noindex and no canonical')}
for(const [path,local,mime]of [['/favicon.ico','favicon.ico','image/x-icon'],['/utilibre-brand/favicon-48.png','favicon-48.png','image/png'],['/utilibre-brand/icon-512.png','icon-512.png','image/png'],['/utilibre-brand/apple-touch-icon-180.png','apple-touch-icon-180.png','image/png']]){
 const headers=curl(path,'-I').toString();assert(headers.includes(mime));assert(!/^x-robots-tag:.*noindex/im.test(headers));const file=curl(path),expected=await readFile(new URL('../config/privatebin/brand/'+local,import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),createHash('sha256').update(expected).digest('hex'));result.checks.push(path+' real '+mime+', matching local bytes and no noindex');
}
const robots=curl('/robots.txt').toString();assert(robots.includes('Allow: /$')&&robots.includes('Disallow: /?')&&robots.includes('Allow: /utilibre-brand/'));result.checks.push('public robots permits homepage/static assets and excludes private/query URLs');result.passed=true;await writeFile(report+'/public-result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
