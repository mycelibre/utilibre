#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
process.umask(0o077);
const s = JSON.parse(readFileSync(new URL('spec.json', import.meta.url)));
const dir = s.work + '/source'; mkdirSync(dir, { recursive: true, mode: 0o700 });
const sha = b => createHash('sha256').update(b).digest('hex');
async function get(url, name, expected) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60000) }); assert(r.ok, `${url}: ${r.status}`);
  const bytes = Buffer.from(await r.arrayBuffer()); assert(bytes.length <= 12 * 1024 ** 2, 'Unexpected artifact size');
  if (expected) assert.equal(sha(bytes), expected, `Changed pinned artifact ${name}`);
  writeFileSync(dir + '/' + name, bytes);
}
// The unsigned DSC is subsequently authenticated against the signed repository
// Release → Sources chain. Its digest is also fixed here for repeatability.
await get(s.sourceOrigin + `dists/${s.sourceDistribution}/InRelease`, 'InRelease');
await get(s.sourceOrigin + `dists/${s.sourceDistribution}/main/source/Sources.bz2`, 'Sources.bz2');
for (const [file, digest] of [
  ['postgis_3.6.0+dfsg-3.pgdg12+1.dsc', 'b905f3fbd6ae49b0fca645ee96897d6b51507a847c602686659de1c1b11930b6'],
  ['postgis_3.6.0+dfsg-3.pgdg12+1.debian.tar.xz', 'a23e26775a9ecc6094aabcb1c1e0a2e4538533cecac373c327c60b25ee4c9855'],
  ['postgis_3.6.0+dfsg.orig.tar.xz', 'f5a5a474853b978f546cde6d7f0e3f90e4cb02d9f5be4ccf0afb90ddd95fde91'],
]) await get(s.sourceOrigin + 'pool/main/p/postgis/' + encodeURIComponent(file), file, digest);
await get(s.patchUrl, 'upstream.patch', s.patchSha256);
for (const [commit, digest] of s.prerequisites) await get(`https://github.com/postgis/postgis/commit/${commit}.patch`, commit + '.patch', digest);
console.log('Pinned public artifacts acquired; signature authentication still required before extraction.');
