// Preserve the existing owner and activity; attach its verified OIDC subject.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
const subject=readFileSync('/opt/utilibre/identity-data/data/private/owner-subject','utf8').trim();
if(!/^[a-f0-9]+$/.test(subject)) throw Error('Unexpected owner subject format');
const db=new DatabaseSync('/opt/utilibre/expanded-data/wakapi/wakapi.db');
db.exec('BEGIN IMMEDIATE');
try {
  const owner=db.prepare("SELECT id,is_admin,email,auth_type,sub FROM users WHERE id='utilibre-admin'").get();
  if(!owner || owner.is_admin!==1 || (owner.email && owner.email!=='admin@utilibre.org')) throw Error('Unexpected owner; refusing to modify');
  if(owner.auth_type!=='local' && !(owner.auth_type==='utilibre' && owner.sub===subject)) throw Error('Owner already bound to another identity');
  db.prepare("UPDATE users SET email=?,auth_type=?,sub=? WHERE id='utilibre-admin'").run('admin@utilibre.org','utilibre',subject);
  db.exec('COMMIT');
  console.log('Existing Wakapi administrator linked to Utilibre identity; password, API key and activity preserved.');
} catch(error) {db.exec('ROLLBACK');throw error;} finally {db.close();}
