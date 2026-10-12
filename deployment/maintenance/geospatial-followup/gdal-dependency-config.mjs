#!/usr/bin/env node
// Match the installed Debian binary's optional dependency boundary exactly.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const s = JSON.parse(readFileSync(new URL('spec.json', import.meta.url))), w = s.work;
const path = w + '/gdal-tree/debian/rules', original = readFileSync(path, 'utf8');
assert(!original.includes('-DGDAL_USE_SFCGAL='), 'Already configured; do not blindly apply twice');
const marker = '\t\t\t-DGDAL_USE_SPATIALITE=ON \\\n';
assert.equal(original.split(marker).length, 2);
const result = original.replace(marker, '\t\t\t-DGDAL_USE_SFCGAL=OFF \\\n' + marker);
writeFileSync(path, result);
writeFileSync(w + '/gdal-source/dependency-config.json', JSON.stringify({ date: new Date().toISOString(), originalRulesSha256: createHash('sha256').update(original).digest('hex'), rulesSha256: createHash('sha256').update(result).digest('hex'), changes: ['Install libcurl4-gnutls-dev in disposable builder so curl retains the original libcurl-gnutls.so.4 boundary.', 'Explicit GDAL_USE_SFCGAL=OFF preserves the installed native binary, which has no SFCGAL dependency; the shared PostGIS builder otherwise auto-detects this new optional capability. No existing GDAL drivers disabled.'], justification: 'Initial candidate was rejected before release by exact NEEDED comparison. Correct the build environment; do not waive dependency drift.' }, null, 2) + '\n');
console.log('Native optional-library boundary explicitly preserved.');
