import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const deploymentRoot = fileURLToPath(new URL('../', import.meta.url));
const compose = readFileSync(`${deploymentRoot}compose.yaml`, 'utf8');
const initSecrets = readFileSync(`${deploymentRoot}scripts/init-secrets.sh`, 'utf8');
const bootstrap = readFileSync(`${deploymentRoot}scripts/bootstrap-freshrss.sh`, 'utf8');
const containerBootstrap = readFileSync(
  `${deploymentRoot}scripts/freshrss-bootstrap-container.sh`,
  'utf8',
);

test('FreshRSS fails closed when the edge proxy address is absent', () => {
  assert.match(compose, /TRUSTED_PROXY: \$\{EDGE_PROXY_IP:\?Set EDGE_PROXY_IP\}/);
  assert.doesNotMatch(compose, /TRUSTED_PROXY: \$\{EDGE_PROXY_IP:-\}/);
});

test('secret initialization keeps the FreshRSS account identifier operator-supplied', () => {
  assert.match(initSecrets, /freshrss_admin_username=\$\{FRESHRSS_ADMIN_USERNAME:-\}/);
  assert.match(initSecrets, /^FRESHRSS_ADMIN_USERNAME=\$freshrss_admin_username$/m);
  assert.doesNotMatch(initSecrets, /FRESHRSS_ADMIN_USERNAME=utilibre-admin/);
});

test('FreshRSS bootstrap keeps credentials out of persistent Compose environment', () => {
  const freshrss = compose.match(/^  freshrss:\n([\s\S]*?)(?=^  [a-z][a-z0-9-]*:|^networks:)/m)?.[1];
  assert.ok(freshrss, 'FreshRSS service is present');
  assert.doesNotMatch(freshrss, /FRESHRSS_(?:ADMIN|API)_PASSWORD/);
  assert.doesNotMatch(freshrss, /FRESHRSS_(?:INSTALL|USER)/);

  assert.match(bootstrap, /printf '%s\\n' "\$database_password"/);
  assert.match(bootstrap, /docker compose run --rm --no-deps -T/);
  assert.match(bootstrap, /--env FRESHRSS_BASE_URL="\$base_url"/);
  assert.match(bootstrap, /freshrss-bootstrap-container\.sh/);
  assert.doesNotMatch(bootstrap, /--env FRESHRSS_(?:ADMIN|API|DB)_/);
});

test('FreshRSS bootstrap is conservative when state already exists', () => {
  assert.match(containerBootstrap, /data\/applied_migrations\.txt/);
  assert.match(containerBootstrap, /installed default user differs/);
  assert.match(containerBootstrap, /operator account already exists; account settings preserved/);
  assert.doesNotMatch(containerBootstrap, /reconfigure\.php|update-user\.php|delete-user\.php/);
});

test('RSSHub is internal-only support infrastructure', () => {
  const rsshub = compose.match(/^  rsshub:\n([\s\S]*?)(?=^  [a-z][a-z0-9-]*:|^networks:)/m)?.[1];
  assert.ok(rsshub, 'RSSHub service is present');
  assert.doesNotMatch(rsshub, /^    ports:/m);
  assert.match(rsshub, /^    networks: \[backend, rsshub-egress\]$/m);
  assert.match(compose, /^  backend:\n(?:.*\n)*?    internal: true$/m);
});

test('Compose contains exactly the reviewed retained service set', () => {
  const serviceBlock = compose.match(/^services:\n([\s\S]*?)^networks:/m)?.[1] ?? '';
  const names = [...serviceBlock.matchAll(/^  ([a-z][a-z0-9-]*):$/gm)].map((match) => match[1]).sort();
  assert.deepEqual(names, ['freshrss', 'postgres', 'privatebin', 'rsshub', 'valkey']);
});
