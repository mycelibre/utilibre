import assert from 'node:assert/strict';
import {proveSqlite} from '../security-20261103/sqlite-policy.mjs';

// Preparation proof is distinct from release approval. No scanner waiver.
export function proveSqliteFollowup(s,b,n,source){
 proveSqlite(s,b,n,source);
 const versions={bookworm:'3.40.1-2+deb12u2+utilibre4',trixie:'3.46.1-7+deb13u2+utilibre2'};
 assert.equal(s.version,versions[s.suite]);
 assert.equal(n.rows[1].sessionChecks,5);
 assert.equal(n.rows[1].secureDeleteChecks,s.suite==='trixie'?3:0);
 assert(source.sessionTests>0);
 assert(s.suite==='trixie'?source.secureDeleteTests>0:source.secureDeleteTests===null);
 assert.deepEqual(source.advisories,['CVE-2026-119374','CVE-2026-119379']);
 assert.equal(source.sourceSpecSha256,s.sourceSpecSha256);
 assert.equal(source.buildScriptSha256,s.buildScriptSha256);
 assert.equal(source.sanitizerScriptSha256,s.sanitizerScriptSha256);
 assert.equal(source.patches.length,s.suite==='trixie'?2:1);
 assert.deepEqual(source.patches,s.patches);
 return true;
}

export function sqliteReleaseApproval(s){
 assert.equal(s.releaseApproval,'approved');
 assert.equal(s.releaseScope,'system-sqlite-library-only');
 assert.equal(s.dataMigration,false);
 assert(s.containers.length>0);
 return true;
}
