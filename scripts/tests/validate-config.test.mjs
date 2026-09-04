import assert from 'node:assert/strict';
import test from 'node:test';

import { validateEnvironmentValues } from '../validate-config.mjs';

const bindIp = '10.23.0.2';
const edgeIp = '10.23.0.1';

function launchValues(overrides = {}) {
  return {
    PROJECT_NAME: 'Utilibre',
    PRIVATE_PREVIEW: '0',
    PORTAL_PRIVATE_PREVIEW: '0',
    PRIVATE_BIND_IP: bindIp,
    EDGE_PROXY_IP: edgeIp,
    SEARXNG_SECRET: 'ab'.repeat(32),
    COMPOSE_PROFILES: 'privacy-frontends',
    ENABLED_SERVICES: 'searxng,redlib,freshrss,privatebin',
    DEFAULT_LANGUAGE: 'en',
    PUBLIC_PORTAL_HOST: 'utilibre.org',
    PUBLIC_SEARCH_HOST: 'search.utilibre.org',
    PUBLIC_REDDIT_HOST: 'reddit.utilibre.org',
    PUBLIC_RSS_HOST: 'rss.utilibre.org',
    PUBLIC_PASTE_HOST: 'paste.utilibre.org',
    PUBLIC_PORTAL_ORIGIN: 'https://utilibre.org',
    PUBLIC_SEARCH_URL: 'https://search.utilibre.org/',
    PUBLIC_REDDIT_URL: 'https://reddit.utilibre.org/',
    PUBLIC_RSS_URL: 'https://rss.utilibre.org/',
    PUBLIC_PASTE_URL: 'https://paste.utilibre.org/',
    ANUBIS_PUBLIC_HOST: 'reddit.utilibre.org',
    SOURCE_CODE_URL: 'https://github.com/mycelibre/utilibre',
    SUPPORT_URL: '',
    CONTACT_URL: 'https://github.com/mycelibre/utilibre/issues',
    PORTAL_PORT: '8080',
    SEARXNG_PORT: '8888',
    REDLIB_PORT: '3002',
    FRESHRSS_PORT: '3106',
    PRIVATEBIN_PORT: '3108',
    VALKEY_MEMORY_LIMIT: '128M',
    VALKEY_MAXMEMORY: '96mb',
    ...overrides,
  };
}

function previewValues(overrides = {}) {
  return launchValues({
    PRIVATE_PREVIEW: '1',
    PORTAL_PRIVATE_PREVIEW: '1',
    EDGE_PROXY_IP: '',
    PORTAL_EDGE_PROXY_IP: '',
    PUBLIC_PORTAL_HOST: bindIp,
    PUBLIC_SEARCH_HOST: bindIp,
    PUBLIC_REDDIT_HOST: bindIp,
    PUBLIC_RSS_HOST: bindIp,
    PUBLIC_PASTE_HOST: bindIp,
    PUBLIC_PORTAL_ORIGIN: `http://${bindIp}:8080`,
    PUBLIC_SEARCH_URL: `http://${bindIp}:8888/`,
    PUBLIC_REDDIT_URL: `http://${bindIp}:3002/`,
    PUBLIC_RSS_URL: `http://${bindIp}:3106/`,
    PUBLIC_PASTE_URL: `http://${bindIp}:3108/`,
    ANUBIS_PUBLIC_HOST: bindIp,
    ANUBIS_COOKIE_SECURE: 'false',
    ANUBIS_COOKIE_PARTITIONED: 'false',
    SOURCE_CODE_URL: '',
    CONTACT_URL: '',
    ...overrides,
  });
}

function validateLaunch(values, assignedAddresses = new Set([bindIp])) {
  return validateEnvironmentValues(values, { launch: true, assignedAddresses });
}

test('accepts the retained four-service launch set', () => {
  assert.equal(validateLaunch(launchValues()).ENABLED_SERVICES, 'searxng,redlib,freshrss,privatebin');
});

test('accepts an assigned direct private preview', () => {
  const result = validateEnvironmentValues(previewValues(), { assignedAddresses: new Set([bindIp]) });
  assert.equal(result.PUBLIC_PORTAL_ORIGIN, `http://${bindIp}:8080`);
});

