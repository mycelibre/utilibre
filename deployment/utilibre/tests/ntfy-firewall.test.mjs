import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const deploymentRoot = fileURLToPath(new URL('../', import.meta.url));
const helperPath = `${deploymentRoot}scripts/utilibre-ntfy-firewall`;
const unitPath = `${deploymentRoot}systemd/utilibre-ntfy-firewall.service`;
const backupPath = `${deploymentRoot}scripts/backup.sh`;
const helper = readFileSync(helperPath, 'utf8');
const unit = readFileSync(unitPath, 'utf8');
const backup = readFileSync(backupPath, 'utf8');

const fakeIptablesSource = `#!/usr/bin/env node
const { appendFileSync, readFileSync, writeFileSync } = require('node:fs');

const args = process.argv.slice(2);
const statePath = process.env.FAKE_IPTABLES_STATE;
const logPath = process.env.FAKE_IPTABLES_LOG;
const rules = JSON.parse(readFileSync(statePath, 'utf8'));
appendFileSync(logPath, JSON.stringify(args) + '\\n');

const argumentAfter = (flag) => args[args.indexOf(flag) + 1];
const save = () => writeFileSync(statePath, JSON.stringify(rules));

if (args.includes('-L')) {
  if (args.includes('--line-numbers')) {
    console.log('Chain DOCKER-USER (1 references)');
    console.log('num target prot opt source destination');
    rules.forEach((rule, index) => {
      console.log(
        \`${'${index + 1}'} DROP tcp -- !${'${rule.edge}'} 0.0.0.0/0 \` +
        \`ctstate ORIGINAL ctorigdst ${'${rule.app}'} ctorigdstport ${'${rule.port}'} \` +
        \`/* ${'${rule.comment}'} */\`,
      );
    });
  }
  process.exit(0);
}

if (args.includes('-D')) {
  const ruleNumber = Number(args[args.indexOf('-D') + 2]);
  if (!Number.isInteger(ruleNumber) || ruleNumber < 1 || ruleNumber > rules.length) {
    process.exit(1);
  }
  rules.splice(ruleNumber - 1, 1);
  save();
  process.exit(0);
}

const requestedRule = {
  app: argumentAfter('--ctorigdst'),
  port: argumentAfter('--ctorigdstport'),
  edge: argumentAfter('-s'),
  comment: argumentAfter('--comment'),
};

if (args.includes('-I')) {
  if (process.env.FAKE_IPTABLES_FAIL_INSERT === '1') {
    process.exit(1);
  }
  rules.unshift(requestedRule);
  save();
  process.exit(0);
}

if (args.includes('-C')) {
  const found = rules.some((rule) =>
    Object.entries(requestedRule).every(([key, value]) => rule[key] === value),
  );
  process.exit(found ? 0 : 1);
}

process.exit(2);
`;

function writeSettings(path, {
  // Deliberately synthetic RFC1918 fixtures; these are not deployment addresses.
  app = '192.168.240.43',
  edge = '192.168.240.3',
  port = '2586',
} = {}) {
  writeFileSync(path, `APP_BIND_IP=${app}\nEDGE_PROXY_IP=${edge}\nNTFY_PORT=${port}\n`);
  chmodSync(path, 0o600);
}

function createFirewallHarness(t, initialRules) {
  const directory = mkdtempSync(join(tmpdir(), 'utilibre-ntfy-firewall-'));
  const fakeIptablesPath = join(directory, 'iptables');
  const testHelperPath = join(directory, 'utilibre-ntfy-firewall');
  const envPath = join(directory, '.env');
  const statePath = join(directory, 'iptables-state.json');
  const logPath = join(directory, 'iptables-log.jsonl');

  t.after(() => rmSync(directory, { force: true, recursive: true }));
  writeFileSync(fakeIptablesPath, fakeIptablesSource);
  chmodSync(fakeIptablesPath, 0o755);
  writeFileSync(statePath, JSON.stringify(initialRules));
  writeFileSync(logPath, '');
  writeSettings(envPath);

  const rootCheck = '[ "$(/usr/bin/id -u)" -eq 0 ] || fail "must run as root"';
  const ownerCheck = '[ "$(/usr/bin/stat -c %u "$env_file")" -eq 0 ] || fail "$env_file must be owned by root"';
  const instrumentedHelper = helper
    .replace('iptables=/usr/sbin/iptables', `iptables='${fakeIptablesPath}'`)
    .replace(rootCheck, ': # root check exercised statically; avoid requiring root in unit tests')
    .replace(ownerCheck, ': # ownership check exercised statically; temporary file belongs to test user');

  assert.notEqual(instrumentedHelper, helper);
  assert.doesNotMatch(instrumentedHelper, /iptables=\/usr\/sbin\/iptables/);
  assert.doesNotMatch(instrumentedHelper, /must run as root/);
  assert.doesNotMatch(instrumentedHelper, /must be owned by root/);
  writeFileSync(testHelperPath, instrumentedHelper);
  chmodSync(testHelperPath, 0o755);

  const run = (action, extraEnvironment = {}) => spawnSync('sh', [testHelperPath, action], {
    encoding: 'utf8',
    env: {
      ...process.env,
      FAKE_IPTABLES_LOG: logPath,
      FAKE_IPTABLES_STATE: statePath,
      UTILIBRE_NTFY_FIREWALL_ENV_FILE: envPath,
      ...extraEnvironment,
    },
  });

  return {
    envPath,
    log: () => readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse),
    rules: () => JSON.parse(readFileSync(statePath, 'utf8')),
    run,
  };
}

