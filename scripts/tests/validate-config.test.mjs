import assert from 'node:assert/strict';
import test from 'node:test';

import { validateEnvironmentValues } from '../validate-config.mjs';

const ipv4Bind = '10.23.0.2';
const edgeAddress = '10.23.0.1';

function launchValues(overrides = {}) {
  return {
    PROJECT_NAME: 'Public utility test',
    PRIVATE_BIND_IP: ipv4Bind,
    EDGE_PROXY_IP: edgeAddress,
    SEARXNG_SECRET: 'ab'.repeat(32),
    ENABLED_SERVICES: 'cobalt,searxng',
    DEFAULT_LANGUAGE: 'en',
    PUBLIC_PORTAL_HOST: 'portal.public-utility.tools',
    PUBLIC_MEDIA_HOST: 'media.public-utility.tools',
    PUBLIC_SEARCH_HOST: 'search.public-utility.tools',
    PUBLIC_PORTAL_ORIGIN: 'https://portal.public-utility.tools',
    COBALT_PUBLIC_API_URL: 'https://media.public-utility.tools/',
    PUBLIC_SEARCH_URL: 'https://search.public-utility.tools/',
    PUBLIC_REDDIT_URL: '',
    PUBLIC_YOUTUBE_URL: '',
    PUBLIC_IMGUR_URL: '',
    SOURCE_CODE_URL: 'https://code.public-utility.tools/source',
    SUPPORT_URL: '',
    CONTACT_URL: 'https://portal.public-utility.tools/contact',
    INVIDIOUS_DB_USER: '',
    INVIDIOUS_DB_PASSWORD: '',
    INVIDIOUS_DB_NAME: '',
    PORTAL_PORT: '8080',
    COBALT_PORT: '9000',
    SEARXNG_PORT: '8888',
    REDLIB_PORT: '3002',
    RIMGO_PORT: '3001',
    VALKEY_MEMORY_LIMIT: '128M',
    VALKEY_MAXMEMORY: '96mb',
    ...overrides,
  };
}

function validateLaunch(values, assignedAddresses = new Set([ipv4Bind])) {
  return validateEnvironmentValues(values, { launch: true, assignedAddresses });
}

function previewValues(overrides = {}) {
  return launchValues({
    PRIVATE_PREVIEW: '1',
    EDGE_PROXY_IP: '',
    PUBLIC_PORTAL_HOST: ipv4Bind,
    PUBLIC_MEDIA_HOST: ipv4Bind,
    PUBLIC_SEARCH_HOST: ipv4Bind,
    PUBLIC_PORTAL_ORIGIN: `http://${ipv4Bind}:8080`,
    COBALT_PUBLIC_API_URL: `http://${ipv4Bind}:9000/`,
    PUBLIC_SEARCH_URL: `http://${ipv4Bind}:8888/`,
    SOURCE_CODE_URL: '',
    CONTACT_URL: '',
    ...overrides,
  });
}

test('accepts a complete launch configuration with both core services', () => {
  assert.equal(validateLaunch(launchValues()).ENABLED_SERVICES, 'cobalt,searxng');
});