test('accepts public service links while the portal remains a private preview', () => {
  const result = validateEnvironmentValues(previewValues({
    PUBLIC_SEARCH_URL: 'https://search.utilibre.org/',
    PUBLIC_REDDIT_URL: 'https://reddit.utilibre.org/',
    PUBLIC_RSS_URL: 'https://rss.utilibre.org/',
    PUBLIC_PASTE_URL: 'https://paste.utilibre.org/',
    ANUBIS_PUBLIC_HOST: 'reddit.utilibre.org',
  }), { assignedAddresses: new Set([bindIp]) });
  assert.equal(result.PUBLIC_SEARCH_URL, 'https://search.utilibre.org/');
});

test('accepts an assigned ULA bind address', () => {
  const ula = 'fd00::23';
  assert.equal(validateLaunch(launchValues({ PRIVATE_BIND_IP: ula, EDGE_PROXY_IP: 'fd00::22' }), new Set([ula])).PRIVATE_BIND_IP, ula);
});

test('rejects a retired service ID and its stale setting', () => {
  assert.throws(
    () => validateLaunch(launchValues({ ENABLED_SERVICES: 'searxng,cobalt', COBALT_PUBLIC_API_URL: 'https://media.utilibre.org/' })),
    (error) => {
      assert.match(error.message, /unsupported or retired ID: cobalt/);
      assert.match(error.message, /COBALT_PUBLIC_API_URL belongs to a retired service/);
      return true;
    },
  );
});

test('rejects public configuration for a disabled retained service', () => {
  assert.throws(
    () => validateLaunch(launchValues({
      ENABLED_SERVICES: 'searxng,redlib,freshrss',
    })),
    /PUBLIC_PASTE_URL and PUBLIC_PASTE_HOST must stay empty while privatebin is disabled/,
  );
});

test('rejects Redlib profile mismatches', () => {
  assert.throws(
    () => validateLaunch(launchValues({ COMPOSE_PROFILES: '' })),
    /Redlib requires both ENABLED_SERVICES=.*redlib/,
  );
});

test('rejects Redlib host-port collisions', () => {
  assert.throws(
    () => validateLaunch(launchValues({ REDLIB_PORT: '8888' })),
    /REDLIB_PORT conflicts with SEARXNG_PORT/,
  );
});

test('rejects launch without SearXNG', () => {
  assert.throws(
    () => validateLaunch(launchValues({
      ENABLED_SERVICES: 'redlib,freshrss,privatebin',
      PUBLIC_SEARCH_HOST: '',
      PUBLIC_SEARCH_URL: '',
    })),
    /ENABLED_SERVICES must include searxng/,
  );
});

test('rejects an Anubis hostname different from the Redlib URL', () => {
  assert.throws(
    () => validateLaunch(launchValues({ ANUBIS_PUBLIC_HOST: 'wrong.utilibre.org' })),
    /ANUBIS_PUBLIC_HOST must be the exact hostname/,
  );
});

test('rejects insecure Anubis cookies at public launch', () => {
  assert.throws(
    () => validateLaunch(launchValues({ ANUBIS_COOKIE_SECURE: 'false', ANUBIS_COOKIE_PARTITIONED: 'false' })),
    /ANUBIS_COOKIE_SECURE must be true for public launch/,
  );
});

test('rejects private preview at the public launch gate', () => {
  assert.throws(() => validateLaunch(previewValues()), /PRIVATE_PREVIEW must be 0 for public launch/);
});

test('rejects a private preview URL on another host or port', () => {
  assert.throws(
    () => validateEnvironmentValues(previewValues({ PUBLIC_SEARCH_URL: 'http://10.23.0.9:9999/' }), { assignedAddresses: new Set([bindIp]) }),
    /PUBLIC_SEARCH_URL must use direct HTTP on PRIVATE_BIND_IP/,
  );
});

for (const supportUrl of [
  'http://donate.utilibre.org/',
  'https://donate/',
  'https://donate.local/',
  'https://user:password@donate.utilibre.org/',
]) {
  test(`rejects unsafe optional support URL ${supportUrl}`, () => {
    assert.throws(
      () => validateLaunch(launchValues({ SUPPORT_URL: supportUrl })),
      /SUPPORT_URL must be a configured public HTTPS URL/,
    );
  });
}
