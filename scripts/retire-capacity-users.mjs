// Revoke only this run's disposable CV/identity users after fixture cleanup.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const run=process.env.UTILIBRE_CAPACITY_CHECK_RUN;
assert.match(run||'',/^[a-z0-9]{1,12}$/);
const names=['a','b'].map(s=>`utilibre-cap-${s}-${run}`);
const emails=names.map(n=>`'${n}@utilibre.org'`).join(',');
const sql=query=>execFileSync('docker',['exec','-i','utilibre-expanded-resume-db-1','psql','-v','ON_ERROR_STOP=1','-U','resume','-d','resume','-At'],{input:query,encoding:'utf8'}).trim();
const rows=sql(`SELECT email || '|' || username || '|' || COALESCE(role,'') FROM "user" WHERE email IN (${emails});`).split('\n').filter(Boolean);
for(const row of rows){const [email,name,role]=row.split('|');assert(names.includes(name)&&email===`${name}@utilibre.org`&&role==='user');}
// Never remove documents from an arbitrary account; all test documents should
// already have been purged through their owner's native application API.
assert.equal(sql(`SELECT count(*) FROM resume WHERE user_id IN (SELECT id FROM "user" WHERE email IN (${emails}));`),'0','Synthetic CV cleanup is incomplete; do not retire sessions yet');
sql(`BEGIN; UPDATE "user" SET banned=true,ban_reason='Synthetic capacity verification completed' WHERE email IN (${emails}) AND role='user'; DELETE FROM session WHERE user_id IN (SELECT id FROM "user" WHERE email IN (${emails}) AND banned=true); COMMIT;`);
const output=execFileSync('docker',['exec','-i','-e',`UTILIBRE_CAPACITY_CHECK_RUN=${run}`,'-e','UTILIBRE_CAPACITY_ACTION=retire','utilibre-identity-server-1','ak','shell','-c','import sys; exec(sys.stdin.read())'],{input:readFileSync(new URL('../deployment/identity/capacity-users.py',import.meta.url)),encoding:'utf8',maxBuffer:2*1024*1024,stdio:['pipe','pipe','pipe']});
assert(output.includes('Capacity identities disabled;'));
console.log('Synthetic CV profiles disabled and sessions revoked; Authentik identities, sessions, tokens and MFA retired. No operator account changed.');
