// Public HTTPS with existing authorized synthetic account sessions. Own fixture only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {request} from '../../../portal/node_modules/playwright/index.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/sandbox-final-20261011';
const base='https://grist.utilibre.org';
// Match Grist's native API CSRF contract, including bodyless DELETE requests.
const a=await request.newContext({storageState:'/opt/utilibre/records/private/browser-state-0.json',extraHTTPHeaders:{'X-Requested-With':'XMLHttpRequest'}});
const b=await request.newContext({storageState:'/opt/utilibre/records/private/browser-state-1.json',extraHTTPHeaders:{'X-Requested-With':'XMLHttpRequest'}});
const guest=await request.newContext();
let doc;
async function json(response){assert(response.ok(),'Native Grist API returned HTTP '+response.status());assert.match(response.headers()['content-type']||'',/application\/json/,'Expected native API JSON; refresh the existing synthetic login sessions.');return response.json();}
try{
 const orgs=await json(await a.get(base+'/api/orgs'));assert(orgs.length);
 await json(await b.get(base+'/api/orgs'));
 const anonymous=await guest.get(base+'/api/orgs',{maxRedirects:0});assert([302,303,401,403].includes(anonymous.status()),'Guest access changed');
 if(process.argv[2]==='--preflight'){console.log('Existing synthetic Grist sessions and anonymous boundary verified.');}
 else{
  const spaces=await json(await a.get(base+`/api/orgs/${orgs[0].id}/workspaces`));assert(spaces.length);
  doc=await json(await a.post(base+`/api/workspaces/${spaces[0].id}/docs`,{data:{name:'Fictional sandbox maintenance check'}}));assert.equal(typeof doc,'string');
  fs.writeFileSync(dir+'/live-fixture.json',JSON.stringify({doc})+'\n');
  await json(await a.post(base+`/api/docs/${doc}/tables`,{data:{tables:[{id:'Practice',columns:[{id:'Quantity',fields:{type:'Numeric'}},{id:'Total',fields:{type:'Numeric',isFormula:true,formula:'$Quantity * 3'}}]}]}}));
  await json(await a.post(base+`/api/docs/${doc}/tables/Practice/records`,{data:{records:[{fields:{Quantity:7}}]}}));
  const rows=await json(await a.get(base+`/api/docs/${doc}/tables/Practice/records`));assert.equal(rows.records[0].fields.Total,21);
  assert.equal((await b.get(base+`/api/docs/${doc}/tables/Practice/records`)).status(),403);
  const native=await a.get(base+`/api/docs/${doc}/download`);assert(native.ok());assert.equal((await native.body()).subarray(0,15).toString(),'SQLite format 3');
  const deleted=await a.delete(base+`/api/docs/${doc}`);assert(deleted.ok(),'Native fixture deletion returned HTTP '+deleted.status());
  assert([403,404,410].includes((await a.get(base+`/api/docs/${doc}/tables/Practice/records`)).status()));doc=undefined;
  const result={date:new Date().toISOString(),passed:true,publicHttps:true,existingSyntheticAccounts:true,nativePythonFormula:true,secondAccountDenied:true,guestDenied:true,nativeExport:true,fixtureDeleted:true,scope:'One newly created fictional document only; no existing document read or modified.'};
  fs.writeFileSync(dir+'/live.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }
}finally{
 if(doc){try{assert((await a.delete(base+`/api/docs/${doc}`)).ok());}catch{console.error('Synthetic fixture cleanup needs review; restricted live-fixture.json retained.');}}
 await a.dispose();await b.dispose();await guest.dispose();
}
