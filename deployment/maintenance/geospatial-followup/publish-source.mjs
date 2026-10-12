// Additive complete corresponding source, only for a passed native release.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const kind = process.argv[2];
assert(process.argv.length === 3 && ['postgis', 'gdal'].includes(kind));
const root = '/var/lib/utilibre-maintenance/geospatial-followup-20261012';
const here = new URL('.', import.meta.url).pathname;
const prefix = kind === 'gdal' ? 'gdal-' : '';
const read = p => JSON.parse(fs.readFileSync(p));
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const release = read(root + '/' + prefix + 'release.json');
const candidate = read(root + '/' + prefix + 'candidate.json');
const checks = read(root + '/' + prefix + 'checks.json');
assert.equal(release.status, 'passed');
assert.equal(checks.status, 'passed');
assert.equal(checks.image, candidate.image);
assert.equal(sha(root + '/' + (prefix || '') + 'source/authenticated.json'), candidate.sourceReceiptSha256);
assert.equal(sha(root + '/' + (prefix || '') + 'source/applied-provenance.json'), candidate.patchReceiptSha256);
const out = root + '/' + prefix + 'out';
const filename = `security-${kind}-native-20261012-source.tar.gz`;
const archive = root + '/' + filename;
assert(!fs.existsSync(archive), 'Preserve the previous published offer');
const temp = fs.mkdtempSync(root + '/source-offer-');
const files = [];
const copy = (from, to) => {
  assert(!to.split('/').includes('..'));
  const dest = temp + '/' + to;
  fs.mkdirSync(path.dirname(dest), {recursive:true});
  fs.copyFileSync(from, dest);
  files.push({path:to, sha256:sha(dest)});
};
try {
  const sources = fs.readdirSync(out).filter(f => /\.(?:dsc|tar\.xz|buildinfo|patch)$/.test(f) || f === 'builder-packages.tsv');
  assert.equal(sources.filter(f => f.endsWith('.dsc')).length, 1);
  assert.equal(sources.filter(f => f.endsWith('.tar.xz')).length, 2);
  for (const f of sources) copy(out + '/' + f, 'native/' + f);
  for (const f of fs.readdirSync(here)) if (fs.statSync(here + f).isFile()) copy(here + f, 'recipes/maintenance/geospatial-followup/' + f);
  for (const f of ['language-final/release.mjs', 'go-final/release.mjs', 'followup-overlays.mjs', 'review-native-backports.mjs', 'triage.mjs']) copy(here + '../' + f, 'recipes/maintenance/' + f);
  fs.writeFileSync(temp + '/SHA256SUMS', files.map(f => f.sha256 + '  ' + f.path).join('\n') + '\n');
  fs.writeFileSync(temp + '/SOURCES.json', JSON.stringify({kind, date:new Date().toISOString(), files, reproduction:'Extract the native modified dsc alongside its included original tarball and Debian packaging. Preserved upstream licenses and all applied changes are inside these complete sources. Build dependencies are recorded in builder-packages.tsv; use the native compile recipe. The shared recipe directory also describes a separate geospatial follow-up, whose inclusion is not a claim that it is deployed. No credentials, private logs, configuration or user data are included.'}, null, 2) + '\n');
  cp.execFileSync('tar', ['-czf', archive, '-C', temp, '.'], {timeout:120000});
  const proof = {date:new Date().toISOString(), filename, bytes:fs.statSync(archive).size, sha256:sha(archive), published:true};
  for (const base of ['/opt/utilibre/toolbox-public', '/opt/utilibre/records/public']) {
    const dest = base + '/' + filename;
    assert(!fs.existsSync(dest));
    fs.copyFileSync(archive, dest + '.tmp');
    fs.chmodSync(dest + '.tmp', 0o644);
    fs.renameSync(dest + '.tmp', dest);
  }
  fs.writeFileSync(root + '/' + prefix + 'source-offer.json', JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify(proof));
} finally {
  assert(path.dirname(temp) === root && path.basename(temp).startsWith('source-offer-'));
  fs.rmSync(temp, {recursive:true});
}
