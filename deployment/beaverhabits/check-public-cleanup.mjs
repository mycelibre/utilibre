import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const users=JSON.parse(await readFile('/opt/utilibre/beaverhabits/private/public-qa.json','utf8'));
const out='/opt/utilibre/reports/beaver-public-20261009',base='https://habits.utilibre.org';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const contexts=[];
try{
 for(let i=0;i<users.length;i++){
 const c=await browser.newContext({storageState:out+'/browser-state-'+i+'.json'});contexts.push(c);const p=await c.newPage();p.setDefaultTimeout(20000);
 if(i===0){
  await p.goto(base+'/gui/tokens');await p.getByRole('button',{name:'Generate API Token',exact:true}).click();const key=p.getByLabel('Your API Token',{exact:true});await key.waitFor();const token=await key.inputValue();assert(token.length>20);
  let r=await c.request.get(base+'/api/v1/habits/export',{headers:{Authorization:'Bearer '+token}});assert(r.ok());
  await p.getByRole('button',{name:'Delete',exact:true}).click();await p.getByRole('button',{name:'Generate API Token',exact:true}).waitFor();r=await c.request.get(base+'/api/v1/habits/export',{headers:{Authorization:'Bearer '+token}});assert.equal(r.status(),401);
 }
 await p.goto(base+'/gui/export');const dl=p.waitForEvent('download');await p.getByRole('button',{name:'Delete',exact:true}).click();await p.getByRole('button',{name:'Yes',exact:true}).click();await(await dl).saveAs(out+'/deletion-export-'+i+'.json');await p.waitForTimeout(1000);
 const r=await c.request.get(base+'/api/v1/habits/export',{headers:{Authorization:'Bearer '+users[i].token}});assert.equal(r.status(),401);
 }
 await writeFile(out+'/native-cleanup.json',JSON.stringify({nativeApiTokenCreatedAndRevoked:true,nativeAccountDeletion:2,automaticJsonDownloads:2,oldSessionsDenied:true,realAccountsTouched:false},null,2));console.log('Native token revocation and both fictional account deletions passed.');
}finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();}
