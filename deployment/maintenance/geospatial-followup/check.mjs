#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { verifyPackageDelta, verifyAbi } from './policy.mjs';
process.umask(0o077);
const spec = JSON.parse(readFileSync(new URL('spec.json', import.meta.url)));
const w = spec.work, candidate = JSON.parse(readFileSync(w + '/candidate.json'));
const report = { date: new Date().toISOString(), status: 'running', deployed: false, image: candidate.image, base: candidate.base };
const active = new Set();
function run(args, input) {
  try { return execFileSync(args[0], args.slice(1), { input, encoding: 'utf8', timeout: 180000, maxBuffer: 32e6, stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch (e) { writeFileSync(w + '/native-error.log', String(e.stdout || '') + String(e.stderr || e.message)); throw Error('Native gate failed; see private native-error.log'); }
}
const docker = (args, input) => run(['docker', ...args], input);
const sha = x => createHash('sha256').update(x).digest('hex');
const bounded = ['--network', 'none', '--cpus', '1', '--memory', '1g', '--memory-swap', '1g', '--pids-limit', '128', '--security-opt', 'no-new-privileges', '--log-driver', 'none'];
const shell = (image, script, input) => docker(['run', '--rm', ...bounded, '--read-only', '--entrypoint', 'sh', image, '-ec', script], input);
const remove = name => { docker(['rm', '-f', '-v', name]); active.delete(name); };
const inspect = id => JSON.parse(docker(['image', 'inspect', id]))[0];
try {
  const old = inspect(candidate.base), current = inspect(candidate.image);
  assert.equal(current.Id, candidate.image); assert.equal(old.Id, candidate.base);
  for (const key of ['User', 'Env', 'Entrypoint', 'Cmd', 'WorkingDir', 'Healthcheck', 'Volumes', 'ExposedPorts', 'Labels']) assert.deepEqual(current.Config[key], old.Config[key], 'Native configuration changed: ' + key);
  const packageList = "dpkg-query -W -f='${Package}\\t${Version}\\n' | sort";
  verifyPackageDelta(shell(candidate.base, packageList), shell(candidate.image, packageList), spec.candidateVersion);
  assert.equal(shell(candidate.image, 'dpkg --audit').trim(), '');
  report.onlyNativePackageChanged = true;
  const files = shell(candidate.base, 'dpkg -L postgresql-17-postgis-3').split('\n');
  const owned = new Set(files);
  const inventory = id => shell(id, 'find /usr/local /usr/lib/postgresql /usr/share/postgresql -type f -exec sha256sum {} + | sort').split('\n').filter(line => {
    if (!line) return false;
    const path = line.slice(66); return !owned.has(path) && !path.startsWith('/usr/local/share/postgis-security/');
  });
  assert.deepEqual(inventory(candidate.image), inventory(candidate.base), 'PostgreSQL engine, SQL scripts or DocumentDB application changed');
  report.engineSqlAndApplicationSha256 = sha(inventory(candidate.base).join('\n'));
  report.libraries = [];
  for (const path of files.filter(p => p.endsWith('.so'))) {
    const checks = [];
    for (const [label, id] of [['old', candidate.base], ['new', candidate.image]]) {
      const name = 'maintenance-postgis-elf-' + label; active.add(name);
      docker(['create', '--name', name, '--entrypoint', 'true', id]);
      const file = w + '/' + label + '-' + path.split('/').at(-1);
      docker(['cp', name + ':' + path, file]); remove(name);
      const header = run(['readelf', '-h', file]), dynamic = run(['readelf', '-d', file]), symbols = run(['readelf', '--dyn-syms', '--wide', file]);
      checks.push({ sha256: sha(readFileSync(file)), class: header.match(/Class:\s+(\S+)/)[1], machine: header.match(/Machine:\s+(.+)/)[1],
        needed: [...dynamic.matchAll(/NEEDED.*\[([^\]]+)\]/g)].map(x => x[1]).sort(),
        exports: symbols.split('\n').filter(l => /\bGLOBAL\s+DEFAULT\s+\d+\s+/.test(l)).map(l => l.trim().split(/\s+/).at(-1)).sort() });
    }
    // Each module keeps exactly the exported PostgreSQL function ABI. Small
    // SFCGAL/topology modules have fewer than 100 exports, so use explicit
    // equality there and the stricter large-module sentinel on postgis-3.so.
    if (path.endsWith('/postgis-3.so')) verifyAbi(checks[0], checks[1]);
    else for (const key of ['class', 'machine', 'needed', 'exports']) assert.deepEqual(checks[1][key], checks[0][key], path + ': ' + key);
    report.libraries.push({ path, oldSha256: checks[0].sha256, sha256: checks[1].sha256, exports: checks[1].exports.length, nativeAbiUnchanged: true });
  }
  assert.equal(report.libraries.length, 5);
  const name = 'maintenance-postgis-native-check'; active.add(name);
  docker(['run', '-d', '--name', name, ...bounded, '--tmpfs', '/var/lib/postgresql/data:rw,size=768m', '--tmpfs', '/tmp:rw,size=128m',
    '--mount', `type=bind,src=${w}/source-tree,dst=/work/source-tree,readonly`, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
    candidate.image, 'postgres', '-c', 'shared_buffers=32MB', '-c', 'max_connections=10', '-c', 'log_statement=none', '-c', 'log_min_error_statement=panic']);
  const sql = query => docker(['exec', '-i', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], query);
  let ready = false;
  for (let i = 0; i < 90; i++) { try { if (sql('SELECT 1;').trim() === '1') { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 500)); }
  assert(ready, 'Native database failed readiness');
  assert.match(sql('SHOW server_version;'), /^17\.11/);
  assert.match(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';"), /^0\.107/);
  sql('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster; CREATE EXTENSION IF NOT EXISTS postgis_sfcgal; CREATE EXTENSION IF NOT EXISTS postgis_topology;');
  report.postgisVersion = sql('SELECT postgis_full_version();').trim();
  const regression = docker(['exec', '-e', 'PGUSER=postgres', '-e', 'PGHOST=127.0.0.1', '-w', '/work/source-tree', name,
    'perl', '/work/source-tree/regress/run_test.pl', '--extension', '--dumprestore', '/work/source-tree/regress/core/flatgeobuf']);
  writeFileSync(w + '/upstream-native-flatgeobuf.log', regression);
  assert.match(regression, /flatgeobuf.*ok/); assert.match(regression, /Run tests: 2\nFailed: 0\n/);
  assert.equal(sql('SELECT 1;').trim(), '1');
  sql(`CREATE TABLE geospatial_fixture(id integer PRIMARY KEY, label text, geom geometry(Point,4326), payload documentdb_core.bson); INSERT INTO geospatial_fixture VALUES (1,'Ficción — taller',ST_SetSRID(ST_Point(-90.5,14.6),4326),'{}'::documentdb_core.bson); CREATE ROLE fixture_reader LOGIN; CREATE DATABASE geospatial_permissions TEMPLATE template0;`);
  const query = 'SELECT id,label,ST_AsGeoJSON(geom),payload::text FROM geospatial_fixture;';
  const expected = sql(query).trim(); assert.match(expected, /Ficción — taller/);
  // Standard PostgreSQL role permissions are tested in a separate native
  // PostGIS database; DocumentDB's internal schema grants are not modified.
  sql('\\connect geospatial_permissions\nCREATE EXTENSION postgis; CREATE TABLE geospatial_fixture(id integer,geom geometry); INSERT INTO geospatial_fixture VALUES(1,ST_Point(2,3)); GRANT SELECT ON geospatial_fixture TO fixture_reader;');
  const readerQuery = 'SELECT id,ST_AsText(geom) FROM geospatial_fixture;';
  assert.equal(docker(['exec', name, 'psql', '-U', 'fixture_reader', '-d', 'geospatial_permissions', '-Atc', readerQuery]).trim(), '1|POINT(2 3)');
  const denied = spawnSync('docker', ['exec', name, 'psql', '-U', 'fixture_reader', '-d', 'geospatial_permissions', '-v', 'ON_ERROR_STOP=1', '-Atc', 'DELETE FROM geospatial_fixture;'], { encoding: 'utf8', timeout: 15000 });
  assert.equal(denied.status, 1); assert.match(denied.stderr, /permission denied for table geospatial_fixture/);
  assert.equal(sql('SELECT round(ST_X(ST_Transform(geom,3857))) FROM geospatial_fixture;').trim(), '-10074414');
  const dump = docker(['exec', name, 'pg_dump', '-U', 'postgres', '-t', 'public.geospatial_fixture']);
  sql('DROP TABLE geospatial_fixture;'); sql(dump); assert.equal(sql(query).trim(), expected);
  report.upstreamRegressionWithDumpRestore = true; report.documentdbTypedData = true;
  report.readOnlyRoleAndDeniedDelete = true; report.geometryProjection = true;
  report.syntheticDumpRestoreSha256 = sha(dump);
  remove(name); report.status = 'passed';
} catch (e) { report.status = 'failed'; report.error = e.message; throw e; }
finally { for (const name of active) try { remove(name); } catch { report.cleanupFailure = true; }
  report.completedAt = new Date().toISOString(); writeFileSync(w + '/checks.json', JSON.stringify(report, null, 2) + '\n'); }
console.log('PostGIS native ABI, exact upstream regression, permissions and synthetic restore passed; not deployed.');
