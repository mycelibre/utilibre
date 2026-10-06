// Read only synthetic users' runtime tokens. Never print them or inspect real data.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
const actual = new DatabaseSync('/opt/utilibre/expanded-data/actual/server-files/account.sqlite',{readOnly:true});
const users = ['a','b'].map(suffix => actual.prepare('SELECT * FROM users WHERE user_name=?').get(`utilibre-check-${suffix}`));
for (const user of users) assert.ok(user && user.role==='BASIC' && !user.owner);
const file = actual.prepare('SELECT id FROM files WHERE owner=? AND deleted=0').get(users[0].id);
assert.ok(file,'Create a synthetic budget with CHECK_CREATE=1 before this check');
for (const [index,user] of users.entries()) {
  const session=actual.prepare('SELECT token FROM sessions WHERE user_id=? ORDER BY expires_at DESC LIMIT 1').get(user.id);
  assert.ok(session);
  const headers={'x-actual-token':session.token,'x-actual-file-id':file.id};
  const response=await fetch('https://budget.utilibre.org/sync/download-user-file',{headers});
  assert.equal(response.status,index===0?200:403);
  if(index===0) assert.ok((await response.arrayBuffer()).byteLength>1000);
  console.log(`Actual ${index===0?'owner export':'other-user denial'} passed.`);
}
actual.close();
const wakapi=new DatabaseSync('/opt/utilibre/expanded-data/wakapi/wakapi.db',{readOnly:true});
for(const suffix of ['a','b']) {
  const name=`utilibre-check-${suffix}`;
  const user=wakapi.prepare('SELECT * FROM users WHERE id=?').get(name);
  assert.ok(user && !user.is_admin && user.auth_type==='utilibre');
  assert.ok(!user.share_data_max_days && !user.public_leaderboard && !user.share_projects);
  const headers={authorization:`Basic ${Buffer.from(user.api_key).toString('base64')}`};
  const base='https://wakapi.utilibre.org/api/compat/wakatime/v1/users/';
  const own=await fetch(`${base}${name}/stats/last_7_days`,{headers});
  assert.equal(own.status,200);
  const other=await fetch(`${base}utilibre-check-${suffix==='a'?'b':'a'}/stats/last_7_days`,{headers});
  assert.ok([401,403,404].includes(other.status));
  console.log(`Wakapi ${suffix}: own stats readable; other user's private stats denied (${other.status}).`);
}
wakapi.close();
