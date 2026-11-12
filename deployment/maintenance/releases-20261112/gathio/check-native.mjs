// Bind the existing fictional Gathio lifecycle/restore fixture to exact images.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert.equal(process.argv.length, 2);
const root = '/var/lib/utilibre-maintenance/releases-20261112/gathio';
const inputs = JSON.parse(fs.readFileSync(new URL('./inputs.json', import.meta.url)));
const built = JSON.parse(fs.readFileSync(root + '/runtime/build.json'));
assert(built.passed && built.configurationUnchanged && built.base === inputs.spec.base);
const fixtures = {
  'deployment/maintenance/go-closure/check-ferretdb.mjs': '10ee66156e2e481b7eaeb79b24358e5cebb6593616537498d09a8cda9137b30a',
  'deployment/calendar/check-gathio-native.mjs': '33c1fd8379b34e67585eaf5c9b24459f6b8c1a6fc83907a1e1e79fd22fed889e',
  'deployment/calendar/check-gathio-flows.mjs': 'b8f643158bd50ebe20189bee6515935f2a3044e41c235d188efdbec1b8c3fcac',
};
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const [file, expected] of Object.entries(fixtures)) assert.equal(sha(file), expected);
const rows = [];
for (const [label, image] of [['baseline', inputs.spec.base], ['candidate', built.imageId]]) {
  const free = fs.statfsSync('/'); assert(free.bavail * free.bsize > 8.3 * 1024 ** 3);
  const output = root + '/native-' + label;
  fs.mkdirSync(output, {mode: 0o700});
  let code = fs.readFileSync('deployment/maintenance/go-closure/check-ferretdb.mjs', 'utf8');
  const replace = (from, to) => {
    assert.equal(code.split(from).length, 2, 'Reviewed fixture drift'); code = code.replace(from, to);
  };
  replace("const root=codec?'/var/lib/utilibre-maintenance/security-20261028/codec/ferretdb':oct28?'/var/lib/utilibre-maintenance/security-20261028/go-closure/ferretdb':gathioUpdate?'/var/lib/utilibre-maintenance/security-20261022/gathio':'/var/lib/utilibre-maintenance/go-closure-20261012/ferretdb';", 'const root=' + JSON.stringify(output) + ';');
  replace("prefix='maintenance-ferret-closure'", "prefix='maintenance-gathio-mongoose-20261112'");
  replace("const image=codec?'utilibre-ferretdb:codec-security-20261028':oct28?'utilibre-ferretdb:go-security-20261028':gathioUpdate?imageOf('utilibre-gathio-ferretdb-1'):'utilibre-ferretdb:2.7.0-mcp-closure-20261012';", 'const image=' + JSON.stringify(inputs.databaseImages.ferretdb) + ';');
  replace("const pgImage=imageOf('utilibre-gathio-postgres-1'),appImage=gathioUpdate?'utilibre-gathio:1.6.7-dom-toml-security-20261022':imageOf('utilibre-gathio-gathio-1');", 'const pgImage=' + JSON.stringify(inputs.databaseImages.postgres) + ',appImage=' + JSON.stringify(image) + ';');
  replace("'--cpus','1'", "'--cpus','0.5'");
  // Keep the same stopped-copy restore and real native routes; no adversarial probes.
  const runner = output + '/fixture.mjs'; fs.writeFileSync(runner, code);
  const result = cp.spawnSync(process.execPath, [runner, '--gathio-oct22'], {
    encoding: 'utf8', timeout: 420000, maxBuffer: 4 * 1024 ** 2,
    env: {PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C.UTF-8'},
  });
  fs.writeFileSync(output + '/runner.log', String(result.stdout || '') + String(result.stderr || result.error || ''));
  assert.equal(result.status, 0, 'Native workflow failed; private bounded fixture evidence retained');
  const proof = JSON.parse(fs.readFileSync(output + '/native.json'));
  assert.equal(proof.imageId, image);
  for (const field of ['passed', 'nativeGathioCreateEdit', 'invalidEditTokenDenied', 'imageUpload', 'icsImportExport', 'stoppedDatabaseCopyRestore', 'reopenedOriginalAndImportedEvents']) assert.equal(proof[field], true);
  assert.equal(proof.productionChanged, false);
  rows.push({...proof, label, fixtureSha256: sha(runner)});
  // Only this completed fixture's synthetic DB/files are removed, no backups.
  for (const entry of fs.readdirSync(output, {withFileTypes: true})) {
    if (entry.isDirectory() && /^native-/.test(entry.name)) fs.rmSync(output + '/' + entry.name, {recursive: true});
  }
}
const result = {date: new Date().toISOString(), passed: true, base: inputs.spec.base,
  imageId: built.imageId, rows, fixtures, databaseImages: inputs.databaseImages,
  network: 'none; shared loopback namespace with synthetic database only',
  productionChanged: false, vulnerabilityReproductions: 0,
  limits: {totalCpu: 1.5, totalContainerMemoryMiB: 2304, pidsPerContainer: 128},
  limitation: 'Ordinary application and isolated restore compatibility; no exploitability claim or production data used.'};
fs.writeFileSync(root + '/native.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({passed: true, imagesTested: rows.length, imageId: built.imageId, productionChanged: false}));
