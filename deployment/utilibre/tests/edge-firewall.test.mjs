import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const deploymentRoot = fileURLToPath(new URL('../', import.meta.url));
const helperPath = `${deploymentRoot}scripts/utilibre-edge-firewall`;
const unitPath = `${deploymentRoot}systemd/utilibre-edge-firewall.service`;
const helper = readFileSync(helperPath, 'utf8');
const unit = readFileSync(unitPath, 'utf8');

const fakeIptablesSource = `#!/usr/bin/env node
const { readFileSync, writeFileSync } = require('node:fs');

const statePath = process.env.FAKE_IPTABLES_STATE;
const state = JSON.parse(readFileSync(statePath, 'utf8'));
let args = process.argv.slice(2);
if (args[0] === '-w') args = args.slice(2);

const save = () => writeFileSync(statePath, JSON.stringify(state));
const fail = () => process.exit(1);
const chain = (name) => state.chains[name];
const after = (items, token) => items[items.indexOf(token) + 1];
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const references = (target) => Object.values(state.chains).flat()
  .filter((rule) => after(rule, '-j') === target).length;

if (args[0] === '-n' && args.includes('-L')) {
  const name = after(args, '-L');
  if (!chain(name)) fail();
  if (args.includes('--line-numbers')) {
    console.log('Chain ' + name + ' (1 references)');
    console.log('num target prot opt source destination');
    chain(name).forEach((rule, index) => {
      const target = after(rule, '-j') || 'RETURN';
      const comment = after(rule, '--comment');
      const suffix = comment ? ' /* ' + comment + ' */' : '';
      console.log((index + 1) + ' ' + target + ' tcp -- 0.0.0.0/0 0.0.0.0/0' + suffix);
    });
  }
  process.exit(0);
}

if (args[0] === '-S') {
  const names = args[1] ? [args[1]] : Object.keys(state.chains);
  if (args[1] && !chain(args[1])) fail();
  for (const name of names) {
    console.log('-N ' + name);
    for (const rule of chain(name)) console.log('-A ' + name + ' ' + rule.join(' '));
  }
  process.exit(0);
}

const mutate = () => { state.mutations = (state.mutations || 0) + 1; save(); };

if (args[0] === '-N') {
  if (chain(args[1])) fail();
  state.chains[args[1]] = [];
  mutate();
  process.exit(0);
}
if (args[0] === '-F') {
  if (!chain(args[1])) fail();
  state.chains[args[1]] = [];
  mutate();
  process.exit(0);
}
if (args[0] === '-X') {
  if (!chain(args[1]) || chain(args[1]).length || references(args[1])) fail();
  delete state.chains[args[1]];
  mutate();
  process.exit(0);
}
if (args[0] === '-A') {
  if (!chain(args[1])) fail();
  chain(args[1]).push(args.slice(2));
  mutate();
  process.exit(0);
}
if (args[0] === '-I') {
  if (!chain(args[1]) || args[2] !== '1') fail();
  if (process.env.FAKE_IPTABLES_FAIL_INSERT === '1') fail();
  chain(args[1]).unshift(args.slice(3));
  mutate();
  process.exit(0);
}
if (args[0] === '-D') {
  if (!chain(args[1])) fail();
  const index = Number(args[2]) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= chain(args[1]).length) fail();
  chain(args[1]).splice(index, 1);
  mutate();
  process.exit(0);
}
if (args[0] === '-C') {
  if (!chain(args[1])) fail();
  process.exit(chain(args[1]).some((rule) => same(rule, args.slice(2))) ? 0 : 1);
}
process.exit(2);
`;

