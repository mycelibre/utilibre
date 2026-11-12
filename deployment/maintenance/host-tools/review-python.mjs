// Read-only, exact-artifact proposal. This never applies decisions or deploys.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';
import {validateBatch, validateDecision} from '../triage.mjs';
import {proveHostExpat} from '../security-20261103/expat-host-proof.mjs';

process.umask(0o077);
assert.equal(process.argv.length, 2, 'No deploy/apply flags are supported');
const root = '/var/lib/utilibre-maintenance';
const dir = root + '/host-tools-20261112';
const build = dir + '/python/build';
const version = '3.13.18-1~deb13u1+utilibre1';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const sha = path => createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const run = (program, args) => cp.execFileSync(program, args, {
  encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 ** 2,
  env: {PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C.UTF-8'},
  stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
const inputs = read(new URL('./versions.json', import.meta.url)).python;
assert.equal(inputs.version, '3.13.18');
assert.equal(inputs.packageVersion, version);
assert.equal(inputs.vendorPackageVersion, '3.13.18-1');
const archives = {
  'python3.13_3.13.18.orig.tar.xz': 'abb0102e6d4ae027509bcb82327d9dd85515b44a3ba8ad538cfc5e9847029f68',
  'python3.13_3.13.18-1.debian.tar.xz': '8f12d82b3cedd95970133622a48a3c3309a3ce8560e5c026d3438d3aecc8ef8b',
  'python3.13_3.13.18-1.dsc': 'b6ba67e05744b11615fb41390ef13aa1ca3035a5425909bcde46e053f4d77892',
};
for (const [file, digest] of Object.entries(archives)) assert.equal(sha(build + '/' + file), digest);
assert.equal(inputs.upstreamArchiveSha256, archives['python3.13_3.13.18.orig.tar.xz']);
assert.equal(inputs.debianArchiveSha256, archives['python3.13_3.13.18-1.debian.tar.xz']);
assert.equal(inputs.dscSha256, archives['python3.13_3.13.18-1.dsc']);
const packageHashes = {
  'libpython3.13-minimal': '592ca85a9ec73ec792c793348f7238f41eeb397d937f1e96b77b8eb31d441c6f',
  'libpython3.13-stdlib': 'ab1d46573f4761ad9ddbfe01b24f75e76228f20014cb8b3af335f1c443a9dfaf',
  'python3.13-minimal': '7e39ade8fdeecc98dc80017f8731425527f8dee92b81b1a41c352de3c4a79880',
  'python3.13': '661459afcad1ab1adf34ed899dcf07552fdc277ed28581b056289774af40183b',
  'python3.13-venv': '5db076a9c87388370daf1e164837232d87d746cf75bec21c52f0bef52bd1afed',
};
const advisories = {
  'CVE-2026-15308': {issue: '153030', firstRelease: '3.13.15', commit: '7933f4bf7131aa4140750f9404f5de0aa2969ced'},
  'CVE-2026-19445': {issue: '156293', firstRelease: '3.13.16', commit: 'd8717ed01717a9641686e6e6f83f0ab8af235e2c'},
  'CVE-2026-19553': {issue: '156793', firstRelease: '3.13.16', commit: 'f4e43ba525187282f2011da0e6ffc0d2b08d8062'},
  'CVE-2026-7210': {issue: '149018', firstRelease: '3.13.14', commit: 'fc9b11ff49cbc82e6f917d07a61517a2b5f3145f'},
  'CVE-2026-82049': {issue: '157190', firstRelease: '3.13.16', commit: 'b8f23e307097552eaea2604383a12ab280520d0d'},
};
const queue = read(root + '/security-queue.json');
const scan = read(root + '/security.json');
freshScan(queue, scan);
assert.equal(scan.status, 'checked');
const release = read(dir + '/python-release.json');
assert.equal(release.status, 'passed');
assert.equal(release.version, version);
assert(Date.parse(release.completedAt) <= Date.parse(scan.date));
assert.equal(sha(new URL('./check-python.py', import.meta.url)), release.checkerSha256);
assert.equal(sha('/etc/python3.13/sitecustomize.py'), release.configurationSha256);
assert.equal(release.native.version, '3.13.18');
assert.equal(release.native.networkRequests, 0);
for (const key of ['passed', 'sqliteUnicode', 'tarRoundTrip', 'venv', 'temporaryDirectoryCleanup', 'nativeAptDbusCrypto', 'tlsVerificationDefault']) assert.equal(release.native[key], true);
assert.deepEqual(release.upstreamCompatibility, {cases: 2630, skips: 59, files: 5});
assert.equal(sha(build + '/compatibility-tests.log'), 'fb5b65c6fde1c78db36b9bc21c7697d9b1ac15a6e98ec59625bb4ec2cf1729d0');
assert.equal(sha(build + '/vendor-runner.log'), '4c69350249c71d36a0dbd0afa56c54d36ae377293827b1fcaecc282317b03ded');
const tests = fs.readFileSync(build + '/compatibility-tests.log', 'utf8');
assert(tests.includes('Result: SUCCESS') && tests.includes('run=2,630 skipped=59'));
assert(fs.readFileSync(build + '/vendor-runner.log', 'utf8').includes('NATIVE_PYTHON_VENDOR_BUILD_AND_COMPATIBILITY_PASSED'));
const manifestPath = dir + '/python-installed-files.json';
assert.equal(release.installedFilesVerified, 690);
assert.equal(release.installedFilesManifestSha256, '36428b67708dbdedde6e7c90f610b5ea5c8547910b2b8fa677f3417cd826b4c6');
assert.equal(sha(manifestPath), release.installedFilesManifestSha256);
const manifest = read(manifestPath);
assert.equal(Object.keys(manifest).length, 690);
for (const [file, digest] of Object.entries(manifest)) assert.equal(sha(file), digest, 'Installed payload changed: ' + file);
for (const [name, digest] of Object.entries(packageHashes)) {
  const file = build + '/' + name + '_' + version + '_amd64.deb';
  assert.equal(sha(file), digest);
  assert.equal(release.packages[file], digest);
  assert.equal(run('dpkg-query', ['-W', '-f=${Version}', name]), version);
}
// Read archive members only: no extraction, source execution, network, or test payloads.
const source = JSON.parse(run('/usr/bin/python3', ['-I', '-B', '-c', String.raw`
import tarfile, hashlib, json, pathlib, re, sys
root=pathlib.Path(sys.argv[1])
def members(name):
 with tarfile.open(root/name) as archive:
  return {m.name.removeprefix('./'):archive.extractfile(m).read() for m in archive if m.isfile()}
vendor=members('python3.13_3.13.18-1.debian.tar.xz')
rebuilt=members('python3.13_3.13.18-1~deb13u1+utilibre1.debian.tar.xz')
changed=sorted(n for n in vendor.keys()|rebuilt.keys() if vendor.get(n)!=rebuilt.get(n))
assert changed==['debian/changelog'], changed
assert rebuilt['debian/changelog'].startswith(b'python3.13 (3.13.18-1~deb13u1+utilibre1) trixie;')
paths=['Misc/NEWS','Lib/html/parser.py','Modules/_ssl.c','Lib/ssl.py','Modules/pyexpat.c','Modules/_elementtree.c','Lib/tarfile.py']
with tarfile.open(root/'python3.13_3.13.18.orig.tar.xz') as archive:
 selected={p:archive.extractfile('Python-3.13.18/'+p).read() for p in paths}
news=selected['Misc/NEWS'].decode()
notes={}
for issue in ['153030','156293','156793','149018','157190']:
 offset=news.index('gh-'+issue)
 sections=list(re.finditer(r"What's New in Python ([0-9.]+) final",news[:offset]))
 assert sections
 notes[issue]=sections[-1].group(1)
series=[line.strip().split()[0] for line in vendor['debian/patches/series'].decode().splitlines() if line.strip() and not line.startswith('#')]
touches=[]
for patch in series:
 text=vendor['debian/patches/'+patch].decode()
 for path in paths[1:]:
  if re.search(r'^\+\+\+ (?:b/)?'+re.escape(path)+r'(?:\s|$)',text,re.M):
   touches.append({'patch':patch,'path':path})
assert touches==[{'patch':'issue127330.diff','path':'Modules/_ssl.c'}],touches
patch=vendor['debian/patches/issue127330.diff']
assert hashlib.sha256(patch).hexdigest()=='621cd8ecda18bea521510d8ef6cc43022f7f91230ce8a24ff0e066165a7447ae'
print(json.dumps({'hashes':{p:hashlib.sha256(b).hexdigest() for p,b in selected.items()},'newsReleaseByIssue':notes,'packagingChangedFiles':changed,'vendorPatchesTouchingReviewedFiles':touches,'vendorPatchSha256':hashlib.sha256(patch).hexdigest()}))
`, build]));
assert.deepEqual(source.hashes, {
  'Misc/NEWS': '2ad3f3903b70224be6525bbe342b28bfd04e6234855b89183f23fef8f764e14a',
  'Lib/html/parser.py': '4274e9112adf3fa57c7f9afa7c9b5c631456b18b7403cc627cc5027d02cdd2ae',
  'Modules/_ssl.c': 'dcbd9f17bd264423699decd0349dc4bb497afbc1f034518dc318c77e2c836e57',
  'Lib/ssl.py': '3ea103be59b47ad58cb53b249e5b74d00c87b54b20650e208e3b4b9ca533e9e8',
  'Modules/pyexpat.c': 'adcc05629d50be884bf77dc0ceaf640f08df10354a5959d8cd264719b1da2b09',
  'Modules/_elementtree.c': '5a842145c8dce16a29b7bda51ee7660b40deec90c82c0b017e341374f0a75562',
  'Lib/tarfile.py': '9fa4b7849a0c2ed4ff4d73b9f3213e2d051a0ffd347c1ad28556933b87e767a9',
});
for (const evidence of Object.values(advisories)) assert.equal(source.newsReleaseByIssue[evidence.issue], evidence.firstRelease);
const sourceIndex = fs.readFileSync(build + '/vendor-source-index.txt', 'utf8').split(/\n\n/).find(p => /^Version: 3\.13\.18-1$/m.test(p));
assert(sourceIndex, 'Retained exact Debian Sources stanza is missing');
for (const [file, digest] of Object.entries(archives)) assert(sourceIndex.includes(digest) && sourceIndex.includes(file));
const expat = proveHostExpat(scan);
assert.equal(release.native.expat, 'expat_2.10.0');
const oldInterpreters = [];
for (const pid of fs.readdirSync('/proc').filter(p => /^\d+$/.test(p))) {
  try {
    if (/docker|containerd/.test(fs.readFileSync('/proc/' + pid + '/cgroup', 'utf8'))) continue;
    if (/python3\.13.*deleted/.test(fs.readlinkSync('/proc/' + pid + '/exe'))) oldInterpreters.push(pid);
  } catch (error) { if (!['ENOENT', 'ESRCH', 'EINVAL'].includes(error.code)) throw error; }
}
const rows = queue.items.filter(i => i.scope === 'host-os' && i.artifact === 'host-dpkg' && i.type === 'debian' &&
  i.installed === version && Object.hasOwn(packageHashes, i.package) && Object.hasOwn(advisories, i.id));
assert.equal(rows.length, 25, 'Expected five exact advisories across five installed packages');
const now = Date.now();
const decisions = rows.map(item => validateDecision({
  key: item.key, status: 'mitigated', expiresAt: new Date(now + 7 * 86400000).toISOString(),
  reason: `Exact host-only Python 3.13.18 native rebuild, source/package SHA256s and all 690 installed files revalidated. Retained upstream NEWS includes gh-${advisories[item.id].issue} in ${advisories[item.id].firstRelease}; Debian tracker marks source 3.13.18-1 fixed for this advisory. Rebuilt packaging differs only in changelog; reviewed native SSL error-table patch does not change callback/hostname logic. CVE-2026-7210 additionally requires Expat: exact installed 2.10.0 payload and resident mappings verified. Existing ordinary compatibility evidence: 2630 cases/59 skips and native host consumers. No exploit or vulnerability reproduction used. Source/vendor evidence, not a claim of exhaustive behavioral security verification. https://security-tracker.debian.org/tracker/${item.id} . Evidence: host-tools-20261112/python-review.json. Other versions, containers and findings are excluded.`,
}, now));
const report = {
  schemaVersion: 1, date: new Date(now).toISOString(), scanDate: scan.completedAt,
  status: oldInterpreters.length ? 'blocked-resident-interpreters' : 'prepared',
  applied: false, requiresOperatorReview: true, scope: 'host-os exact five package payloads only',
  decisions: oldInterpreters.length ? [] : decisions,
  blockedDecisionCount: oldInterpreters.length ? decisions.length : 0,
  replacedInterpreterPids: oldInterpreters,
  source: {...source, archives, advisories, retrievedDate: '2026-11-12'},
  releaseSha256: sha(dir + '/python-release.json'), installedFiles: 690,
  installedManifestSha256: sha(manifestPath), packageHashes,
  ordinaryCompatibility: release.upstreamCompatibility,
  expat: {version: expat.spec.packages.trixie.version, releaseSha256: sha(root + '/security-20261103/expat-host/release.json'), residentConsumersVerified: expat.current.length},
  execution: {networkRequests: 0, notifications: 0, serviceChanges: 0, vulnerabilityReproductions: 0, ledgerChanges: 0},
  limitations: [
    'No new adversarial regression or exhaustive interpreter/security test suite was run.',
    'This verifies source inclusion, retained normal compatibility evidence and exact installed payloads; it does not demonstrate byte-reproducible builds.',
    'The retained Debian Sources stanza matches pinned inputs. This adapter does not independently replay historical APT signature validation.',
    'Unrelated Python findings, runtime images and host tool UNKNOWN findings remain outside this proposal.',
  ],
};
if (!oldInterpreters.length) validateBatch(report, queue, now);
assert.equal(read(root + '/security.json').completedAt, scan.completedAt, 'Scan changed during proof');
fs.writeFileSync(dir + '/python-review.json', JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
console.log(JSON.stringify({status: report.status, prepared: report.decisions.length, blocked: report.blockedDecisionCount, applied: false, installedFilesVerified: 690, networkRequests: 0, report: dir + '/python-review.json'}));
if (oldInterpreters.length) process.exitCode = 1;
