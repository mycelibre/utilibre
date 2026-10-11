// Scan image software only; no mounted application data or public requests.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, statfsSync} from 'node:fs';
process.umask(0o077);
const dependencyReview = process.argv[2] === '--dependencies';
assert(!process.argv[2] || dependencyReview, 'Use no argument or --dependencies');
const directory = '/var/lib/utilibre-maintenance/gosu-security-20261011' + (dependencyReview ? '/dependencies' : '');
const build = JSON.parse(readFileSync(directory + '/build.json'));
const baseline = JSON.parse(readFileSync('/var/lib/utilibre-maintenance/security.json'));
const report = {date: new Date().toISOString(), status: 'running', deployed: false, rows: []};
for (const image of build.rows) {
  const space = statfsSync(directory);
  assert(space.bavail * space.bsize >= 8 * 1024 ** 3, 'Preserve 8 GiB recovery floor');
  const output = directory + '/' + image.kind + '-' + image.version + '-trivy.json';
  execFileSync('systemd-run', ['--quiet', '--scope', '-p', 'CPUQuota=100%', '-p', 'MemoryMax=2G',
    '/opt/utilibre/maintenance/bin/trivy', 'image', '--disable-telemetry', '--cache-dir', '/var/cache/utilibre-security',
    '--scanners', 'vuln', '--offline-scan', '--skip-db-update', '--skip-java-db-update', '--parallel', '1',
    '--timeout', '3m', '--no-progress', '--list-all-pkgs', '--format', 'json', '--image-src', 'docker', '--output', output, image.candidateId],
    {timeout: 190000, stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, TRIVY_DISABLE_TELEMETRY: 'true', TRIVY_SKIP_VERSION_CHECK: 'true', GOMAXPROCS: '1', GOMEMLIMIT: '512MiB'}});
  const data = JSON.parse(readFileSync(output));
  const helper = data.Results.find(r => r.Target === 'usr/local/bin/gosu');
  assert(helper, 'Gosu inventory must be present');
  assert(helper.Packages.some(p => p.Name === 'stdlib' && p.Version === 'v1.26.9'), 'Exact new Go inventory required');
  assert(!helper.Vulnerabilities?.some(v => v.PkgName === 'stdlib'), 'Go standard-library findings remain');
  if (dependencyReview) assert.equal(helper.Vulnerabilities?.length || 0, 0, 'Dependency advisories remain');
  const all = data.Results.flatMap(r => r.Vulnerabilities || []);
  const counts = values => ({critical: values.filter(v => (v.Severity || v.severity) === 'CRITICAL').length,
    high: values.filter(v => (v.Severity || v.severity) === 'HIGH').length});
  const prior = baseline.images.find(x => x.id === image.baseId);
  report.rows.push({...image, status: 'passed', before: prior ? counts(prior.findings) : null, after: counts(all),
    helperBefore: prior ? counts(prior.findings.filter(f => f.target === 'usr/local/bin/gosu')) : null,
    helperAfter: counts(helper.Vulnerabilities || []),
    helperRemaining: (helper.Vulnerabilities || []).map(v => ({id: v.VulnerabilityID, package: v.PkgName, installed: v.InstalledVersion, fixed: v.FixedVersion, severity: v.Severity}))});
  console.log(image.candidate + ': gosu stdlib findings removed; remaining helper advisories ' + (helper.Vulnerabilities || []).length);
}
report.status = 'passed'; report.completedAt = new Date().toISOString();
writeFileSync(directory + '/scan.json', JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
