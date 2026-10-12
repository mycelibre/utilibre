const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='http://127.0.0.1:8484';
const a={'X-Forwarded-Email':'fictional-a@example.invalid'},b={'X-Forwarded-Email':'fictional-b@example.invalid'};
async function api(path,method='GET',data,identity=a){const r=await fetch(base+path,{method,headers:{...identity,'content-type':'application/json'},body:data?JSON.stringify(data):undefined});assert.equal(r.ok,true,`${path}: HTTP ${r.status}`);return r.json();}
async function upload(workspace,name,bytes){const form=new FormData();form.append('upload',new Blob([bytes]),name);const r=await fetch(base+`/api/workspaces/${workspace}/import`,{method:'POST',headers:{...a,'X-Requested-With':'XMLHttpRequest'},body:form});assert.equal(r.ok,true,`import: HTTP ${r.status}: ${(await r.clone().text()).slice(0,300)}`);return r.json();}
(async()=>{
if(process.argv[2]==='restore'){
  const state=JSON.parse(fs.readFileSync('/fixture/state.json'));
  for(const doc of state.docs)assert.equal((await api(`/api/docs/${doc}/tables/Practice/records`)).records[0].fields.Total,21);
  for(const doc of state.docs)assert.equal((await fetch(base+`/api/docs/${doc}/tables/Practice/records`,{headers:b})).status,403);
  console.log(JSON.stringify({passed:true,checks:['native persisted document/formula restored','second-account isolation preserved after restore']}));return;
}
const orgs=await api('/api/orgs');assert.ok(orgs.length);
const spaces=await api(`/api/orgs/${orgs[0].id}/workspaces`);assert.ok(spaces.length);const workspace=spaces[0].id;
const doc=await api(`/api/workspaces/${workspace}/docs`,'POST',{name:'Fictional sandbox regression'});
await api(`/api/docs/${doc}/tables`,'POST',{tables:[{id:'Practice',columns:[{id:'Quantity',fields:{type:'Numeric'}},{id:'Total',fields:{type:'Numeric',isFormula:true,formula:'$Quantity * 3'}}]}]});
await api(`/api/docs/${doc}/tables/Practice/records`,'POST',{records:[{fields:{Quantity:7}}]});
assert.equal((await api(`/api/docs/${doc}/tables/Practice/records`)).records[0].fields.Total,21);
assert.equal((await fetch(base+`/api/docs/${doc}/tables/Practice/records`,{headers:b})).status,403);
const exported=await fetch(base+`/api/docs/${doc}/download`,{headers:a});assert.equal(exported.status,200);const bytes=Buffer.from(await exported.arrayBuffer());assert.equal(bytes.subarray(0,15).toString(),'SQLite format 3');
const restored=await upload(workspace,'fictional.grist',bytes);const restoredId=restored.id||restored.docId;assert.equal(typeof restoredId,'string');
assert.equal((await api(`/api/docs/${restoredId}/tables/Practice/records`)).records[0].fields.Total,21);
const csv=await upload(workspace,'fictional.csv','Item,Quantity\nBooks,3\nPens,7\n');const csvId=csv.id||csv.docId;const tables=await api(`/api/docs/${csvId}/tables`);const imported=await api(`/api/docs/${csvId}/tables/${tables.tables[0].id}/records`);assert.equal(imported.records.length,2);assert.equal(imported.records[0].fields.Quantity,3);
await api(`/api/docs/${csvId}`,'DELETE');
fs.writeFileSync('/fixture/state.json',JSON.stringify({docs:[doc,restoredId]})+'\n');
console.log(JSON.stringify({passed:true,checks:['native private document and Python formula','second-account isolation','SQLite export/import/recalculation','CSV import numeric parsing','native deletion'],exportBytes:bytes.length}));
})().catch(e=>{console.error(String(e));process.exitCode=1});
