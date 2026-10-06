// Exercise real application authorization with the two synthetic browser sessions.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const records = {};
const state = suffix => JSON.parse(readFileSync(`/opt/utilibre/identity-data/data/private/utilibre-check-${suffix}-browser.json`,'utf8'));
async function call(suffix, host, port, path, method='GET', data) {
  const cookie=state(suffix).cookies.filter(c=>c.domain===host).map(c=>`${c.name}=${c.value}`).join('; ');
  const response=await fetch(`http://10.10.1.43:${port}${path}`,{method,headers:{host,cookie,origin:`https://${host}`,'x-forwarded-proto':'https',...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,redirect:'manual'});
  const body=await response.text();
  return {status:response.status,body};
}
for(const suffix of ['a','b']) {
  const created=await call(suffix,'cv.utilibre.org',3130,'/api/openapi/resumes','POST',{name:`Utilibre synthetic isolation ${suffix}`,tags:[],withSampleData:false});
  assert.equal(created.status,200,created.body);
  const id=JSON.parse(created.body);
  const own=await call(suffix,'cv.utilibre.org',3130,`/api/openapi/resumes/${id}`);
  assert.equal(own.status,200);
  assert.equal(JSON.parse(own.body).isPublic,false);
  const other=await call(suffix==='a'?'b':'a','cv.utilibre.org',3130,`/api/openapi/resumes/${id}`);
  assert.ok([403,404].includes(other.status),`Cross-user resume status ${other.status}`);
  records[`resume-${suffix}`]=id;
  console.log(`Resume ${suffix}: created, private by default, JSON export read by owner, other user denied (${other.status}).`);
}
const rows=execFileSync('docker',['exec','utilibre-expanded-penpot-db-1','psql','-U','penpot','-d','penpot','-Atc',"SELECT p.email,r.project_id FROM profile p JOIN project_profile_rel r ON p.id=r.profile_id WHERE p.email IN ('utilibre-check-a@utilibre.org','utilibre-check-b@utilibre.org');"],{encoding:'utf8'}).trim().split('\n');
for(const row of rows) {
  const [email,projectId]=row.split('|'), suffix=email.includes('check-a@')?'a':'b';
  const own=await call(suffix,'design.utilibre.org',3131,`/api/rpc/command/get-project?id=${projectId}`);
  assert.equal(own.status,200,own.body);
  const other=await call(suffix==='a'?'b':'a','design.utilibre.org',3131,`/api/rpc/command/get-project?id=${projectId}`);
  assert.ok([403,404].includes(other.status),`Cross-user project status ${other.status}`);
  records[`penpot-project-${suffix}`]=projectId;
  console.log(`Penpot ${suffix}: persisted project visible to owner, other user denied (${other.status}).`);
}
writeFileSync('/opt/utilibre/identity-data/data/private/check-records.json',JSON.stringify(records),{mode:0o600});