const fakeIpSource = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.join(' ') === '-o -4 addr show') {
  console.log('2: eth-test inet 192.168.240.43/24 brd 192.168.240.255 scope global eth-test');
  process.exit(0);
}
if (args[0] === '-4' && args[1] === 'route' && args[2] === 'get') {
  const fromIndex = args.indexOf('from');
  console.log(args[3] + ' from ' + args[fromIndex + 1] + ' dev eth-test');
  process.exit(0);
}
process.exit(2);
`;

function writeSettings(path, overrides = {}) {
  const values = {
    PRIVATE_BIND_IP: '192.168.240.43',
    EDGE_PROXY_IP: '192.168.240.3',
    PORTAL_PORT: '4173',
    SEARXNG_PORT: '8888',
    REDLIB_PORT: '3002',
    FRESHRSS_PORT: '3106',
    PRIVATEBIN_PORT: '3108',
    ...overrides,
  };
  writeFileSync(path, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
  chmodSync(path, 0o600);
}

function createHarness(t) {
  const directory = mkdtempSync(join(tmpdir(), 'utilibre-edge-firewall-'));
  const fakeIptablesPath = join(directory, 'iptables');
  const fakeIpPath = join(directory, 'ip');
  const testHelperPath = join(directory, 'utilibre-edge-firewall');
  const envPath = join(directory, '.env');
  const statePath = join(directory, 'state.json');
  const unrelatedRule = ['-p', 'udp', '-m', 'comment', '--comment', 'unrelated-rule', '-j', 'ACCEPT'];

  t.after(() => rmSync(directory, { force: true, recursive: true }));
  writeFileSync(fakeIptablesPath, fakeIptablesSource);
  writeFileSync(fakeIpPath, fakeIpSource);
  chmodSync(fakeIptablesPath, 0o755);
  chmodSync(fakeIpPath, 0o755);
  writeSettings(envPath);
  writeFileSync(statePath, JSON.stringify({
    chains: { 'DOCKER-USER': [unrelatedRule], 'THIRD-PARTY': [] },
    mutations: 0,
  }));

  const rootCheck = '[ "$(/usr/bin/id -u)" -eq 0 ] || fail "must run as root"';
  const ownerCheck = '[ "$(/usr/bin/stat -c %u "$env_file")" -eq 0 ] || fail "environment file must be owned by root"';
  const instrumented = helper
    .replace('iptables=/usr/sbin/iptables', `iptables='${fakeIptablesPath}'`)
    .replace('ip_cmd=/usr/sbin/ip', `ip_cmd='${fakeIpPath}'`)
    .replace(rootCheck, ': # root requirement covered by static assertion')
    .replace(ownerCheck, ': # owner requirement covered by static assertion');
  assert.notEqual(instrumented, helper);
  writeFileSync(testHelperPath, instrumented);
  chmodSync(testHelperPath, 0o755);

  const run = (action, extraEnvironment = {}) => spawnSync('sh', [testHelperPath, action], {
    encoding: 'utf8',
    env: {
      ...process.env,
      FAKE_IPTABLES_STATE: statePath,
      UTILIBRE_EDGE_FIREWALL_ENV_FILE: envPath,
      ...extraEnvironment,
    },
  });
  const state = () => JSON.parse(readFileSync(statePath, 'utf8'));

  return { envPath, run, state, unrelatedRule };
}

test('edge firewall helper is executable POSIX shell', () => {
  const syntax = spawnSync('sh', ['-n', helperPath], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  assert.equal(statSync(helperPath).mode & 0o111, 0o111);
});

test('edge firewall is exact, Docker-aware, interface-bound, and fail-closed', () => {
  assert.match(helper, /read_setting PRIVATE_BIND_IP/);
  assert.match(helper, /read_setting EDGE_PROXY_IP/);
  for (const key of ['PORTAL_PORT', 'SEARXNG_PORT', 'REDLIB_PORT', 'FRESHRSS_PORT', 'PRIVATEBIN_PORT']) {
    assert.match(helper, new RegExp(`read_setting ${key}`));
  }
  assert.match(helper, /-L DOCKER-USER/);
  assert.match(helper, /-I DOCKER-USER 1/);
  assert.match(helper, /-i "\$private_interface"/);
  assert.match(helper, /--ctdir ORIGINAL --ctorigdst "\$app_ip" --ctorigdstport "\$port"/);
  assert.match(helper, /-s "\$edge_ip"[\s\\]*\n[\s\\]*-m conntrack[\s\S]*-j RETURN/);
  assert.match(helper, /--ctorigdstport "\$port"[\s\\]*\n[\s\\]*-m comment[\s\S]*-j DROP/);
  assert.doesNotMatch(helper, /-F DOCKER-USER|--flush DOCKER-USER/);
  assert.doesNotMatch(helper, /\bINPUT\b|\bOUTPUT\b/);
  assert.match(helper, /must be owned by root/);
  assert.match(helper, /must have mode 0600 or 0400/);
});

test('validate is non-mutating and apply/status/remove preserve unrelated policy', (t) => {
  const harness = createHarness(t);
  const before = harness.state();

  const validate = harness.run('validate');
  assert.equal(validate.status, 0, validate.stderr);
  assert.deepEqual(harness.state(), before);

  const apply = harness.run('apply');
  assert.equal(apply.status, 0, apply.stderr);
  const installed = harness.state();
  assert.deepEqual(installed.chains['DOCKER-USER'].slice(1), [harness.unrelatedRule]);
  assert.equal(installed.chains['DOCKER-USER'][0].at(-1), 'UTILIBRE-EDGE-A');
  assert.equal(installed.chains['UTILIBRE-EDGE-A'].length, 11);
  assert.ok(installed.chains['UTILIBRE-EDGE-A'].some((rule) =>
    rule.includes('-s') && rule.at(-1) === 'RETURN'));
  assert.ok(installed.chains['UTILIBRE-EDGE-A'].some((rule) => rule.at(-1) === 'DROP'));

  const status = harness.run('status');
  assert.equal(status.status, 0, status.stderr);

  const mutationsBeforeSecondApply = harness.state().mutations;
  const secondApply = harness.run('apply');
  assert.equal(secondApply.status, 0, secondApply.stderr);
  assert.equal(harness.state().mutations, mutationsBeforeSecondApply);

  const remove = harness.run('remove');
  assert.equal(remove.status, 0, remove.stderr);
  assert.deepEqual(harness.state().chains, {
    'DOCKER-USER': [harness.unrelatedRule],
    'THIRD-PARTY': [],
  });
});

test('apply rotates changed settings without an unfiltered transition', (t) => {
  const harness = createHarness(t);
  assert.equal(harness.run('apply').status, 0);
  writeSettings(harness.envPath, { EDGE_PROXY_IP: '192.168.240.4', PORTAL_PORT: '4174' });

  const rotated = harness.run('apply');
  assert.equal(rotated.status, 0, rotated.stderr);
  const state = harness.state();
  assert.equal(state.chains['DOCKER-USER'][0].at(-1), 'UTILIBRE-EDGE-B');
  assert.equal(state.chains['UTILIBRE-EDGE-A'], undefined);
  assert.equal(state.chains['UTILIBRE-EDGE-B'].length, 11);
  assert.deepEqual(state.chains['DOCKER-USER'].slice(1), [harness.unrelatedRule]);
});

test('failed replacement activation leaves the prior policy in force', (t) => {
  const harness = createHarness(t);
  assert.equal(harness.run('apply').status, 0);
  writeSettings(harness.envPath, { EDGE_PROXY_IP: '192.168.240.4', PORTAL_PORT: '4174' });
  const before = harness.state();

  const failed = harness.run('apply', { FAKE_IPTABLES_FAIL_INSERT: '1' });
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /could not activate the staging firewall policy/);
  const after = harness.state();
  assert.deepEqual(after.chains['DOCKER-USER'], before.chains['DOCKER-USER']);
  assert.deepEqual(after.chains['UTILIBRE-EDGE-A'], before.chains['UTILIBRE-EDGE-A']);
  assert.equal(after.chains['UTILIBRE-EDGE-B'], undefined);
});

test('invalid environment fails before any iptables mutation', (t) => {
  const harness = createHarness(t);
  const before = harness.state();
  writeSettings(harness.envPath, { EDGE_PROXY_IP: '203.0.113.4' });

  const result = harness.run('apply');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EDGE_PROXY_IP must be one RFC1918 IPv4 address/);
  assert.deepEqual(harness.state(), before);
});

test('duplicate retained ports fail before any iptables mutation', (t) => {
  const harness = createHarness(t);
  const before = harness.state();
  writeSettings(harness.envPath, { PRIVATEBIN_PORT: '3106' });

  const result = harness.run('apply');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /five retained service ports must be distinct/);
  assert.deepEqual(harness.state(), before);
});

test('systemd persists only the dedicated policy around Docker lifecycle', () => {
  assert.match(unit, /^Requires=docker\.service$/m);
  assert.match(unit, /^After=docker\.service$/m);
  assert.match(unit, /^PartOf=docker\.service$/m);
  assert.match(unit, /^ExecStart=\/usr\/local\/sbin\/utilibre-edge-firewall apply$/m);
  assert.match(unit, /^ExecReload=\/usr\/local\/sbin\/utilibre-edge-firewall apply$/m);
  assert.match(unit, /^ExecStop=\/usr\/local\/sbin\/utilibre-edge-firewall remove$/m);
  assert.match(unit, /^WantedBy=docker\.service$/m);
});