test('ntfy firewall helper has valid POSIX shell syntax', () => {
  const result = spawnSync('sh', ['-n', helperPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('ntfy firewall reads exact values without network or port fallbacks', () => {
  assert.match(helper, /read_setting APP_BIND_IP/);
  assert.match(helper, /read_setting EDGE_PROXY_IP/);
  assert.match(helper, /read_setting NTFY_PORT/);
  assert.doesNotMatch(helper, /app_ip=.*:-/);
  assert.doesNotMatch(helper, /edge_ip=.*:-/);
  assert.doesNotMatch(helper, /app_port=.*:-/);
  assert.match(helper, /EDGE_PROXY_IP must occur exactly once and be non-empty/);
  assert.match(helper, /must be owned by root/);
  assert.match(helper, /must have mode 0600 or 0400/);
});

test('ntfy firewall limits the original forwarded connection without an interface restriction', () => {
  assert.match(helper, /chain=DOCKER-USER/);
  assert.match(helper, /--ctdir ORIGINAL/);
  assert.match(helper, /--ctorigdst "\$app_ip" --ctorigdstport "\$app_port"/);
  assert.match(helper, /! -s "\$edge_ip"/);
  assert.match(helper, /--comment "\$rule_comment"/);
  assert.match(helper, /-j DROP/);
  assert.doesNotMatch(helper, /\s-i\s/);
  assert.doesNotMatch(helper, /\bOUTPUT\b/);
});

test('ntfy firewall reconciliation removes every exactly tagged rule by number', () => {
  const cleanup = helper.match(/remove_tagged_rules\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
  const olderCleanup = helper.match(/remove_older_tagged_rules\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
  const apply = helper.match(/apply_rule\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';

  assert.match(helper, /first_tagged_rule_number\(\)/);
  assert.match(helper, /last_tagged_rule_number\(\)/);
  assert.match(helper, /\$\(i \+ 1\) == comment && \$\(i \+ 2\) == "\*\/"/);
  assert.match(cleanup, /-D "\$chain" "\$tagged_rule_number"/);
  assert.doesNotMatch(cleanup, /--ctorigdst|--ctorigdstport|\$edge_ip/);
  assert.match(olderCleanup, /last_tagged_rule_number/);
  assert.match(olderCleanup, /"\$installed_tagged_rules" -gt 1/);
  assert.doesNotMatch(olderCleanup, /--ctorigdst|--ctorigdstport|\$edge_ip/);
  assert.ok(apply.indexOf('-I "$chain" 1') < apply.indexOf('remove_older_tagged_rules'));
});

test('ntfy firewall rotates tagged rules and removes them without the old settings', (t) => {
  const tag = 'utilibre-ntfy-edge-only';
  const nearMatch = 'utilibre-ntfy-edge-only-extra';
  const harness = createFirewallHarness(t, [
    { app: '192.168.240.43', edge: '192.168.240.3', port: '2586', comment: tag },
    { app: '192.168.240.99', edge: '192.168.240.9', port: '9999', comment: tag },
    { app: '192.168.240.88', edge: '192.168.240.8', port: '8888', comment: nearMatch },
    { app: '192.168.240.77', edge: '192.168.240.7', port: '7777', comment: 'unrelated-rule' },
  ]);

  const firstApply = harness.run('apply');
  assert.equal(firstApply.status, 0, firstApply.stderr);
  assert.deepEqual(harness.rules(), [
    { app: '192.168.240.43', edge: '192.168.240.3', port: '2586', comment: tag },
    { app: '192.168.240.88', edge: '192.168.240.8', port: '8888', comment: nearMatch },
    { app: '192.168.240.77', edge: '192.168.240.7', port: '7777', comment: 'unrelated-rule' },
  ]);
  const firstMutations = harness.log()
    .filter((args) => args.includes('-D') || args.includes('-I'))
    .map((args) => args.includes('-D') ? 'delete' : 'insert');
  assert.deepEqual(firstMutations, ['insert', 'delete', 'delete']);

  writeSettings(harness.envPath, {
    app: '192.168.240.44',
    edge: '192.168.240.4',
    port: '2587',
  });
  const rotatedApply = harness.run('apply');
  assert.equal(rotatedApply.status, 0, rotatedApply.stderr);
  assert.deepEqual(harness.rules(), [
    { app: '192.168.240.44', edge: '192.168.240.4', port: '2587', comment: tag },
    { app: '192.168.240.88', edge: '192.168.240.8', port: '8888', comment: nearMatch },
    { app: '192.168.240.77', edge: '192.168.240.7', port: '7777', comment: 'unrelated-rule' },
  ]);

  rmSync(harness.envPath);
  const removeWithoutSettings = harness.run('remove');
  assert.equal(removeWithoutSettings.status, 0, removeWithoutSettings.stderr);
  assert.deepEqual(harness.rules(), [
    { app: '192.168.240.88', edge: '192.168.240.8', port: '8888', comment: nearMatch },
    { app: '192.168.240.77', edge: '192.168.240.7', port: '7777', comment: 'unrelated-rule' },
  ]);
});

test('ntfy firewall rejects invalid replacement settings before changing tagged rules', (t) => {
  const originalRules = [
    {
      app: '192.168.240.43',
      edge: '192.168.240.3',
      port: '2586',
      comment: 'utilibre-ntfy-edge-only',
    },
  ];
  const harness = createFirewallHarness(t, originalRules);
  writeSettings(harness.envPath, { app: '0.0.0.0' });

  const apply = harness.run('apply');
  assert.notEqual(apply.status, 0);
  assert.match(apply.stderr, /APP_BIND_IP must not be 0\.0\.0\.0/);
  assert.deepEqual(harness.rules(), originalRules);
  assert.deepEqual(harness.log(), []);
});

test('ntfy firewall preserves old tagged rules when desired-rule insertion fails', (t) => {
  const originalRules = [
    {
      app: '192.168.240.43',
      edge: '192.168.240.3',
      port: '2586',
      comment: 'utilibre-ntfy-edge-only',
    },
    {
      app: '192.168.240.88',
      edge: '192.168.240.8',
      port: '8888',
      comment: 'unrelated-rule',
    },
  ];
  const harness = createFirewallHarness(t, originalRules);
  writeSettings(harness.envPath, {
    app: '192.168.240.44',
    edge: '192.168.240.4',
    port: '2587',
  });

  const apply = harness.run('apply', { FAKE_IPTABLES_FAIL_INSERT: '1' });
  assert.notEqual(apply.status, 0);
  assert.match(apply.stderr, /could not install the desired utilibre-ntfy-edge-only rule/);
  assert.deepEqual(harness.rules(), originalRules);
  const mutations = harness.log()
    .filter((args) => args.includes('-D') || args.includes('-I'))
    .map((args) => args.includes('-D') ? 'delete' : 'insert');
  assert.deepEqual(mutations, ['insert']);
});

test('systemd reapplies with Docker and removes all exactly tagged rules on stop', () => {
  assert.match(unit, /^Requires=docker\.service$/m);
  assert.match(unit, /^After=docker\.service$/m);
  assert.match(unit, /^PartOf=docker\.service$/m);
  assert.match(unit, /^ExecStart=\/usr\/local\/sbin\/utilibre-ntfy-firewall apply$/m);
  assert.match(unit, /^ExecReload=\/usr\/local\/sbin\/utilibre-ntfy-firewall apply$/m);
  assert.match(unit, /^ExecStop=\/usr\/local\/sbin\/utilibre-ntfy-firewall remove$/m);
  assert.match(unit, /^WantedBy=docker\.service$/m);
});

test('configuration backups retain the firewall sources but not ntfy caches', () => {
  assert.match(backup, /config scripts system systemd edge portal docs secrets/);
  assert.doesNotMatch(backup, /data\/ntfy|ntfy-cache\.db/);
});
