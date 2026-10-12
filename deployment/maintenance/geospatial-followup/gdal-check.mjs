#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { verifyGdalPackages, verifyGdalAbi, verifyDriverInventory, gdalProbeCases } from './gdal-policy.mjs';
process.umask(0o077);
const s = JSON.parse(readFileSync(new URL('spec.json', import.meta.url))), w = s.work;
const c = JSON.parse(readFileSync(w + '/gdal-candidate.json'));
const baseline = JSON.parse(readFileSync(w + '/gdal-baseline.json'));
const report = { date: new Date().toISOString(), status: 'running', deployed: false, image: c.image, base: c.base };
const active = new Set(), sha = b => createHash('sha256').update(b).digest('hex');
function run(args, input) {
  try { return execFileSync(args[0], args.slice(1), { input, encoding: 'utf8', timeout: 180000, maxBuffer: 32e6, stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch (e) { writeFileSync(w + '/gdal-native-error.log', String(e.stdout || '') + String(e.stderr || e.message)); throw Error('GDAL/native gate failed; see private gdal-native-error.log'); }
}
const docker = (args, input) => run(['docker', ...args], input);
const bounded = ['--network', 'none', '--cpus', '1', '--memory', '1g', '--memory-swap', '1g', '--pids-limit', '128', '--security-opt', 'no-new-privileges', '--log-driver', 'none', '--ulimit', 'core=0'];
const shell = (id, script) => docker(['run', '--rm', ...bounded, '--read-only', '--entrypoint', 'sh', id, '-ec', script]);
const remove = name => { docker(['rm', '-f', '-v', name]); active.delete(name); };
const probe = (id, mode) => docker(['run', '--rm', ...bounded, '--cap-drop', 'ALL', '--read-only', '--tmpfs', '/tmp:rw,size=64m', '--mount', `type=bind,src=${w}/gdal-fixtures,dst=/fixtures,readonly`, '--entrypoint', '/fixtures/gdal-probe', id, mode, '/fixtures']);
try {
  assert.equal(sha(readFileSync(w + '/gdal-source/hdf-prerequisites.json')), c.hdfPrerequisitesSha256);
  const old = JSON.parse(docker(['image', 'inspect', c.base]))[0], next = JSON.parse(docker(['image', 'inspect', c.image]))[0];
  assert.equal(next.Id, c.image); assert.equal(old.Id, c.base);
  for (const key of ['User', 'Env', 'Entrypoint', 'Cmd', 'WorkingDir', 'Healthcheck', 'Volumes', 'ExposedPorts', 'Labels']) assert.deepEqual(next.Config[key], old.Config[key], 'Runtime image configuration changed: ' + key);
  const packages = "dpkg-query -W -f='${Package}\\t${Version}\\n' | sort";
  verifyGdalPackages(shell(c.base, packages), shell(c.image, packages));
  assert.equal(shell(c.image, 'dpkg --audit').trim(), ''); report.onlyNativePackageChanged = true;
  const files = new Set(shell(c.base, 'dpkg -L libgdal32').trim().split('\n'));
  const inventory = id => shell(id, 'find /usr/local /usr/lib /usr/share/postgresql -type f -exec sha256sum {} + | sort').split('\n').filter(line => line && !files.has(line.slice(66)) && !line.slice(66).startsWith('/usr/local/share/gdal-security/'));
  const before = inventory(c.base), after = inventory(c.image);
  assert.deepEqual(after, before, 'Unrelated runtime bytes changed, including prior PostGIS/Python/Expat/curl patches');
  report.otherRuntimeFilesSha256 = sha(before.join('\n'));
  const library = '/usr/lib/x86_64-linux-gnu/libgdal.so.32.3.6.2', checks = [];
  assert(files.has(library));
  for (const [label, id] of [['old', c.base], ['new', c.image]]) {
    const name = 'maintenance-gdal-elf-' + label; active.add(name);
    docker(['create', '--name', name, '--entrypoint', 'true', id]);
    const file = w + '/gdal-' + label + '.so'; docker(['cp', name + ':' + library, file]); remove(name);
    const h = run(['readelf', '-h', file]), d = run(['readelf', '-d', file]), symbols = run(['readelf', '--dyn-syms', '--wide', file]);
    checks.push({ sha256: sha(readFileSync(file)), class: h.match(/Class:\s+(\S+)/)[1], machine: h.match(/Machine:\s+(.+)/)[1], soname: d.match(/SONAME.*\[([^\]]+)\]/)[1], needed: [...d.matchAll(/NEEDED.*\[([^\]]+)\]/g)].map(x => x[1]).sort(), exports: symbols.split('\n').filter(l => /\bGLOBAL\s+DEFAULT\s+\d+\s+/.test(l)).map(l => l.trim().split(/\s+/).at(-1)).sort() });
  }
  verifyGdalAbi(checks[0], checks[1]);
  report.library = { path: library, oldSha256: checks[0].sha256, sha256: checks[1].sha256, exports: checks[1].exports.length, needed: checks[1].needed, nativeAbiUnchanged: true };
  report.drivers = verifyDriverInventory(probe(c.base, '--drivers'), probe(c.image, '--drivers'));
  for (const f of baseline.fixtures) assert.equal(sha(readFileSync(w + '/gdal-fixtures/' + f.file)), f.sha256, 'Regression input differs from failing baseline');
  report.cases = [];
  for (const mode of gdalProbeCases) {
    const output = probe(c.image, mode); assert(output.trim());
    report.cases.push({ mode, status: 0, stdout: output });
  }
  report.baselineSha256 = sha(readFileSync(w + '/gdal-baseline.json'));
  report.hdfPrerequisitesSha256 = c.hdfPrerequisitesSha256;
  const name = 'maintenance-gdal-native-check'; active.add(name);
  docker(['run', '-d', '--name', name, ...bounded, '--tmpfs', '/var/lib/postgresql/data:rw,size=768m', '--tmpfs', '/tmp:rw,size=128m', '--mount', `type=bind,src=${w}/source-tree,dst=/work/source-tree,readonly`, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', c.image, 'postgres', '-c', 'shared_buffers=32MB', '-c', 'max_connections=10', '-c', 'log_statement=none', '-c', 'log_min_error_statement=panic']);
  const sql = query => docker(['exec', '-i', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], query);
  let ready = false; for (let i = 0; i < 90; ++i) { try { if (sql('SELECT 1;').trim() === '1') { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 500)); } assert(ready);
  assert.match(sql('SHOW server_version;'), /^17\.11/);
  assert.equal(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';").trim(), '0.107-0');
  sql('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster;');
  report.nativeVersion = sql('SELECT postgis_full_version();').trim(); assert.match(report.nativeVersion, /GDAL="GDAL 3\.6\.2/);
  const regression = docker(['exec', '-e', 'PGUSER=postgres', '-e', 'PGHOST=127.0.0.1', '-w', '/work/source-tree', name, 'perl', '/work/source-tree/regress/run_test.pl', '--extension', '--dumprestore', '/work/source-tree/regress/core/flatgeobuf']);
  writeFileSync(w + '/gdal-upstream-flatgeobuf.log', regression); assert.match(regression, /Run tests: 2\nFailed: 0\n/);
  sql("CREATE TABLE gdal_fixture(id int PRIMARY KEY, geom geometry(Point,4326), rast raster, payload documentdb_core.bson); INSERT INTO gdal_fixture VALUES(1, ST_SetSRID(ST_Point(-90.5,14.6),4326), ST_AddBand(ST_MakeEmptyRaster(2,2,0,0,1,-1,0,0,4326),'8BUI'::text,7,0), '{}'::documentdb_core.bson);");
  assert.equal(sql("SET postgis.gdal_enabled_drivers='GTiff'; SELECT ST_Value(ST_FromGDALRaster(ST_AsGDALRaster(rast,'GTiff')),1,1) FROM gdal_fixture;").trim().split('\n').at(-1), '7');
  const query = 'SELECT id,ST_AsGeoJSON(geom),ST_AsBinary(rast),payload::text FROM gdal_fixture;', expected = sql(query).trim();
  assert.equal(sql('SELECT round(ST_X(ST_Transform(geom,3857))) FROM gdal_fixture;').trim(), '-10074414');
  const dump = docker(['exec', name, 'pg_dump', '-U', 'postgres', '-t', 'public.gdal_fixture']);
  sql('DROP TABLE gdal_fixture;'); sql(dump); assert.equal(sql(query).trim(), expected);
  sql('CREATE ROLE gdal_reader LOGIN; CREATE DATABASE gdal_permissions TEMPLATE template0;');
  sql('\\connect gdal_permissions\nCREATE EXTENSION postgis; CREATE TABLE geospatial_fixture(id integer,geom geometry); INSERT INTO geospatial_fixture VALUES(1,ST_Point(2,3)); GRANT SELECT ON geospatial_fixture TO gdal_reader;');
  assert.equal(docker(['exec', name, 'psql', '-U', 'gdal_reader', '-d', 'gdal_permissions', '-Atc', 'SELECT id,ST_AsText(geom) FROM geospatial_fixture;']).trim(), '1|POINT(2 3)');
  const denied = spawnSync('docker', ['exec', name, 'psql', '-U', 'gdal_reader', '-d', 'gdal_permissions', '-v', 'ON_ERROR_STOP=1', '-Atc', 'DELETE FROM geospatial_fixture;'], { encoding: 'utf8', timeout: 15000 });
  assert.equal(denied.status, 1); assert.match(denied.stderr, /permission denied for table geospatial_fixture/);
  report.upstreamFlatGeobuf = true; report.documentdbTypedData = true; report.nativeRasterExportImport = true; report.geometryProjection = true; report.readOnlyRoleAndDeniedDelete = true; report.syntheticDumpRestoreSha256 = sha(dump);
  remove(name); report.status = 'passed';
} catch (e) { report.status = 'failed'; report.error = e.message; throw e; }
finally { for (const name of active) try { remove(name); } catch { report.cleanupFailure = true; }
  report.completedAt = new Date().toISOString(); writeFileSync(w + '/gdal-checks.json', JSON.stringify(report, null, 2) + '\n'); }
console.log('Native GDAL source repair, ABI/drivers, malformed fixtures, SQL consumer and restore gates passed; not deployed.');