test('accepts all separately deployed catalog services with matching HTTPS URLs and distinct private ports', () => {
  const services = [
    ['ntfy', 'NTFY', 'notify', '2586'],
    ['bentopdf', 'PDF', 'pdf', '3101'],
    ['vert', 'CONVERT', 'convert', '3102'],
    ['omnitools', 'TOOLS', 'tools', '3103'],
    ['healthchecks', 'MONITOR', 'monitor', '3104'],
    ['pairdrop', 'SEND', 'send', '3105'],
    ['freshrss', 'RSS', 'rss', '3106'],
    ['rsshub', 'FEEDS', 'feeds', '3107'],
    ['privatebin', 'PASTE', 'paste', '3108'],
    ['wakapi', 'WAKAPI', 'wakapi', '3109'],
  ];
  const values = {
    ENABLED_SERVICES: `cobalt,searxng,${services.map(([id]) => id).join(',')}`,
  };
  for (const [, key, hostname, port] of services) {
    values[`PUBLIC_${key}_HOST`] = `${hostname}.utilibre.org`;
    values[`PUBLIC_${key}_URL`] = `https://${hostname}.utilibre.org/`;
    const portKey = ({
      NTFY: 'NTFY_PORT', PDF: 'BENTOPDF_PORT', CONVERT: 'VERT_PORT', TOOLS: 'OMNITOOLS_PORT',
      MONITOR: 'HEALTHCHECKS_PORT', SEND: 'PAIRDROP_PORT', RSS: 'FRESHRSS_PORT', FEEDS: 'RSSHUB_PORT',
      PASTE: 'PRIVATEBIN_PORT', WAKAPI: 'WAKAPI_PORT',
    })[key];
    values[portKey] = port;
  }
  assert.equal(validateLaunch(launchValues(values)).PUBLIC_PDF_URL, 'https://pdf.utilibre.org/');
});

test('accepts a launch configuration with the Redlib profile, catalog ID, hostname, and URL aligned', () => {
  const result = validateLaunch(launchValues({
    COMPOSE_PROFILES: 'privacy-frontends',
    ENABLED_SERVICES: 'cobalt,searxng,redlib',
    PUBLIC_REDDIT_HOST: 'reddit.public-utility.tools',
    PUBLIC_REDDIT_URL: 'https://reddit.public-utility.tools/',
    ANUBIS_PUBLIC_HOST: 'reddit.public-utility.tools',
  }));
  assert.equal(result.PUBLIC_REDDIT_URL, 'https://reddit.public-utility.tools/');
});

for (const mismatch of [
  { COMPOSE_PROFILES: 'privacy-frontends', ENABLED_SERVICES: 'cobalt,searxng' },
  { COMPOSE_PROFILES: '', ENABLED_SERVICES: 'cobalt,searxng,redlib' },
]) {
  test(`rejects mismatched Redlib enablement ${JSON.stringify(mismatch)}`, () => {
    assert.throws(
      () => validateLaunch(launchValues(mismatch)),
      /Redlib requires both ENABLED_SERVICES=.*redlib.* and the privacy-frontends entry in COMPOSE_PROFILES/,
    );
  });
}

test('rejects a public Redlib URL when the service is disabled', () => {
  assert.throws(
    () => validateLaunch(launchValues({
      PUBLIC_REDDIT_HOST: 'reddit.public-utility.tools',
      PUBLIC_REDDIT_URL: 'https://reddit.public-utility.tools/',
    })),
    /PUBLIC_REDDIT_URL must stay empty while redlib is not enabled/,
  );
});

test('rejects a Redlib host-port collision', () => {
  assert.throws(
    () => validateLaunch(launchValues({
      COMPOSE_PROFILES: 'privacy-frontends',
      ENABLED_SERVICES: 'cobalt,searxng,redlib',
      PUBLIC_REDDIT_HOST: 'reddit.public-utility.tools',
      PUBLIC_REDDIT_URL: 'https://reddit.public-utility.tools/',
      REDLIB_PORT: '8888',
    })),
    /REDLIB_PORT conflicts with SEARXNG_PORT/,
  );
});

for (const missing of ['cobalt', 'searxng']) {
  test(`rejects launch without core service ${missing}`, () => {
    const remaining = missing === 'cobalt' ? 'searxng' : 'cobalt';
    assert.throws(
      () => validateLaunch(launchValues({ ENABLED_SERVICES: remaining })),
      new RegExp(`ENABLED_SERVICES must include ${missing} for launch`),
    );
  });
}

