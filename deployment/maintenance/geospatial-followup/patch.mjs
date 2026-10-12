#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const spec = JSON.parse(readFileSync(new URL('spec.json', import.meta.url)));
const work = spec.work, tree = `${work}/source-tree`;
assert(JSON.parse(readFileSync(`${work}/source/authenticated.json`)).receipts.length === 3);
const patch = readFileSync(`${work}/source/upstream.patch`, 'utf8');
assert.equal(createHash('sha256').update(patch).digest('hex'), spec.patchSha256);
const parts = patch.split(/(?=^diff --git )/m);
const files = parts.slice(1).map(p => p.match(/^diff --git a\/(\S+) b\/\1\n/)?.[1]);
assert.deepEqual(files, ['NEWS', 'deps/flatgeobuf/flatgeobuf_c.cpp', 'deps/flatgeobuf/geometryreader.cpp', 'postgis/flatgeobuf.c', 'postgis/flatgeobuf.h', 'postgis/lwgeom_in_flatgeobuf.c', 'regress/core/flatgeobuf.sql', 'regress/core/flatgeobuf_expected']);
// Only the newer branch's NEWS hunk is omitted; all five native source files
// and both upstream regression files remain byte-for-byte upstream patch text.
const selected = parts.slice(2).join('');
const prereqs = spec.prerequisites;
const patchNames = [];
for (const [commit, expected] of prereqs) {
  const body = readFileSync(`${work}/source/${commit}.patch`, 'utf8');
  assert.equal(createHash('sha256').update(body).digest('hex'), expected);
  assert(body.startsWith(`From ${commit} `));
  // d317 includes unrelated PostgreSQL 19 compatibility edits. Keep only its
  // FlatGeobuf hunk, exactly as upstream. All other prerequisite patches are
  // entirely restricted to the seven reviewed FlatGeobuf files.
  const hunks = body.split(/(?=^diff --git )/m).slice(1);
  const accepted = commit === 'd3171abe3b30c898bd15e37b072fb34c3b6cc675'
    ? hunks.filter(x => x.startsWith('diff --git a/postgis/flatgeobuf.c ')) : hunks;
  assert(accepted.length > 0);
  for (const hunk of accepted) assert(files.slice(1).includes(hunk.match(/^diff --git a\/(\S+) b\/\1\n/)?.[1]));
  const name = `flatgeobuf-prerequisite-${commit.slice(0, 12)}.patch`;
  writeFileSync(`${tree}/debian/patches/${name}`, accepted.join(''));
  patchNames.push(name);
}
writeFileSync(`${tree}/debian/patches/CVE-2026-73515.patch`, selected);
patchNames.push('CVE-2026-73515.patch');
const series = readFileSync(`${tree}/debian/patches/series`, 'utf8');
assert(!series.includes('CVE-2026-73515'));
writeFileSync(`${tree}/debian/patches/series`, `${series.trimEnd()}\n${patchNames.join('\n')}\n`);
execFileSync('docker', ['exec', '-w', '/work/source-tree', 'maintenance-postgis-native-20261012', 'dpkg-source', '--before-build', '.'], { encoding: 'utf8' });
const finalFiles = [];
for (const file of files.slice(1)) {
  const r = await fetch(`https://raw.githubusercontent.com/postgis/postgis/53e273faeb440176eee83f76319b48afb0b86834/${file}`);
  assert(r.ok);
  const expected = Buffer.from(await r.arrayBuffer());
  assert.deepEqual(readFileSync(`${tree}/${file}`), expected, `Final file differs from exact upstream stable commit: ${file}`);
  finalFiles.push({ file, sha256: createHash('sha256').update(expected).digest('hex') });
}
writeFileSync(`${work}/source/applied-provenance.json`, JSON.stringify({ mainCommit: '53e273faeb440176eee83f76319b48afb0b86834', prerequisites: prereqs, finalFiles, omitted: 'NEWS and unrelated d317 PostgreSQL 19 edits only' }, null, 2) + '\n');
// Build exactly the installed PostgreSQL major, not every release in PGDG.
writeFileSync(`${tree}/debian/pgversions`, '17\n');
let control = readFileSync(`${tree}/debian/control.in`, 'utf8');
control = control.replace('architecture-is-64-bit <!pkg.postgresql.32-bit>,\n               ', '').replace('postgresql-all,', `postgresql-17 (= ${spec.postgresqlVersion}),`).replace('postgresql-server-dev-all,', `postgresql-server-dev-17 (= ${spec.postgresqlVersion}),`);
writeFileSync(`${tree}/debian/control.in`, control);
const change = `postgis (${spec.candidateVersion}) bookworm; urgency=high\n\n  * Backport upstream stable commit 53e273faeb440176eee83f76319b48afb0b86834\n    to validate FlatGeobuf input buffers (CVE-2026-73515).\n  * Build only native PostgreSQL 17 packages on amd64; no distro/ABI migration.\n\n -- Utilibre maintenance <admin@utilibre.org>  Mon, 12 Oct 2026 13:00:00 +0000\n\n`;
writeFileSync(`${tree}/debian/changelog`, change + readFileSync(`${tree}/debian/changelog`, 'utf8'));
console.log('Seven patched files match the exact upstream stable fix byte-for-byte; native PG17 packaging prepared.');
