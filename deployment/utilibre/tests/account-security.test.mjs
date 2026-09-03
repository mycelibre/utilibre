import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const deploymentRoot = fileURLToPath(new URL('../', import.meta.url));
const compose = readFileSync(`${deploymentRoot}compose.yaml`, 'utf8');
const healthchecksSettings = readFileSync(
  `${deploymentRoot}config/healthchecks/settings_utilibre.py`,
  'utf8',
);
const initSecrets = readFileSync(`${deploymentRoot}scripts/init-secrets.sh`, 'utf8');

test('account services fail closed when the edge proxy address is absent', () => {
  assert.match(compose, /TRUSTED_PROXY: \$\{EDGE_PROXY_IP:\?Set EDGE_PROXY_IP\}/);
  assert.match(compose, /WAKAPI_TRUST_REVERSE_PROXY_IPS: \$\{EDGE_PROXY_IP:\?Set EDGE_PROXY_IP\}/);
  assert.doesNotMatch(compose, /(?:TRUSTED_PROXY|WAKAPI_TRUST_REVERSE_PROXY_IPS): \$\{EDGE_PROXY_IP:-\}/);
});

test('Healthchecks uses its public URL, closed registration, local logo, and secure cookies', () => {
  assert.match(compose, /SITE_ROOT: https:\/\/monitor\.utilibre\.org/);
  assert.match(compose, /REGISTRATION_OPEN: "False"/);
  assert.match(compose, /SITE_LOGO_URL: \/static\/img\/utilibre-logo-coral\.svg/);
  assert.match(compose, /DJANGO_SETTINGS_MODULE: hc\.settings_utilibre/);
  assert.match(compose, /settings_utilibre\.py:\/opt\/healthchecks\/hc\/settings_utilibre\.py:ro/);
  assert.match(compose, /mx\.mailgt\.dev=\$\{SMTP_RELAY_IP:\?Set SMTP_RELAY_IP\}/);
  assert.doesNotMatch(compose, /mx\.mailgt\.dev=(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/);
  assert.match(healthchecksSettings, /^CSRF_COOKIE_SECURE = True$/m);
  assert.match(healthchecksSettings, /^SESSION_COOKIE_SECURE = True$/m);
});

test('Wakapi keeps public registration closed and HTTPS cookies mandatory', () => {
  assert.match(compose, /WAKAPI_PUBLIC_URL: https:\/\/wakapi\.utilibre\.org/);
  assert.match(compose, /WAKAPI_ALLOW_SIGNUP: \$\{WAKAPI_ALLOW_SIGNUP:-false\}/);
  assert.match(compose, /WAKAPI_OIDC_ALLOW_SIGNUP: "false"/);
  assert.match(compose, /WAKAPI_DISABLE_FRONTPAGE: "true"/);
  assert.match(compose, /WAKAPI_TRUSTED_HEADER_AUTH: "false"/);
  assert.match(compose, /WAKAPI_INSECURE_COOKIES: "false"/);
});

test('secret initialization keeps topology and account identifiers operator-supplied', () => {
  assert.match(initSecrets, /smtp_relay_ip=\$\{SMTP_RELAY_IP:-\}/);
  assert.match(initSecrets, /healthchecks_admin_email=\$\{HEALTHCHECKS_ADMIN_EMAIL:-\}/);
  assert.match(initSecrets, /freshrss_admin_username=\$\{FRESHRSS_ADMIN_USERNAME:-\}/);
  assert.match(initSecrets, /wakapi_admin_username=\$\{WAKAPI_ADMIN_USERNAME:-\}/);
  assert.match(initSecrets, /^SMTP_RELAY_IP=\$smtp_relay_ip$/m);
  assert.match(initSecrets, /^WAKAPI_ALLOW_SIGNUP=false$/m);
  assert.doesNotMatch(initSecrets, /HEALTHCHECKS_ADMIN_EMAIL=owner@/);
  assert.doesNotMatch(initSecrets, /(?:FRESHRSS|WAKAPI)_ADMIN_USERNAME=utilibre-admin/);
});