test('rejects rimgo and its public URL at the launch gate', () => {
  assert.throws(
    () => validateLaunch(launchValues({
      ENABLED_SERVICES: 'cobalt,searxng,rimgo',
      PUBLIC_IMGUR_HOST: 'imgur.public-utility.tools',
      PUBLIC_IMGUR_URL: 'https://imgur.public-utility.tools/',
    })),
    (error) => {
      assert.match(error.message, /must not include rimgo for launch/);
      assert.match(error.message, /PUBLIC_IMGUR_URL must stay empty for launch/);
      return true;
    },
  );
});

test('rejects a public rimgo URL even when rimgo is not enabled', () => {
  assert.throws(
    () => validateLaunch(launchValues({ PUBLIC_IMGUR_URL: 'https://imgur.public-utility.tools/' })),
    /PUBLIC_IMGUR_URL must stay empty for launch/,
  );
});

test('accepts an assigned raw ULA bind address', () => {
  const bindAddress = 'fd00::23';
  const values = launchValues({ PRIVATE_BIND_IP: bindAddress, EDGE_PROXY_IP: 'fd00::22' });
  assert.equal(validateLaunch(values, new Set([bindAddress])).PRIVATE_BIND_IP, bindAddress);
});

test('accepts direct HTTP private preview without a trusted edge', () => {
  const result = validateEnvironmentValues(previewValues(), { assignedAddresses: new Set([ipv4Bind]) });
  assert.equal(result.PUBLIC_PORTAL_ORIGIN, `http://${ipv4Bind}:8080`);
});

test('accepts a public portal cutover without changing the preview configuration of existing backends', () => {
  const result = validateEnvironmentValues(previewValues({
    PORTAL_PRIVATE_PREVIEW: '0',
    PORTAL_EDGE_PROXY_IP: edgeAddress,
    PORTAL_PUBLIC_ORIGIN: 'https://utilibre.org',
    PORTAL_COBALT_BROWSER_URL: 'https://media.utilibre.org/',
    PORTAL_COBALT_RESULT_SOURCE_URL: `http://${ipv4Bind}:9000/`,
  }), { assignedAddresses: new Set([ipv4Bind]) });
  assert.equal(result.PORTAL_COBALT_BROWSER_URL, 'https://media.utilibre.org/');
});

test('rejects public portal mode without an exact private edge peer', () => {
  assert.throws(
    () => validateEnvironmentValues(previewValues({
      PORTAL_PRIVATE_PREVIEW: '0',
      PORTAL_EDGE_PROXY_IP: '',
      PORTAL_PUBLIC_ORIGIN: 'https://utilibre.org',
      PORTAL_COBALT_BROWSER_URL: 'https://media.utilibre.org/',
      PORTAL_COBALT_RESULT_SOURCE_URL: `http://${ipv4Bind}:9000/`,
    }), { assignedAddresses: new Set([ipv4Bind]) }),
    /PORTAL_EDGE_PROXY_IP must be one exact IP address/,
  );
});

test('accepts Redlib on its direct private-preview URL', () => {
  const values = previewValues({
    COMPOSE_PROFILES: 'privacy-frontends',
    ENABLED_SERVICES: 'cobalt,searxng,redlib',
    PUBLIC_REDDIT_HOST: ipv4Bind,
    PUBLIC_REDDIT_URL: `http://${ipv4Bind}:3002/`,
    ANUBIS_PUBLIC_HOST: ipv4Bind,
    ANUBIS_COOKIE_SECURE: 'false',
    ANUBIS_COOKIE_PARTITIONED: 'false',
  });
  assert.equal(
    validateEnvironmentValues(values, { assignedAddresses: new Set([ipv4Bind]) }).PUBLIC_REDDIT_URL,
    `http://${ipv4Bind}:3002/`,
  );
});

test('rejects unsafe Redlib SFW setting values', () => {
  assert.throws(
    () => validateLaunch(launchValues({ REDLIB_SFW_ONLY: 'maybe' })),
    /REDLIB_SFW_ONLY must be on or off/,
  );
});

