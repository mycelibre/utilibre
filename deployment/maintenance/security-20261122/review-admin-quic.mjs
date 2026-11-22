// Exact runtime-scope review of the private Penpot admin console's QUIC-server
// advisory. The OpenSSL library remains vulnerable; this TCP-only application
// does not create a QUIC server. No network request or deployment change.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';

process.umask(0o077);
assert.equal(process.argv.length, 2);
const root = '/var/lib/utilibre-maintenance';
const container = 'utilibre-expanded-penpot-admin-console-1';
const image = 'sha256:cc71727403f3b186e57b7d167b16e2d2ed6be95141f298a2d99f2419bdf636b6';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const run = (cmd, args) => execFileSync(cmd, args, {encoding: 'utf8', timeout: 30000, maxBuffer: 1024 ** 2}).trim();
const scan = read(root + '/security.json'), queue = read(root + '/security-queue.json');
freshScan(queue, scan);
assert.equal(scan.status, 'checked');
const matches = queue.items.filter(i => i.status === 'needs-review' && i.id === 'CVE-2026-124709' && i.artifact === image);
assert.equal(matches.length, 4);
assert.deepEqual(matches.map(i => i.package).sort(), ['libssl3t64', 'libssl3t64', 'openssl-provider-legacy', 'openssl-provider-legacy']);
for (const item of matches) {
  assert.equal(item.scope, 'runtime-image');
  assert.deepEqual(item.containers, [container]);
  assert(['3.5.7-1~deb13u2+dhi0', '3.5.7-1~deb13u3+dhi0'].includes(item.installed));
}
const inspect = JSON.parse(run('docker', ['inspect', container]));
assert.equal(inspect.length, 1);
const c = inspect[0];
assert.equal(c.Image, image);
assert.equal(c.State.Running, true);
assert.deepEqual(c.Config.Cmd, ['node', 'docker-start-admin-console.mjs']);
assert.deepEqual(Object.keys(c.Config.ExposedPorts || {}), ['3000/tcp']);
assert.deepEqual(c.HostConfig.PortBindings || {}, {});
const runtimeCode = `const f=require('fs'),h=require('crypto');const s=f.readFileSync('/nitrate/docker-start-admin-console.mjs');const q=n=>f.readFileSync('/proc/net/'+n,'utf8').trim().split('\\n').slice(1).map(x=>x.trim().split(/\\s+/)[1]);console.log(JSON.stringify({entrypointSha256:h.createHash('sha256').update(s).digest('hex'),udp:q('udp'),udp6:q('udp6')}))`;
const runtime = JSON.parse(run('docker', ['exec', container, 'node', '-e', runtimeCode]));
assert.equal(runtime.entrypointSha256, 'c4124ffa5177b74efabfe499eea355a91f03e04f3af7254835dfda6c774816f5');
assert.deepEqual(runtime.udp6, []);
assert(runtime.udp.every(x => /^0B00007F:[0-9A-F]{4}$/.test(x)), 'Unexpected UDP listener or connection');
assert(runtime.udp.length <= 1, 'Unexpected extra loopback UDP socket');
assert.equal(run('docker', ['inspect', '--format', '{{.Image}}', container]), image);
assert.equal(read(root + '/security.json').completedAt, scan.completedAt);
const decisions = matches.map(i => validateDecision({
  key: i.key,
  status: 'not-affected',
  expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  reason: `OpenSSL's 17 November advisory says CVE-2026-124709 requires an OpenSSL QUIC server accepting peer streams; it rates the issue Low. This exact private Penpot admin-console image ${image} runs its pinned Node launcher and built HTTP server on TCP 3000 only. Docker exposes no UDP port and the live network namespace has no UDP socket except its loopback DNS stub. A QUIC server is not running, so these four package-label matches are not reachable through this role. The library itself is not declared patched; any image, entrypoint, protocol or network change requires reassessment. Raw findings retained. https://openssl-library.org/news/secadv/20261117.txt`,
}));
const output = root + '/security-20261122/admin-quic-reviewed-batch.json';
fs.writeFileSync(output, JSON.stringify({schemaVersion: 1, scanDate: scan.completedAt, image, container, entrypointSha256: runtime.entrypointSha256, udp: runtime.udp, udp6: runtime.udp6, decisions}, null, 2) + '\n', {mode: 0o600});
console.log(JSON.stringify({prepared: decisions.length, output, productionChanged: false}));
