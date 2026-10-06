// Remove only fixtures created by this deployment check, after a verified snapshot.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
const snapshot=process.argv[2]||'';
assert.match(snapshot,/^\/opt\/utilibre\/expanded-backups\/\d{4}-\d{2}-\d{2}T[\d-]+Z$/);
assert.ok(existsSync(`${snapshot}/RESTORE-VERIFIED.txt`),'Verify the backup first');
const root='/opt/utilibre/identity-data/data/private/';
const records=JSON.parse(readFileSync(root+'check-records.json','utf8'));
const state=s=>JSON.parse(readFileSync(root+`utilibre-check-${s}-browser.json`,'utf8'));
const headers=(s,host)=>({cookie:state(s).cookies.filter(c=>c.domain===host).map(c=>`${c.name}=${c.value}`).join('; '),origin:`https://${host}`});
for(const s of ['a','b']) {
  const host='cv.utilibre.org',id=records[`resume-${s}`];
  assert.match(id,/^[a-zA-Z0-9_-]+$/);
  const url=`https://${host}/api/openapi/resumes/${id}`;
  const own=await fetch(url,{headers:headers(s,host)});
  assert.equal(own.status,200);
  assert.equal((await own.json()).name,`Utilibre synthetic isolation ${s}`);
  assert.equal((await fetch(url,{method:'DELETE',headers:headers(s,host)})).status,200);
  const purged=await fetch(`https://${host}/api/openapi/documents/purge`,{method:'POST',headers:{...headers(s,host),'content-type':'application/json'},body:JSON.stringify({id,type:'resume'})});
  assert.equal(purged.status,200);
  assert.equal((await fetch(url,{headers:headers(s,host)})).status,404);
}
const file=records['penpot-file-a'];assert.match(file,/^[a-f0-9-]{36}$/);
const deleted=await fetch('https://design.utilibre.org/api/rpc/command/delete-file',{method:'POST',headers:{...headers('a','design.utilibre.org'),'content-type':'application/json'},body:JSON.stringify({id:file})});
assert.ok([200,204].includes(deleted.status));
const actual=new DatabaseSync('/opt/utilibre/expanded-data/actual/server-files/account.sqlite');
const owner=actual.prepare('SELECT id FROM users WHERE user_name=? AND owner=0').get('utilibre-check-a');
assert.ok(owner);
const token=actual.prepare('SELECT token FROM sessions WHERE user_id=? ORDER BY expires_at DESC LIMIT 1').get(owner.id)?.token;
for(const row of actual.prepare('SELECT id FROM files WHERE owner=? AND deleted=0').all(owner.id)) {
  const response=await fetch('https://budget.utilibre.org/sync/delete-user-file',{method:'POST',headers:{'x-actual-token':token,'content-type':'application/json'},body:JSON.stringify({fileId:row.id})});
  assert.equal(response.status,200);
}
for(const s of ['a','b']) {
  const id=actual.prepare('SELECT id FROM users WHERE user_name=? AND owner=0').get(`utilibre-check-${s}`)?.id;
  assert.ok(id);
  actual.prepare('UPDATE users SET enabled=0 WHERE id=?').run(id);
  actual.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
  const response=await fetch('https://wakapi.utilibre.org/settings',{method:'POST',redirect:'manual',headers:{...headers(s,'wakapi.utilibre.org'),'content-type':'application/x-www-form-urlencoded'},body:'action=delete_account'});
  assert.equal(response.status,302);
}
actual.close();
const sql=(container,db,query)=>execFileSync('docker',['exec',container,'psql','-v','ON_ERROR_STOP=1','-U',db,'-d',db,'-c',query],{stdio:'pipe'});
sql('utilibre-expanded-resume-db-1','resume',`BEGIN; UPDATE "user" SET banned=true,ban_reason='Synthetic verification completed' WHERE email IN ('utilibre-check-a@utilibre.org','utilibre-check-b@utilibre.org'); DELETE FROM session WHERE user_id IN (SELECT id FROM "user" WHERE email IN ('utilibre-check-a@utilibre.org','utilibre-check-b@utilibre.org')); COMMIT;`);
sql('utilibre-expanded-penpot-db-1','penpot',`BEGIN; UPDATE profile SET is_active=false WHERE email IN ('utilibre-check-a@utilibre.org','utilibre-check-b@utilibre.org'); DELETE FROM http_session WHERE profile_id IN (SELECT id FROM profile WHERE email IN ('utilibre-check-a@utilibre.org','utilibre-check-b@utilibre.org')); DELETE FROM http_session_v2 WHERE profile_id IN (SELECT id FROM profile WHERE email IN ('utilibre-check-a@utilibre.org','utilibre-check-b@utilibre.org')); COMMIT;`);
console.log('Synthetic CVs/design/budget deleted through app APIs; test app sessions revoked and profiles disabled. Wakapi test accounts deleted. Verified snapshot retains test fixtures.');
