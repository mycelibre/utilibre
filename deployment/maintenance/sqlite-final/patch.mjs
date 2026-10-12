import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const commit='b816ca9994e03a8bc829b49452b8158a731e81a9';
const response=await fetch(`https://github.com/sqlite/sqlite/commit/${commit}.patch`);
assert(response.ok,'Official patch download failed');
const patch=await response.text();
assert.equal(createHash('sha256').update(patch).digest('hex'),'411243a6543e3bf4adb5674c29ee9166515cb01cc975e7b9a6d664bb3277e4be');
writeFileSync('/out/upstream.patch',patch);
const chunks=patch.split(/(?=^diff --git )/m).filter(s=>/^diff --git a\/(src\/where\.c|test\/distinct\.test) /m.test(s));
assert.equal(chunks.length,2);
const selected=chunks.join('').replace(/\n-- \n[^]*$/,'\n');
const base='/work/sqlite3-3.40.1';
if (readFileSync(base+'/debian/changelog','utf8').startsWith('sqlite3 (3.40.1-2+deb12u2+utilibre1)')) {
  assert(readFileSync(base+'/debian/patches/CVE-2025-7458.patch','utf8').endsWith(selected));
  process.exit(0);
}
writeFileSync(base+'/debian/patches/CVE-2025-7458.patch',
  `Description: Bound ORDER BY satisfaction to actual ordering terms\nOrigin: upstream, https://github.com/sqlite/sqlite/commit/${commit}\nBug-Debian: https://security-tracker.debian.org/tracker/CVE-2025-7458\nApplied-Upstream: 3.41.2\nLast-Update: 2026-10-11\n\n`+selected);
const series=readFileSync(base+'/debian/patches/series','utf8');
assert(!series.includes('CVE-2025-7458'));
writeFileSync(base+'/debian/patches/series',series.trimEnd()+'\nCVE-2025-7458.patch\n');
const changelog=readFileSync(base+'/debian/changelog','utf8');
assert(changelog.startsWith('sqlite3 (3.40.1-2+deb12u2)'));
writeFileSync(base+'/debian/changelog',`sqlite3 (3.40.1-2+deb12u2+utilibre1) bookworm; urgency=high\n\n  * Apply upstream 12ad822 four-line SELECT DISTINCT/ORDER BY fix and\n    its five regression tests (CVE-2025-7458). Preserve Debian build flags.\n\n -- Utilibre local security rebuild <admin@utilibre.org>  Sun, 11 Oct 2026 23:00:00 +0000\n\n`+changelog);
