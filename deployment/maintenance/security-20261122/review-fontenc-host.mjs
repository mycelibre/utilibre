// Exact host source backport review after a fresh fleet assessment.
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
const release = root + '/security-20261122/fontenc/host-release/release.json';
const r = read(release), build = read(root + '/security-20261122/fontenc/package-9a53935cc80bd9a2/package-build.json');
assert.equal(r.status, 'passed');
assert(Date.parse(r.completedAt) <= Date.parse(scan.completedAt));
assert.equal(r.recipeSha256, sha(here + 'release-fontenc-host.mjs'));
assert.equal(r.buildSha256, sha(root + '/security-20261122/fontenc/package-9a53935cc80bd9a2/package-build.json'));
assert.equal(r.nextHash, build.packages.find(p => p.file.startsWith('libfontenc1_'))?.sha256);
assert.equal(r.nextVersion, build.version);
assert(build.passed && build.nativeChecks.join(',') === 'ordinary,boundary' && build.network === 'none');
assert.equal(build.patchSha256, sha(root + '/security-20261122/fontenc/source/fontenc-fix.patch'));
assert.equal(execFileSync('node', [here + 'release-fontenc-host.mjs', 'verify'], {encoding: 'utf8', timeout: 30000}).trim(), JSON.stringify({status: 'passed', version: r.nextVersion, noServiceRestart: true}));
const matches = queue.items.filter(i => i.status === 'needs-review' && i.id === 'CVE-2026-109908' && i.package === 'libfontenc1' && i.scope === 'host-os');
assert(matches.length <= 1);
const decisions = matches.map(i => {
  assert.equal(i.installed, r.nextVersion);
  return validateDecision({key: i.key, status: 'mitigated', expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), reason: `Exact host libfontenc1 ${r.nextVersion} is the authenticated Debian 1.1.8 source with upstream encoding-bounds fix 5920c6ee144fffff84b62f5b479171f734f15316. The original encoding fixture triggers an ASan heap overflow and the patched source passes; ten ordinary checks and the boundary check pass in the networkless build. The signed predecessor archive, source/patch hashes, unchanged ABI exports and dependencies, exact installed files, native unprivileged host API and completed release receipt ${sha(release)} were rechecked after the fleet scan. No host process uses an old mapped library. This covers only CVE-2026-109908 in this host package; the DHI exporter is separate and raw finding retained. Evidence: security-20261122/fontenc/host-release/release.json. https://security-tracker.debian.org/tracker/CVE-2026-109908`});
});
const output = root + '/security-20261122/fontenc/host-reviewed-batch.json';
fs.writeFileSync(output, JSON.stringify({schemaVersion: 1, scanDate: scan.completedAt, decisions, releaseSha256: sha(release)}, null, 2) + '\n', {mode: 0o600});
console.log(JSON.stringify({prepared: decisions.length, output, productionChanged: false}));
