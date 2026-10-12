// Reuse the established complete synthetic fixtures; no new application logic.
import fs from 'node:fs';import assert from 'node:assert/strict';import cp from 'node:child_process';
import {root,sha,read} from './common.mjs';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname;
for(const key of process.argv.slice(2)){
 assert(['rallly','wishlist'].includes(key));
 const dir=root+'/images/'+key,s=read(dir+'/stage.json');assert.equal(s.status,'passed');assert(!fs.existsSync(dir+'/application.json'));
 fs.writeFileSync(dir+'/build.json',JSON.stringify({passed:true,imageId:s.image})+'\n');
 const upstream=key==='rallly'?'bookworm-curl-followup/rallly-check.mjs':'openssl-bookworm-followup/wishlist-check.mjs';
 const original=fs.readFileSync(here+'../'+upstream,'utf8');
 let code=original.replace(/const dir='[^']+'/, 'const dir='+JSON.stringify(dir))
  .replace("'../../../portal/node_modules/playwright-core/index.mjs'",JSON.stringify('/home/ubuntu/freetools/portal/node_modules/playwright-core/index.mjs'))
  .replaceAll('utilibre-curl-rallly-','utilibre-mount-rallly-').replaceAll('maintenance-openssl-wishlist-','maintenance-mount-wishlist-');
 if(key==='wishlist')code=code.replace("await page.goto(base+'/setup-wizard/step/1');", "await page.goto(base+'/setup-wizard/step/1');await page.waitForLoadState('networkidle');await page.waitForTimeout(500);")
 .replace("await page.locator('#confirmpassword').fill(password);", "await page.locator('#confirmpassword').fill(password);assert.equal(await page.locator('[name=\"password\"]').inputValue(),await page.locator('#confirmpassword').inputValue());")
 .replace("}catch(e){fs.writeFileSync", "}catch(e){if(browser){const page=browser.contexts()[0]?.pages()[0];if(page)fs.writeFileSync(dir+'/failed-body.txt',await page.locator('body').innerText());}fs.writeFileSync");
 assert.notEqual(code,original);const file=root+'/reused-fixtures/'+key+'-native-'+sha(Buffer.from(code)).slice(0,12)+'.mjs';assert(!fs.existsSync(file));
 fs.writeFileSync(file,code);fs.writeFileSync(file+'.provenance.json',JSON.stringify({upstream,upstreamSha256:sha(Buffer.from(original)),adaptedSha256:sha(Buffer.from(code)),changes:['evidence paths','module import path','disposable container names'],applicationBehaviorUnchanged:true},null,2)+'\n');
 cp.execFileSync(process.execPath,[file],{stdio:'inherit',timeout:300000});
}
