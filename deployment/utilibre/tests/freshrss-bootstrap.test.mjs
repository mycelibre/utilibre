import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const deploymentRoot = fileURLToPath(new URL('../', import.meta.url));
const hostBootstrap = join(deploymentRoot, 'scripts/bootstrap-freshrss.sh');
const containerBootstrap = join(deploymentRoot, 'scripts/freshrss-bootstrap-container.sh');
const secretValues = ['owner-test', 'db-secret-test', 'login-secret-test', 'api-secret-test'];

function executable(path, contents) {
  writeFileSync(path, contents, { mode: 0o700 });
  chmodSync(path, 0o700);
}

function makeFreshRoot() {
  const root = mkdtempSync(join(tmpdir(), 'utilibre-freshrss-helper-'));
  mkdirSync(join(root, 'data'), { recursive: true });
  mkdirSync(join(root, 'cli'), { recursive: true });
  const phpLog = join(root, 'php.log');
  const fakePhp = join(root, 'php');
  writeFileSync(phpLog, '');

  executable(fakePhp, `#!/bin/sh
set -eu
if [ "$1" = "-r" ]; then
  printf '%s' "$FAKE_DEFAULT_USER"
  exit 0
fi
[ "$1" = "-f" ] || exit 20
case "$2" in
  */do-install.php) printf 'install\\n' >> "$FAKE_PHP_LOG" ;;
  */list-users.php) printf '%s\\n' "${'${FAKE_USERS:-}'}" ;;
  */create-user.php) printf 'create-user\\n' >> "$FAKE_PHP_LOG" ;;
  *) exit 21 ;;
esac
`);

  return { root, phpLog, fakePhp };
}

function runContainerHelper(fixture, overrides = {}) {
  return spawnSync(containerBootstrap, [], {
    encoding: 'utf8',
    input: `${secretValues.join('\n')}\n`,
    env: {
      ...process.env,
      FRESHRSS_BASE_URL: 'https://rss.example.test',
      FRESHRSS_ROOT: fixture.root,
      PHP_BIN: fixture.fakePhp,
      FAKE_DEFAULT_USER: secretValues[0],
      FAKE_USERS: secretValues[0],
      FAKE_PHP_LOG: fixture.phpLog,
      ...overrides,
    },
  });
}

test('container bootstrap preserves an initialized matching account', () => {
  const fixture = makeFreshRoot();
  try {
    writeFileSync(join(fixture.root, 'data/config.php'), '<?php return [];');
    writeFileSync(join(fixture.root, 'data/applied_migrations.txt'), 'installed');

    const result = runContainerHelper(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /configuration preserved/);
    assert.match(result.stdout, /account settings preserved/);
    assert.equal(readFileSync(fixture.phpLog, 'utf8'), '');
    for (const secret of secretValues.slice(1)) {
      assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('container bootstrap refuses an initialized default-user mismatch', () => {
  const fixture = makeFreshRoot();
  try {
    writeFileSync(join(fixture.root, 'data/config.php'), '<?php return [];');
    writeFileSync(join(fixture.root, 'data/applied_migrations.txt'), 'installed');

    const result = runContainerHelper(fixture, { FAKE_DEFAULT_USER: 'someone-else' });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /default user differs/);
    assert.equal(readFileSync(fixture.phpLog, 'utf8'), '');
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('container bootstrap installs and creates the account only when absent', () => {
  const fixture = makeFreshRoot();
  try {
    const result = runContainerHelper(fixture, { FAKE_USERS: '' });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /installation created/);
    assert.match(result.stdout, /operator account created/);
    assert.equal(readFileSync(fixture.phpLog, 'utf8'), 'install\ncreate-user\n');
    for (const secret of secretValues.slice(1)) {
      assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('host bootstrap sends passwords over stdin rather than Docker arguments', () => {
  const root = mkdtempSync(join(tmpdir(), 'utilibre-freshrss-host-'));
  try {
    const scripts = join(root, 'scripts');
    const fakeBin = join(root, 'bin');
    const dockerLog = join(root, 'docker.log');
    mkdirSync(scripts);
    mkdirSync(fakeBin);
    mkdirSync(join(root, 'secrets'));
    copyFileSync(hostBootstrap, join(scripts, basename(hostBootstrap)));
    copyFileSync(containerBootstrap, join(scripts, basename(containerBootstrap)));
    chmodSync(join(scripts, basename(hostBootstrap)), 0o755);
    chmodSync(join(scripts, basename(containerBootstrap)), 0o755);

    const envFile = join(root, '.env');
    writeFileSync(envFile, `APP_BIND_IP=10.20.30.40
EDGE_PROXY_IP=10.20.30.41
FRESHRSS_BASE_URL=https://rss.example.test
FRESHRSS_ADMIN_USERNAME=${secretValues[0]}
FRESHRSS_DB_PASSWORD=${secretValues[1]}
FRESHRSS_ADMIN_PASSWORD=${secretValues[2]}
FRESHRSS_API_PASSWORD=${secretValues[3]}
`, { mode: 0o600 });
    chmodSync(envFile, 0o600);

    executable(join(fakeBin, 'docker'), `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$FAKE_DOCKER_LOG"
if [ "$1" = compose ] && [ "$2" = run ]; then
  IFS= read -r username
  IFS= read -r database_password
  IFS= read -r admin_password
  IFS= read -r api_password
  [ "$username" = "$EXPECTED_USERNAME" ]
  [ "$database_password" = "$EXPECTED_DATABASE_PASSWORD" ]
  [ "$admin_password" = "$EXPECTED_ADMIN_PASSWORD" ]
  [ "$api_password" = "$EXPECTED_API_PASSWORD" ]
  if IFS= read -r unexpected; then exit 30; fi
fi
`);

    const result = spawnSync(join(scripts, basename(hostBootstrap)), [], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH}`,
        FAKE_DOCKER_LOG: dockerLog,
        EXPECTED_USERNAME: secretValues[0],
        EXPECTED_DATABASE_PASSWORD: secretValues[1],
        EXPECTED_ADMIN_PASSWORD: secretValues[2],
        EXPECTED_API_PASSWORD: secretValues[3],
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const observable = `${result.stdout}${result.stderr}${readFileSync(dockerLog, 'utf8')}`;
    for (const secret of secretValues) {
      assert.doesNotMatch(observable, new RegExp(secret));
    }
    assert.match(observable, /compose up --detach --wait postgres/);
    assert.match(observable, /compose run --rm --no-deps -T --env FRESHRSS_BASE_URL=https:\/\/rss\.example\.test/);
    assert.match(observable, /compose up --detach --wait freshrss/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
