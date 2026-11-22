// Exact four-advisory review of the installed, upstream-fixed Git LFS 3.8.1.
// Scanner source-package metadata still matches; retain every raw finding.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';

process.umask(0o077);
assert.equal(process.argv.length, 2);
const root = '/var/lib/utilibre-maintenance';
const here = fileURLToPath(new URL('.', import.meta.url));
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scan = read(root + '/security.json'), queue = read(root + '/security-queue.json');
freshScan(queue, scan);
assert.equal(scan.status, 'checked');
const release = root + '/security-20261122/git-lfs/release.json';
const r = read(release);
assert.equal(r.status, 'passed');
assert(Date.parse(r.completedAt) < Date.parse(scan.completedAt));
assert.equal(r.nextVersion, '3.8.1');
assert.equal(r.recipeSha256, sha(here + 'release-git-lfs-host.mjs'));
assert.equal(r.testSha256, sha(here + 'test-git-lfs-offline.sh'));
assert.equal(r.hashes.next, sha(root + '/security-20261122/git-lfs/git-lfs_3.8.1_amd64.deb'));
assert.equal(execFileSync('node', [here + 'release-git-lfs-host.mjs', 'verify'], {encoding: 'utf8', timeout: 30000}).trim(),
  JSON.stringify({status: 'passed', version: '3.8.1', noServiceRestart: true}));
const ids = ['CVE-2026-105802', 'CVE-2026-105803', 'CVE-2026-69260', 'CVE-2026-69261'];
const matches = queue.items.filter(i => i.status === 'needs-review' && i.package === 'git-lfs' && ids.includes(i.id));
assert.equal(matches.length, 4);
assert.deepEqual(matches.map(i => i.id).sort(), ids.sort());
for (const item of matches) {
  assert.equal(item.scope, 'host-os');
  assert.equal(item.artifact, 'host-dpkg');
  assert.equal(item.installed, '3.8.1');
}
const decisions = matches.map(i => validateDecision({
  key: i.key,
  status: 'mitigated',
  expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  reason: `Git LFS v3.8.1 is the upstream 22 October security release for ${i.id}. Its official Debian 13 package was authenticated through the pinned signed PackageCloud InRelease and SHA256 package chain, then installed through the one-package release gate. Exact installed files, Git system settings and local pointer/checkout/fsck behavior passed after installation; the completed release receipt and package bytes are rechecked. The scanner still emits this CVE against installed 3.8.1; this seven-day decision covers only the exact host package and advisory, not other packages or findings. Raw match retained. Evidence: security-20261122/git-lfs/release.json. https://github.com/git-lfs/git-lfs/releases/tag/v3.8.1`,
}));
const output = root + '/security-20261122/git-lfs/host-reviewed-batch.json';
fs.writeFileSync(output, JSON.stringify({schemaVersion: 1, scanDate: scan.completedAt,
  releaseSha256: sha(release), packageSha256: r.hashes.next, decisions}, null, 2) + '\n', {mode: 0o600});
console.log(JSON.stringify({prepared: decisions.length, output, productionChanged: false}));