test('rejects an Anubis hostname that differs from the public Redlib URL', () => {
  assert.throws(
    () => validateLaunch(launchValues({
      COMPOSE_PROFILES: 'privacy-frontends',
      ENABLED_SERVICES: 'cobalt,searxng,redlib',
      PUBLIC_REDDIT_HOST: 'redlib.public-utility.tools',
      PUBLIC_REDDIT_URL: 'https://redlib.public-utility.tools/',
      ANUBIS_PUBLIC_HOST: 'wrong.public-utility.tools',
    })),
    /ANUBIS_PUBLIC_HOST must be the exact hostname/,
  );
});

test('rejects insecure Anubis cookies at public launch', () => {
  assert.throws(
    () => validateLaunch(launchValues({
      COMPOSE_PROFILES: 'privacy-frontends',
      ENABLED_SERVICES: 'cobalt,searxng,redlib',
      PUBLIC_REDDIT_HOST: 'redlib.public-utility.tools',
      PUBLIC_REDDIT_URL: 'https://redlib.public-utility.tools/',
      ANUBIS_PUBLIC_HOST: 'redlib.public-utility.tools',
      ANUBIS_COOKIE_SECURE: 'false',
      ANUBIS_COOKIE_PARTITIONED: 'false',
    })),
    /ANUBIS_COOKIE_SECURE must be true for public launch/,
  );
});

test('rejects private preview at the public launch gate', () => {
  assert.throws(
    () => validateLaunch(previewValues()),
    /PRIVATE_PREVIEW must be 0 for public launch/,
  );
});

test('rejects a private preview URL on another host or port', () => {
  assert.throws(
    () => validateEnvironmentValues(previewValues({ PUBLIC_SEARCH_URL: 'http://10.23.0.9:9999/' }), { assignedAddresses: new Set([ipv4Bind]) }),
    /PUBLIC_SEARCH_URL must use direct HTTP on PRIVATE_BIND_IP/,
  );
});

test('accepts a separately deployed catalog service on its direct private-preview URL', () => {
  const values = previewValues({
    ENABLED_SERVICES: 'cobalt,searxng,ntfy',
    PUBLIC_NTFY_HOST: ipv4Bind,
    PUBLIC_NTFY_URL: `http://${ipv4Bind}:2586/`,
    NTFY_PORT: '2586',
  });
  assert.equal(
    validateEnvironmentValues(values, { assignedAddresses: new Set([ipv4Bind]) }).PUBLIC_NTFY_URL,
    `http://${ipv4Bind}:2586/`,
  );
});

test('accepts public HTTPS catalog links while the portal itself remains a private preview', () => {
  const values = previewValues({
    COMPOSE_PROFILES: 'privacy-frontends',
    ENABLED_SERVICES: 'cobalt,searxng,redlib,ntfy',
    PUBLIC_SEARCH_URL: 'https://search.utilibre.org/',
    PUBLIC_REDDIT_HOST: ipv4Bind,
    PUBLIC_REDDIT_URL: 'https://redlib.utilibre.org/',
    ANUBIS_PUBLIC_HOST: 'redlib.utilibre.org',
    PUBLIC_NTFY_HOST: ipv4Bind,
    PUBLIC_NTFY_URL: 'https://notify.utilibre.org/',
    NTFY_PORT: '2586',
  });
  const result = validateEnvironmentValues(values, { assignedAddresses: new Set([ipv4Bind]) });
  assert.equal(result.PUBLIC_SEARCH_URL, 'https://search.utilibre.org/');
  assert.equal(result.PUBLIC_NTFY_URL, 'https://notify.utilibre.org/');
});

for (const supportUrl of [
  'http://donate.public-utility.tools/',
  'https://donate/',
  'https://donate.local/',
  'https://user:password@donate.public-utility.tools/',
]) {
  test(`rejects unsafe optional support URL ${supportUrl}`, () => {
    assert.throws(
      () => validateLaunch(launchValues({ SUPPORT_URL: supportUrl })),
      /SUPPORT_URL must be a configured public HTTPS URL/,
    );
  });
}
