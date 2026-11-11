import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// A finite reviewed list, never auto-accept arbitrary future advisory IDs.
export function additionalAdvisories(manifest, archiveHash, notes){
  assert.equal(manifest.schemaVersion,1);
  assert.equal(archiveHash,manifest.sourceSha256,'Unreviewed Kerberos source');
  assert.equal(createHash('sha256').update(notes).digest('hex'),manifest.releaseNotesSha256,'Changed release notes');
  const text=notes.toString();
  const section=text.split('Major changes in 1.22.3')[1]?.split('Major changes in 1.22.2')[0];
  assert(section,'Missing upstream release section');
  assert.equal(manifest.advisories.length,10);
  assert.equal(new Set(manifest.advisories).size,10);
  for(const id of manifest.advisories){assert(/^CVE-2026-\d+$/.test(id));assert(section.includes('['+id+']'),'Advisory absent from authenticated release notes');}
  return manifest.advisories;
}
