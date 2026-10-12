#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
process.umask(0o077);
const s = JSON.parse(readFileSync(new URL('spec.json', import.meta.url))), w = s.work;
const source = JSON.parse(readFileSync(new URL('gdal-source.json', import.meta.url)));
const sha = data => createHash('sha256').update(data).digest('hex');
for (const folder of ['gdal-source', 'gdal-fixtures']) mkdirSync(w + '/' + folder, { recursive: true, mode: 0o700 });
async function acquire(url, path, expected) {
  if (!existsSync(path)) { const r = await fetch(url, { signal: AbortSignal.timeout(60000) }); assert(r.ok); const data = Buffer.from(await r.arrayBuffer()); assert.equal(sha(data), expected); writeFileSync(path, data); }
  assert.equal(sha(readFileSync(path)), expected, 'Pinned artifact changed: ' + path);
}
for (const [file, hash] of Object.entries(source.sourceFiles)) await acquire(source.sourceBase + file, w + '/gdal-source/' + file, hash);
const signature = execFileSync('docker', ['exec', 'maintenance-postgis-native-20261012', 'gpgv', '--status-fd', '1', '--keyring', '/usr/share/keyrings/debian-keyring.gpg', '/work/gdal-source/gdal_3.6.2+dfsg-1.dsc'], { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
assert(signature.includes('[GNUPG:] VALIDSIG ' + source.sourceSigner + ' '));
const dsc = readFileSync(w + '/gdal-source/gdal_3.6.2+dfsg-1.dsc', 'utf8');
for (const [file, hash] of Object.entries(source.sourceFiles).filter(([file]) => !file.endsWith('.dsc'))) assert(dsc.includes(hash) && dsc.includes(file));
for (const f of source.fixtureFiles) {
  await acquire(`https://raw.githubusercontent.com/OSGeo/gdal/${f.commit}/autotest/gcore/data/hdf4/${f.file}`, w + '/gdal-fixtures/' + f.file, f.sha256);
  const data = readFileSync(w + '/gdal-fixtures/' + f.file);
  assert.equal(createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex'), f.gitBlob);
}
writeFileSync(w + '/gdal-source/authenticated.json', JSON.stringify({ date: new Date().toISOString(), ...source, signature, mechanism: 'Debian-maintainer signed DSC checked against the Debian archive-supplied keyring; all source archive hashes pinned. Upstream HDF fixtures match both SHA256 and the Git blob named by the original repair patch.' }, null, 2) + '\n');
console.log('Pinned GDAL source signature, archive checksums, and exact upstream fixture provenance verified.');
