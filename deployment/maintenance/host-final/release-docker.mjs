// One coordinated host maintenance window; no user content or environments read.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';

process.umask(0o077);
const root = '/home/ubuntu/freetools';
const dir = '/var/lib/utilibre-maintenance/docker-release-20261012';
const receipt = dir + '/release.json';
const versions = {
  'docker-ce': ['5:29.7.2-1~debian.13~trixie', '5:29.9.0-1~debian.13~trixie'],
  'docker-ce-cli': ['5:29.7.2-1~debian.13~trixie', '5:29.9.0-1~debian.13~trixie'],
  'docker-ce-rootless-extras': ['5:29.7.2-1~debian.13~trixie', '5:29.9.0-1~debian.13~trixie'],
  'containerd.io': ['2.3.4-1~debian.13~trixie', '2.4.1-2~debian.13~trixie'],
  'docker-buildx-plugin': ['0.36.1-1~debian.13~trixie', '0.38.0-1~debian.13~trixie'],
  'docker-compose-plugin': ['5.5.0-1~debian.13~trixie', '5.6.0-1~debian.13~trixie'],
};
const daemons = ['docker.service', 'docker.socket', 'containerd.service'];
const supervisors = ['13ft', 'addy-smtp', 'newsletters-smtp', 'trip', 'unfurl', 'wallabag'].map(n => `utilibre-${n}.service`);
const rustpad = 'utilibre-rustpad-rustpad-1';
const candidate = 'utilibre-rustpad:54e4a93-auditable-20261011';
const candidateId = 'sha256:d184dcaf6a85dcb2f75e7e0496588a9ff44ba0335505a132943b46ebce522ada';
const format = '{"id":{{json .Id}},"name":{{json .Name}},"image":{{json .Image}},"running":{{json .State.Running}},"status":{{json .State.Status}},"health":{{if (index .State "Health")}}{{json .State.Health.Status}}{{else}}null{{end}},"restart":{{json .HostConfig.RestartPolicy.Name}},"network":{{json .HostConfig.NetworkMode}}}';
function run(exe, args, options = {}) {
  const r = cp.spawnSync(exe, args, {cwd: root, encoding: 'utf8', timeout: 600000, maxBuffer: 8 * 1024 ** 2, ...options});
  // Output is operational/package data only, not commands returning app secrets.
  if (options.log) fs.writeFileSync(dir + '/' + options.log, (r.stdout || '') + (r.stderr || ''));
  if (r.status !== 0) throw Error(`${exe}: bounded operation failed (${r.status}); private receipt/log retained`);
  return (r.stdout || '').trim();
}
const docker = (...a) => run('docker', a);
const installed = p => run('dpkg-query', ['-W', '-f=${Version}', p]);
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function reserve() { const s = fs.statfsSync('/'); assert(s.bavail * s.bsize >= 8 * 1024 ** 3, '8 GiB free reserve'); }
function containers() { return docker('inspect', '--format', format, ...docker('ps', '-aq').split('\n')).split('\n').map(JSON.parse).map(x => ({...x, name: x.name.slice(1)})); }
function units() { return JSON.parse(run('systemctl', ['list-units', 'utilibre*', '--state=active', '--output=json'])); }
const compose = ['compose', '-f', root + '/deployment/rustpad/compose.yaml'];
function sorted(value) { return Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value; }
function rustConfigHash(canonical = false) { const {image, ...rest} = JSON.parse(docker(...compose, 'config', '--format', 'json')).services.rustpad; return createHash('sha256').update(JSON.stringify(canonical ? sorted(rest) : rest)).digest('hex'); }
const save = r => fs.writeFileSync(receipt, JSON.stringify(r, null, 2) + '\n');
const mode = process.argv[2];
assert(['prepare', 'apply', 'recover', 'verify'].includes(mode));
if (mode === 'prepare') {
  assert(!fs.existsSync(receipt), 'Existing release receipt; inspect rather than overwrite');
  reserve(); fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  for (const [p, [old]] of Object.entries(versions)) assert.equal(installed(p), old);
  for (const unit of daemons) assert(!run('systemctl', ['show', '-p', 'LoadState', '--value', unit]).includes('masked'));
  const r = {status: 'preparing', preparedAt: new Date().toISOString(), versions, containers: containers(), units: units().map(x => ({unit: x.unit, sub: x.sub})), rustConfigHash: rustConfigHash(), rustConfigCanonicalHash: rustConfigHash(true), packages: []};
  assert.equal(r.containers.find(x => x.name === rustpad).running, true);
  assert.equal(docker('image', 'inspect', '-f', '{{.Id}}', candidate), candidateId);
  for (const filename of ['/opt/utilibre/reports/rustpad-auditable-native-v35xaslq/result.json', '/opt/utilibre/reports/rustpad-auditable-inventory-0uw2a_xo/result.json']) {
    const e = JSON.parse(fs.readFileSync(filename));
    assert(e.passed === true || (e.runtimeConfigurationUnchanged && e.rustBinaryPackages === 191));
    assert(Date.now() - Date.parse(e.testedAt) < 86400000);
  }
  save(r);
  for (const [p, pair] of Object.entries(versions)) for (const v of pair) {
    run('apt-get', ['download', `${p}=${v}`], {cwd: dir, log: `${p}-${v.replaceAll(':', '_')}-download.log`});
    const file = fs.readdirSync(dir).find(f => f.endsWith('.deb') && run('dpkg-deb', ['-f', dir + '/' + f, 'Package']) === p && run('dpkg-deb', ['-f', dir + '/' + f, 'Version']) === v);
    assert(file);
    const metadata = run('apt-cache', ['show', `${p}=${v}`]);
    const sha256 = hash(dir + '/' + file);
    assert(metadata.includes('SHA256: ' + sha256), 'Signed APT index artifact mismatch');
    r.packages.push({package: p, version: v, file, sha256}); save(r);
  }
  const args = Object.entries(versions).map(([p, [, v]]) => `${p}=${v}`);
  const simulation = run('apt-get', ['-s', '--only-upgrade', 'install', ...args], {log: 'simulation.log'});
  assert(simulation.includes('6 upgraded, 0 newly installed, 0 to remove'));
  reserve(); r.status = 'prepared'; save(r); console.log('Prepared exact six-package upgrade; old/new signed artifacts retained.');
} else {
  const r = JSON.parse(fs.readFileSync(receipt));
  if (mode === 'apply' || mode === 'recover') {
    assert.equal(r.status, mode === 'apply' ? 'prepared' : 'needs-recovery');
    assert(Date.now() - Date.parse(r.preparedAt) < 3600000);
    assert.equal(process.env.UTILIBRE_SAVED_PAD_MAINTENANCE, 'approved', 'Owner must authorize memory-only pad restart');
    reserve();
    if (mode === 'apply') {
      assert.equal(rustConfigHash(), r.rustConfigHash);
      assert.equal(JSON.parse(docker(...compose, 'config', '--format', 'json')).services.rustpad.image, candidate);
      assert.equal(docker('image', 'inspect', '-f', '{{.Id}}', candidate), candidateId);
    } else {
      assert.equal(run('systemctl', ['show', '-p', 'ActiveState', '--value', 'docker.service']), 'failed');
    }
    for (const p of r.packages) assert.equal(hash(dir + '/' + p.file), p.sha256);
    for (const [p, pair] of Object.entries(versions)) assert(mode === 'apply' ? installed(p) === pair[0] : pair.includes(installed(p)));
    if (mode === 'apply') assert.deepEqual(containers().filter(x => x.running).map(x => x.name).sort(), r.containers.filter(x => x.running).map(x => x.name).sort());
    const timers = r.units.filter(x => x.unit.endsWith('.timer')).map(x => x.unit);
    r.status = 'applying'; r.startedAt ??= new Date().toISOString(); if (mode === 'recover') r.recoveryStartedAt = new Date().toISOString(); save(r);
    run('systemctl', ['stop', ...timers]);
    try {
      if (mode === 'apply') {
        run('systemctl', ['stop', ...supervisors], {log: 'supervisors-stop.log'});
        run('systemctl', ['stop', ...['utilibre-creative.service', 'utilibre-projects.service', 'utilibre-records.service'].filter(n => r.units.some(u => u.unit === n))], {log: 'stacks-stop.log'});
        docker('stop', '--time', '30', rustpad);
      }
      // Keep package maintainer scripts from starting a partially updated stack.
      run('systemctl', ['mask', '--runtime', ...daemons], {log: 'mask.log'});
      // Docker must finish container shutdown while containerd is still alive.
      run('systemctl', ['stop', 'docker.service', 'docker.socket'], {log: 'daemon-stop.log'});
      run('systemctl', ['stop', 'containerd.service'], {log: 'containerd-stop.log'});
      const files = r.packages.filter(p => p.version === versions[p.package][1]).map(p => dir + '/' + p.file);
      // Dependencies were checked by the exact six-package APT simulation.
      // Install signed, hash-verified local artifacts without URI/cache lookup.
      run('dpkg', ['--install', ...files], {env: {...process.env, DEBIAN_FRONTEND: 'noninteractive', NEEDRESTART_MODE: 'l'}, log: 'install.log'});
      for (const [p, [, v]] of Object.entries(versions)) assert.equal(installed(p), v);
      r.packagesInstalledAt = new Date().toISOString(); save(r);
    } catch (e) {
      r.status = 'needs-recovery'; r.failure = e.message; save(r); throw e;
    } finally {
      run('systemctl', ['unmask', '--runtime', ...daemons], {log: 'unmask.log'});
      run('systemctl', ['reset-failed', 'docker.service']);
      run('systemctl', ['start', 'containerd.service', 'docker.service'], {log: 'daemon-start.log'});
      // Restore only services/timers that were active before this release.
      const boundaries = r.units.filter(x => /firewall\.service$/.test(x.unit)).map(x => x.unit);
      run('systemctl', ['start', ...boundaries], {log: 'firewall-start.log'});
      // These active-exited stack units have ExecStop handlers tied to Docker;
      // their explicitly stopped containers must return through the native units.
      const stacks = ['utilibre-creative.service', 'utilibre-projects.service', 'utilibre-records.service'].filter(n => r.units.some(u => u.unit === n));
      if (stacks.length) run('systemctl', ['start', ...stacks], {log: 'stacks-start.log'});
      run('systemctl', ['start', ...supervisors.filter(n => r.units.some(u => u.unit === n))], {log: 'supervisors-start.log'});
      run('systemctl', ['start', ...timers]);
    }
    run('docker', [...compose, 'up', '-d', '--no-build', '--pull', 'never', 'rustpad'], {log: 'rustpad-start.log'});
    r.status = 'awaiting-verification'; r.restoredAt = new Date().toISOString(); save(r);
    console.log('Six host packages installed and prior supervisors restored; Rustpad candidate started.');
  } else {
    const now = containers();
    const expected = r.containers.filter(x => x.running).map(x => x.name).sort();
    assert.deepEqual(now.filter(x => x.running).map(x => x.name).sort(), expected, 'Running/stopped selection changed');
    for (const old of r.containers.filter(x => x.running)) {
      const n = now.find(x => x.name === old.name);
      assert.equal(n.image, old.name === rustpad ? candidateId : old.image, old.name + ' image');
      if (old.health === 'healthy') assert.equal(n.health, 'healthy', old.name + ' health');
    }
    for (const u of r.units) run('systemctl', ['is-active', '--quiet', u.unit]);
    for (const [p, [, v]] of Object.entries(versions)) assert.equal(installed(p), v);
    assert.equal(run('dpkg', ['--audit']), '');
    assert.equal(rustConfigHash(true), r.rustConfigCanonicalHash);
    reserve(); r.status = 'passed'; r.verifiedAt = new Date().toISOString(); r.runningContainers = expected.length;
    r.engine = JSON.parse(docker('version', '--format', '{{json .Server}}')).Version;
    save(r); console.log(JSON.stringify({status: r.status, engine: r.engine, runningContainers: expected.length, stoppedPreserved: now.length - expected.length, verifiedAt: r.verifiedAt}));
  }
}
