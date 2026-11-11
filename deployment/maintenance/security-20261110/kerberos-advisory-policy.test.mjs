import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {additionalAdvisories} from './kerberos-advisory-policy.mjs';
const ids=Array.from({length:10},(_,i)=>'CVE-2026-'+(100+i));
const notes=Buffer.from('Major changes in 1.22.3\n'+ids.map(x=>'['+x+']').join('\n')+'\nMajor changes in 1.22.2');
const m={schemaVersion:1,sourceSha256:'a'.repeat(64),releaseNotesSha256:createHash('sha256').update(notes).digest('hex'),advisories:ids};
test('exact attribution requires authenticated source and release-specific notes',()=>{
  assert.deepEqual(additionalAdvisories(m,m.sourceSha256,notes),ids);
  assert.throws(()=>additionalAdvisories(m,'b'.repeat(64),notes),/Unreviewed/);
  assert.throws(()=>additionalAdvisories(m,m.sourceSha256,Buffer.from('changed')),/Changed release/);
  assert.throws(()=>additionalAdvisories({...m,advisories:[...ids.slice(1),'CVE-2026-999']},m.sourceSha256,notes),/absent/);
  assert.throws(()=>additionalAdvisories({...m,advisories:[...ids.slice(1),ids[1]]},m.sourceSha256,notes));
});
