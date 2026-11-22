// Exact review of RSSHub's 2021 removed-route advisory against the live image.
// The local Git object store is a one-time, blobless fetch of the pinned
// upstream revision. This script makes no network requests or service changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';

process.umask(0o077);
assert.equal(process.argv.length, 2);
const root = '/var/lib/utilibre-maintenance';
const history = root + '/security-20261122/rsshub-history.git';
const image = 'sha256:40640ef9c19d94017d20b38dc7ef33a08101394d9053a1fbeb0c617badef8846';
const container = 'utilibre-services-rsshub-1';
const revision = 'a7d400051d8dc73c0a0a60197920df9d3f80b75c';
const fixed = '7f1c43094e8a82e4d8f036ff7d42568fed00699d';
const removed = [
  'lib/routes/frontend/index.js', 'lib/routes/gouhuo/cache.js',
  'lib/routes/gouhuo/index.js', 'lib/routes/gouhuo/strategy.js',
  'lib/routes/heibaizhibo/room.js', 'lib/routes/netease/news/data.js',
  'lib/routes/tencent/lemon/index.js',
];
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const run = (cmd, args) => execFileSync(cmd, args, {encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 ** 2}).trim();
const git = (...args) => run('git', ['-C', history, ...args]);
const docker = (...args) => run('docker', ['exec', container, ...args]);
const scan = read(root + '/security.json'), queue = read(root + '/security-queue.json');
freshScan(queue, scan);
assert.equal(scan.status, 'checked');
const matches = queue.items.filter(i => i.status === 'needs-review' && i.id === 'CVE-2021-21278' && i.package === 'rsshub');
assert.equal(matches.length, 1);
const item = matches[0];
assert.equal(item.artifact, image);
assert.equal(item.scope, 'runtime-image');
assert.equal(item.installed, '1.0.0');
assert.deepEqual(item.containers, [container]);
assert.equal(run('docker', ['inspect', '--format', '{{.Image}}', container]), image);
assert.equal(run('docker', ['inspect', '--format', '{{index .Config.Labels "org.opencontainers.image.revision"}}', container]), revision);
assert.equal(docker('git', '-C', '/app', 'rev-parse', 'HEAD'), revision);
assert.equal(git('cat-file', '-t', fixed), 'commit');
assert.equal(git('cat-file', '-t', revision), 'commit');
git('merge-base', '--is-ancestor', fixed, revision);
assert.match(git('show', '-s', '--format=%s', fixed), /remove some routes for security reasons/);
for (const path of removed) assert.equal(git('ls-tree', '-r', '--name-only', revision, '--', path), '', 'Removed route reintroduced: ' + path);
const compiled = docker('node', '-e', `const f=require('fs'),d='/app/dist',a=f.readdirSync(d).filter(x=>x.endsWith('.mjs'));for(const p of ['/gouhuo/','/heibaizhibo/','/tencent/lemon/','/netease/news/'])if(a.some(n=>f.readFileSync(d+'/'+n,'utf8').includes(p)))throw Error('Removed route in compiled output: '+p);console.log(a.length)`);
assert(Number(compiled) > 100);
assert.equal(run('docker', ['inspect', '--format', '{{.Image}}', container]), image);
assert.equal(read(root + '/security.json').completedAt, scan.completedAt);
const decision = validateDecision({key: item.key, status: 'mitigated', expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), reason: `RSSHub's own GHSA-pgjj-866w-fc5c fixes this route-injection issue at commit ${fixed}. The exact live image ${image} labels source revision ${revision}, matching its embedded Git HEAD; the official upstream commit graph proves the fix is an ancestor. All seven route files removed by the fix remain absent from that revision, and the four affected path families are absent from the live compiled bundles. The package's 1.0.0 version label is not a source revision. This review does not cover unrelated routes or advisories; raw finding retained. Evidence: security-20261122/rsshub-2021-review.json and local pinned Git history. https://github.com/DIYgod/RSSHub/security/advisories/GHSA-pgjj-866w-fc5c`});
const output = root + '/security-20261122/rsshub-2021-review.json';
const evidence = {schemaVersion: 1, scanDate: scan.completedAt, image, revision, fixed, revisionTree: git('rev-parse', revision + '^{tree}'), removed, compiledModules: Number(compiled), decisions: [decision]};
fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n', {mode: 0o600});
console.log(JSON.stringify({prepared: 1, output, productionChanged: false}));
