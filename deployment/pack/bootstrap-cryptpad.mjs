// First-admin bootstrap through the native UI; secrets never enter stdout.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const require=createRequire(new URL('../../portal/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const privateDir='/opt/utilibre/pack-secrets';
await mkdir(privateDir,{recursive:true,mode:0o700});
const accountFile=`${privateDir}/cryptpad-owner.json`;
let account;
try{account=JSON.parse(await readFile(accountFile,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;account={username:'admin@utilibre.org',password:randomBytes(32).toString('base64url')};await writeFile(accountFile,JSON.stringify(account),{mode:0o600,flag:'wx'})}
const decrees=(await readFile('/opt/utilibre/pack-data/cryptpad/data/decrees/decree.ndjson','utf8')).trim().split('\n').map(x=>JSON.parse(x));
if(decrees.some(d=>d[0]==='ADD_ADMIN_KEY'))throw Error('An administrator already exists; do not bootstrap again');
const token=decrees.filter(d=>d[0]==='ADD_INSTALL_TOKEN').at(-1)?.[1]?.[0];
if(!token)throw Error('No native install token');
const browser=await chromium.launch({args:['--host-resolver-rules=MAP pad.utilibre.org 127.0.0.1:8443, MAP sandbox-pad.utilibre.org 127.0.0.1:8443']});
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto('https://pad.utilibre.org/install/');
 await page.locator('#installtoken').fill(token);await page.locator('#username').fill(account.username);await page.locator('#password').fill(account.password);await page.locator('#password-confirm').fill(account.password);await page.locator('#register').click();
 // Native email-name warning, then the account-recovery warning.
 await page.locator('.alertify:not(.ajs-hidden) .ok, .alertify:not(.ajs-hidden) .ajs-ok').first().click();
 await page.getByRole('button',{name:/I have written down/i}).click();
 await page.waitForTimeout(8000);
 await context.storageState({path:`${privateDir}/cryptpad-owner-state.json`});
 console.log((await page.locator('body').innerText()).replaceAll(account.username,'[owner]').slice(0,4500));
}finally{await browser.close()}
