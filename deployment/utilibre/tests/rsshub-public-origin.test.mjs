import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const deploymentRoot = fileURLToPath(new URL('../', import.meta.url));
const compose = readFileSync(`${deploymentRoot}compose.yaml`, 'utf8');
const dockerfile = readFileSync(
  `${deploymentRoot}config/rsshub/Dockerfile.utilibre`,
  'utf8',
);
const runtimePatch = readFileSync(
  `${deploymentRoot}config/rsshub/patch-runtime.mjs`,
  'utf8',
);
const sourcePatch = readFileSync(
  `${deploymentRoot}config/rsshub/rsshub-public-origin.patch`,
  'utf8',
);
const publicCheckPath = `${deploymentRoot}scripts/check-rsshub-public.sh`;
const publicCheck = readFileSync(publicCheckPath, 'utf8');
const sourcePatchPath = `${deploymentRoot}config/rsshub/rsshub-public-origin.patch`;
const updateApply = readFileSync(`${deploymentRoot}scripts/update-apply.sh`, 'utf8');
const updateProcedure = readFileSync(`${deploymentRoot}docs/UPDATE-PROCEDURE.md`, 'utf8');

test('RSSHub derives feed self-links from the configured public origin', () => {
  assert.match(compose, /image: utilibre-rsshub:40aca954-public-origin-p2/);
  assert.match(
    compose,
    /UTILIBRE_RSSHUB_PUBLIC_URL: \$\{RSSHUB_PUBLIC_URL:-https:\/\/feeds\.utilibre\.org\/\}/,
  );
  assert.match(dockerfile, /RUN node \/usr\/local\/share\/utilibre\/patch-runtime\.mjs/);
  assert.match(runtimePatch, /Expected exactly one RSSHub atom-link patch point/);
  assert.match(runtimePatch, /r\.pathname=n\.pathname;r\.search=n\.search/);
  assert.match(sourcePatch, /publicUrl\.pathname = requestUrl\.pathname/);
  assert.doesNotMatch(runtimePatch, /new URL\(n\.pathname\+n\.search,t\)/);
  assert.doesNotMatch(runtimePatch, /x-forwarded-(?:host|proto)/i);
});

test('RSSHub patch cannot let a scheme-relative request path replace the public host', () => {
  const replacement = runtimePatch.match(/const replacement = '([^']+)'/)?.[1];
  assert.ok(replacement, 'runtime replacement expression is present');
  const expression = replacement.slice('atomlink:'.length, -',...a'.length);
  const renderAtomLink = Function('e', 'process', `return (${expression})`);

  const actual = renderAtomLink(
    { req: { url: 'http://rsshub:1200//attacker.example/feed?limit=2' } },
    { env: { UTILIBRE_RSSHUB_PUBLIC_URL: 'https://feeds.utilibre.org/' } },
  );
  assert.equal(actual, 'https://feeds.utilibre.org//attacker.example/feed?limit=2');
});

test('RSSHub source-equivalent patch is syntactically valid', () => {
  const syntax = spawnSync('git', ['apply', '--numstat', sourcePatchPath], {
    encoding: 'utf8',
    cwd: '/tmp',
  });
  assert.equal(syntax.status, 0, syntax.stderr);
  assert.match(syntax.stdout, /^12\s+1\s+lib\/middleware\/template\.tsx\s*$/);
});

test('RSSHub patch remains based on the reviewed immutable upstream image', () => {
  const digest = 'sha256:0e0ee34e7288664ada039a816835ee28cc86767412d2c23f64e37a7320908f6c';
  assert.match(compose, new RegExp(`RSSHUB_BASE_IMAGE: ghcr\\.io/diygod/rsshub@${digest}`));
  assert.match(dockerfile, new RegExp(`RSSHUB_BASE_IMAGE=ghcr\\.io/diygod/rsshub@${digest}`));
});

test('RSSHub public check is valid POSIX shell and asserts a populated HTTPS feed', () => {
  const syntax = spawnSync('sh', ['-n', publicCheckPath], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  assert.match(publicCheck, /base_url=\$\{RSSHUB_PUBLIC_BASE_URL:-https:\/\/feeds\.utilibre\.org\}/);
  assert.match(publicCheck, /grep -Fq '<item>'/);
  assert.match(publicCheck, /<atom:link href=/);
});

test('RSSHub cannot be downgraded through the standard single-image updater', () => {
  assert.match(updateApply, /rsshub\).*derived-image review and rebuild/);
  assert.doesNotMatch(updateApply, /rsshub:ghcr\.io\/diygod\/rsshub/);
  assert.match(updateProcedure, /## RSSHub derived-image update/);
  assert.match(updateProcedure, /Never reuse a derived tag for\s+different bytes/);
});
