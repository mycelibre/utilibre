import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTargets } from './generate.mjs';

test('enabled search uses its lightweight health route', () => {
  const result = buildTargets({
    publicPortalOrigin: 'https://utilibre.org',
    enabledServices: ['searxng'],
    publicSearchUrl: 'https://search.utilibre.org/',
  });
  assert.equal(result.enabledServiceCount, 1);
  assert.deepEqual(result.targets.map(target => target.id), ['portal-health', 'portal-page', 'searxng']);
  assert.equal(result.targets[2].url, 'https://search.utilibre.org/healthz');
});

test('GotHub uses the native version route that the browser challenge exempts', () => {
  const result = buildTargets({
    publicPortalOrigin: 'https://utilibre.org',
    enabledServices: ['gothub'],
    publicGothubUrl: 'https://gothub.utilibre.org/',
  });
  assert.deepEqual(result.targets[2].url, 'https://gothub.utilibre.org/api/v1/version');
  assert.equal(result.targets[2].replacesUrl, 'https://gothub.utilibre.org/');
});

test('rejects lookalike and credential-bearing service URLs', () => {
  for (const publicSearchUrl of [
    'https://search.utilibre.org.evil/',
    'https://user:pass@search.utilibre.org/',
    'https://search.utilibre.org/?secret=example',
    'http://search.utilibre.org/',
  ]) {
    assert.throws(() => buildTargets({
      publicPortalOrigin: 'https://utilibre.org',
      enabledServices: ['searxng'], publicSearchUrl,
    }));
  }
});

test('refuses to silently omit an enabled service', () => {
  assert.throws(() => buildTargets({
    publicPortalOrigin: 'https://utilibre.org',
    enabledServices: ['searxng'],
  }), /without a monitor target/);
});
