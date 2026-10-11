// Native deployment checks: no production state or real content is read.
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, access, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const docker = (...args) => execFileSync('docker', args, {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024,
});
const model = (files, extra = []) => JSON.parse(docker('compose', ...extra,
  ...files.flatMap(f => ['-f', f]), 'config', '--format', 'json'));
const core = model(['compose.yaml'], ['--profile', 'privacy-frontends']);
const chess = model(['deployment/family-chess/compose.yaml']);

for (const [id, service, target, directory] of [
  ['searxng', core.services.searxng, '/var/cache/searxng', 'searxng-cache'],
  ['anubis', core.services.anubis, '/data', 'anubis'],
  ['family-chess', chess.services.app, '/data', 'family-chess'],
]) {
  test(`${id}: missing disk fails without creating a system-disk fallback`, async t => {
    const data = service.volumes.find(v => v.target === target);
    assert.equal(data.type, 'bind');
    assert.equal(data.source, `/opt/utilibre/temporary/${directory}`);
    assert.equal(data.bind.create_host_path, false);
    const dir = await mkdtemp('/opt/utilibre/temporary-mount-test-');
    const file = `${dir}/compose.json`, missing = `${dir}/absent`;
    const project = `temporary-mount-test-${id}-${process.pid}`;
    t.after(async () => {
      try { docker('compose', '-p', project, '-f', file, 'down'); } catch {}
      await rm(dir, { recursive: true });
    });
    await writeFile(file, JSON.stringify({ services: { probe: {
      image: service.image, entrypoint: ['/bin/true'], network_mode: 'none',
      logging: { driver: 'none' }, volumes: [{ ...data, source: missing }],
    } } }));
    assert.throws(() => docker('compose', '-p', project, '-f', file, 'up',
      '--pull', 'never', '--abort-on-container-exit'),
    error => error.status !== 0 && /bind source path does not exist/.test(String(error.stderr)));
    await assert.rejects(access(missing), { code: 'ENOENT' });
  });
}

test('temporary services retain bounded RAM and prohibit new swap writes', () => {
  const community = model(['deployment/community/compose.yaml', 'deployment/community/compose.pairdrop-turn.yaml']);
  const collaboration = model(['deployment/community/compose.collaboration.yaml', 'deployment/community/compose.collaboration-lan.yaml'], ['--profile', 'pilot']);
  const rustpad = model(['deployment/rustpad/compose.yaml']);
  const suite = model(['deployment/utilibre/compose.yaml'], ['--env-file', '/opt/utilibre/.env']);
  const evaluation = model(['deployment/community/compose.evaluation.yaml']);
  const selected = [
    ...['searxng', 'valkey', 'anubis', 'redlib'].map(n => core.services[n]),
    ...['app', 'gateway'].map(n => chess.services[n]),
    ...['rssbridge', 'ntfy', 'yopass', 'secret-cache', 'pairdrop'].map(n => community.services[n]),
    collaboration.services.wbo, collaboration.services.gateway, rustpad.services.rustpad,
    suite.services.valkey, suite.services.rsshub, evaluation.services.degoog, evaluation.services['degoog-gateway'],
  ];
  for (const service of selected) {
    const memory = Number(service.mem_limit || service.deploy.resources.limits.memory);
    assert(memory > 0);
    assert.equal(Number(service.memswap_limit), memory);
    // Compose's JSON encoder omits zero-valued soft/hard fields.
    assert(Object.hasOwn(service.ulimits, 'core'));
    assert.equal(service.ulimits.core.soft ?? 0, 0);
    assert.equal(service.ulimits.core.hard ?? 0, 0);
  }
});

test('native Docker launch actually applies the configured zero core limit', async t => {
  const dir = await mkdtemp('/opt/utilibre/temporary-core-test-');
  const file = `${dir}/compose.json`, project = `temporary-core-test-${process.pid}`;
  t.after(async () => {
    try { docker('compose', '-p', project, '-f', file, 'down'); } catch {}
    await rm(dir, { recursive: true });
  });
  await writeFile(file, JSON.stringify({ services: { probe: {
    image: chess.services.gateway.image, entrypoint: ['/bin/sh', '-c', 'ulimit -c'],
    network_mode: 'none', logging: { driver: 'none' },
    // JSON config omits zero fields; rehydrate these already-checked values
    // explicitly because Compose rejects an empty object on re-import.
    ulimits: { core: {
      soft: chess.services.gateway.ulimits.core.soft ?? 0,
      hard: chess.services.gateway.ulimits.core.hard ?? 0,
    } },
  } } }));
  assert.equal(docker('compose', '-p', project, '-f', file, 'run', '--rm',
    '--no-deps', '--pull', 'never', 'probe').trim(), '0');
});
