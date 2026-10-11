// All stateful work is fictional, network-none and tmpfs-only. No live mounts.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, statfsSync} from 'node:fs';
import {randomBytes, createHash} from 'node:crypto';

process.umask(0o077);
const dependencyReview = process.argv.includes('--dependencies');
const directory = '/var/lib/utilibre-maintenance/gosu-security-20261011' + (dependencyReview ? '/dependencies' : '');
const build = JSON.parse(readFileSync(directory + '/build.json'));
const report = {date: new Date().toISOString(), status: 'running', deployed: false, binarySha256: build.binarySha256, rows: []};
const selectedKind = process.argv.slice(2).find(arg => arg !== '--dependencies');
if (selectedKind) {
  assert(build.rows.some(row => row.kind === selectedKind), 'Unknown selected fixture kind');
  const previous = JSON.parse(readFileSync(directory + '/checks.json'));
  assert.equal(previous.binarySha256, build.binarySha256);
  report.rows = previous.rows.filter(row => row.kind !== selectedKind && row.status === 'passed'
    && build.rows.some(image => image.candidateId === row.candidateId && image.baseId === row.baseId));
}
const active = new Set();
function docker(args, input) {
  try { return execFileSync('docker', args, {input, encoding: 'utf8', timeout: 90000, maxBuffer: 8 * 1024 ** 2, stdio: ['pipe', 'pipe', 'pipe']}); }
  catch (error) {
    // Only generated fixture operations are run, but still don't log arguments.
    const failure = Error('Isolated Docker operation failed');
    failure.status = error.status;
    throw failure;
  }
}
const inspect = image => JSON.parse(docker(['image', 'inspect', image]))[0];
const bounded = ['--network', 'none', '--cpus', '1', '--memory', '512m', '--pids-limit', '96', '--security-opt', 'no-new-privileges:true', '--log-driver', 'none'];
const run = (image, script, args = []) => docker(['run', '--rm', ...bounded, '--read-only', '--user', '0:0', '--entrypoint', 'sh', image, '-c', script, 'fixture', ...args]);
const sha = text => createHash('sha256').update(text).digest('hex');
async function ready(fn) {
  for (let n = 0; n < 90; n++) {
    try { if (fn()) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw Error('Isolated database did not become ready');
}
function remove(name) { if (active.has(name)) { docker(['rm', '-f', '-v', name]); active.delete(name); } }

try {
  for (const image of build.rows) {
    if (selectedKind && image.kind !== selectedKind) continue;
    const space = statfsSync(directory);
    assert(space.bavail * space.bsize >= 8 * 1024 ** 3, 'Preserve 8 GiB recovery floor');
    const before = inspect(image.base), after = inspect(image.candidate);
    assert.equal(before.Id, image.baseId); assert.equal(after.Id, image.candidateId);
    for (const key of ['User', 'Env', 'Cmd', 'Entrypoint', 'WorkingDir', 'ExposedPorts', 'Volumes', 'Healthcheck', 'StopSignal', 'Labels']) {
      assert.deepEqual(after.Config[key], before.Config[key], 'Preserve native configuration: ' + key);
    }
    assert.deepEqual(after.RootFS.Layers.slice(0, before.RootFS.Layers.length), before.RootFS.Layers);
    assert.equal(run(image.candidate, 'sha256sum /usr/local/bin/gosu').trim().split(/\s/)[0], build.binarySha256);
    const oldBinary = run(image.base, 'sha256sum /usr/local/bin/gosu').trim().split(/\s/)[0];
    assert.notEqual(oldBinary, build.binarySha256);
    assert.match(run(image.candidate, 'gosu --version').trim(), /^1\.19 \(go1\.26\.9 on linux\/amd64; gc\)$/);
    assert.equal(run(image.candidate, 'stat -c %a /usr/local/bin/gosu').trim(), '755');
    const roots = image.kind === 'addy' ? '/usr/local /var/www/anonaddy'
      : image.kind === 'documentdb' ? '/usr/local /usr/lib/postgresql /usr/share/postgresql'
      : image.kind === 'mariadb' ? '/usr/local /usr/sbin/mariadbd /usr/bin/mariadb /usr/bin/mariadb-dump'
      : '/usr/local';
    const hashCommand = `find ${roots} -type f ! -path /usr/local/bin/gosu ! -path '/usr/local/share/gosu-security/*' -exec sha256sum {} + | sort | sha256sum`;
    const engineHash = run(image.base, hashCommand).trim().split(/\s/)[0];
    assert.match(engineHash, /^[a-f0-9]{64}$/); assert.notEqual(engineHash, sha(''));
    assert.equal(run(image.candidate, hashCommand).trim().split(/\s/)[0], engineHash, 'Native engine/app/entrypoint bytes changed');
    const account = image.kind === 'addy' ? 'anonaddy' : image.kind === 'mariadb' ? 'mysql' : 'postgres';
    const identities = `set -eu; for spec in nobody nobody:0 10001:10002 "$1" "$1:$1"; do gosu "$spec" sh -c 'id -u; id -g; id -G; printf "%s\\n" "$HOME"'; done`;
    assert.equal(run(image.candidate, identities, [account]), run(image.base, identities, [account]), 'UID/GID/groups/HOME interface changed');
    for (const script of ['gosu no_such_fixture_account true', 'gosu nobody:no_such_fixture_group true', 'gosu nobody gosu 0 true']) {
      assert.throws(() => run(image.candidate, script), error => error.status === 1, 'Invalid identity/escalation must fail');
    }
    assert.throws(() => run(image.candidate, 'gosu 10001:10002 sh -c "exit 37"'), error => error.status === 37);
    docker(['run', '--rm', ...bounded, '--read-only', '--entrypoint', 'gosu', image.candidate, 'nobody', 'sh', '-c', 'test "$$" -eq 1']);
    const row = {...image, status: 'passed', oldBinarySha256: oldBinary, engineSha256: engineHash,
      unchangedNativeConfiguration: true, privilegeDrop: true, supplementaryGroups: true, invalidIdentityDenied: true,
      reescalationDenied: true, nativeExitStatus: true, execReplacesPid1: true};

    if (image.kind === 'postgres' || image.kind === 'documentdb') {
      const name = 'maintenance-gosu-' + image.kind + '-' + image.version.replace('.', '-');
      active.add(name);
      docker(['run', '-d', '--name', name, ...bounded, '--tmpfs', '/var/lib/postgresql/data:rw,size=512m',
        '--tmpfs', '/tmp:rw,size=32m', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image.candidate,
        'postgres', '-c', 'shared_buffers=32MB', '-c', 'max_connections=10', '-c', 'log_statement=none']);
      const sql = (query, db = 'postgres') => docker(['exec', '-i', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], query);
      await ready(() => sql('SELECT 1;').trim() === '1');
      assert.match(sql('SHOW server_version;').trim(), new RegExp('^' + image.version.replace('.', '\\.')));
      sql('CREATE DATABASE fictional;');
      sql(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE TABLE sample(id integer PRIMARY KEY,label text NOT NULL,n numeric(8,2),data jsonb);
        INSERT INTO sample VALUES(1,'Ficción — prueba',12.34,'{"safe":true}');
        CREATE ROLE fixture_reader LOGIN;GRANT CONNECT ON DATABASE fictional TO fixture_reader;
        GRANT USAGE ON SCHEMA public TO fixture_reader;GRANT SELECT ON sample TO fixture_reader;`, 'fictional');
      assert.equal(docker(['exec', name, 'psql', '-U', 'fixture_reader', '-d', 'fictional', '-Atc', 'SELECT n FROM sample']).trim(), '12.34');
      assert.throws(() => docker(['exec', name, 'psql', '-U', 'fixture_reader', '-d', 'fictional', '-v', 'ON_ERROR_STOP=1', '-Atc', 'DELETE FROM sample']));
      sql('BEGIN;UPDATE sample SET n=99;ROLLBACK;', 'fictional');
      const expected = 'Ficción — prueba|12.34|true';
      const query = "SELECT label||'|'||n||'|'||(data->>'safe') FROM sample;";
      assert.equal(sql(query, 'fictional').trim(), expected);
      const dump = docker(['exec', name, 'pg_dump', '-U', 'postgres', '-d', 'fictional']);
      sql('CREATE DATABASE reopened;'); sql(dump, 'reopened');
      assert.equal(sql(query, 'reopened').trim(), expected);
      const processUser = docker(['exec', name, 'sh', '-c', 'awk \'/^Uid:/ {print $2}\' /proc/1/status']).trim();
      assert.notEqual(processUser, '0');
      Object.assign(row, {nativeInitialization: true, nativeSqlAndPermissions: true, transactionRollback: true,
        logicalDumpRestore: true, dumpSha256: sha(dump), serverRunsNonroot: true});
      if (image.kind === 'documentdb') {
        // Preserve and exercise the installed extension, not just a vanilla PG query.
        // Native init installs DocumentDB in postgres; pg_cron intentionally
        // restricts extension creation to that DB. Don't invent another layout.
        assert.match(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';").trim(), /^0\.107/);
        sql(`CREATE TABLE helper_doc_fixture(id integer PRIMARY KEY,payload documentdb_core.bson);
          INSERT INTO helper_doc_fixture VALUES(1,'{"fictional":true,"label":"Ficción"}'::documentdb_core.bson);`);
        const originalBson = sql('SELECT payload::text FROM helper_doc_fixture;').trim();
        assert(originalBson.length > 20);
        const extended = docker(['exec', name, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '-t', 'public.helper_doc_fixture']);
        sql('DROP TABLE helper_doc_fixture;'); sql(extended);
        assert.equal(sql('SELECT payload::text FROM helper_doc_fixture;').trim(), originalBson);
        row.documentdbTypedDataRestore = true;
      }
      remove(name);
    } else if (image.kind === 'mariadb') {
      const password = randomBytes(20).toString('hex');
      let dump;
      for (const suffix of ['source', 'restore']) {
        const name = 'maintenance-gosu-mariadb-' + suffix;
        active.add(name);
        docker(['run', '-d', '--name', name, ...bounded, '--tmpfs', '/var/lib/mysql:rw,size=384m',
          '--tmpfs', '/run/mysqld:rw,size=8m', '--tmpfs', '/tmp:rw,size=16m', '-e', 'MARIADB_ROOT_PASSWORD=' + password,
          image.candidate, 'mariadbd', '--bind-address=127.0.0.1', '--innodb-buffer-pool-size=32M', '--max-connections=10', '--general-log=0', '--slow-query-log=0']);
        const sql = (query, user = 'root') => docker(['exec', '-i', '-e', 'MYSQL_PWD=' + password, name, 'mariadb', '--protocol=TCP', '--host=127.0.0.1', '--user=' + user, '--batch', '--skip-column-names', '--default-character-set=utf8mb4'], query);
        await ready(() => sql('SELECT 1;').trim() === '1');
        assert.match(sql('SELECT VERSION();').trim(), /^12\.2\.2-MariaDB/);
        const query = "SELECT CONCAT(label,'|',n,'|',JSON_VALUE(data,'$.safe')) FROM fictional.sample;";
        if (suffix === 'source') {
          sql(`CREATE DATABASE fictional CHARACTER SET utf8mb4;
            CREATE TABLE fictional.sample(id INT PRIMARY KEY,label VARCHAR(120),n DECIMAL(8,2),data JSON);
            INSERT INTO fictional.sample VALUES(1,'Ficción — prueba',12.34,'{"safe":true}');
            CREATE USER 'fixture_reader'@'127.0.0.1' IDENTIFIED BY '${password}';
            GRANT SELECT ON fictional.* TO 'fixture_reader'@'127.0.0.1';`);
          assert.equal(sql(query, 'fixture_reader').trim(), 'Ficción — prueba|12.34|1');
          assert.throws(() => sql('DELETE FROM fictional.sample;', 'fixture_reader'));
          sql('BEGIN;UPDATE fictional.sample SET n=99;ROLLBACK;');
          dump = docker(['exec', '-e', 'MYSQL_PWD=' + password, name, 'mariadb-dump', '--user=root', '--protocol=TCP', '--host=127.0.0.1', '--single-transaction', '--databases', 'fictional']);
          assert(dump.length > 100 && dump.length < 1024 ** 2);
        } else {
          sql(dump);
          assert.equal(sql(query).trim(), 'Ficción — prueba|12.34|1');
        }
        assert.notEqual(docker(['exec', name, 'sh', '-c', 'awk \'/^Uid:/ {print $2}\' /proc/1/status']).trim(), '0');
        remove(name);
      }
      Object.assign(row, {nativeInitialization: true, nativeSqlAndPermissions: true, transactionRollback: true,
        logicalDumpRestore: true, secondInstanceRestore: true, dumpSha256: sha(dump), serverRunsNonroot: true});
    } else {
      // Uses Addy's actual installed wrapper, which invokes gosu anonaddy:anonaddy.
      assert.match(run(image.candidate, 'anonaddy --version'), /Laravel Framework/);
      row.nativeArtisanPrivilegeDrop = true;
      row.limitation = 'Native CLI only; no mail, alias delivery or production account exercise.';
    }
    report.rows.push(row);
    console.log('Native helper/fixture gate passed: ' + image.candidate);
  }
  assert.equal(report.rows.length, build.rows.length, 'All candidate native gates required');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  // Fixture stderr may contain random test credentials; never persist it.
  report.failure = {message: error.message, exitStatus: error.status ?? null};
  throw error;
} finally {
  for (const name of [...active]) try { remove(name); } catch { report.cleanupFailed = true; }
  report.completedAt = new Date().toISOString();
  report.limits = 'Isolated generated data only; no production data restore or application browser/mail workflow. No deployments.';
  writeFileSync(directory + '/checks.json', JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
}
