import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewedRepair, excludedDocumentation } from './review-policy.mjs';
const base = { scope: 'runtime-image', type: 'debian', status: 'needs-review', containers: ['utilibre-gathio-postgres-1'], package: 'libgdal32', installed: '3.6.2+dfsg-1+utilibre1', id: 'CVE-2026-8086' };
test('only three repaired native GDAL findings in the exact intended role qualify', () => {
  for (const id of ['CVE-2026-49014', 'CVE-2026-8086', 'CVE-2026-8087']) assert.equal(reviewedRepair({ ...base, id })?.kind, 'gdal');
  for (const extra of [{ id: 'CVE-2026-unknown' }, { package: 'gdal-data' }, { installed: '3.6.2+dfsg-1+b2' }, { containers: ['unrelated'] }, { containers: [] }, { containers: ['utilibre-gathio-postgres-1', 'another'] }, { type: 'npm' }, { status: 'mitigated' }, { scope: 'host-os' }]) assert.equal(reviewedRepair({ ...base, ...extra }), null);
});
test('PostGIS repair does not bless source siblings or future CVEs', () => {
  const p = { ...base, package: 'postgresql-17-postgis-3', installed: '3.6.0+dfsg-3.pgdg12+1+utilibre1', id: 'CVE-2026-73515' };
  assert.equal(reviewedRepair(p)?.kind, 'postgis');
  assert.equal(reviewedRepair({ ...p, package: 'postgresql-17-postgis-3-scripts' }), null);
  assert.equal(reviewedRepair({ ...p, id: 'CVE-2026-8086' }), null);
});
test('only exact configured non-runtime exclusions qualify; copyright and runtime stay required', () => {
  const cfg = 'path-exclude /usr/share/doc/*\npath-include /usr/share/doc/*/copyright\npath-exclude /usr/share/lintian/overrides/*';
  assert(excludedDocumentation('/usr/share/doc/libgdal32/changelog.gz', 'libgdal32', cfg));
  assert(excludedDocumentation('/usr/share/lintian/overrides/libgdal32', 'libgdal32', cfg));
  for (const path of ['/usr/lib/libgdal.so.32', '/usr/share/doc/libgdal32/copyright', '/usr/share/doc/another/changelog.gz', '/usr/share/lintian/overrides/another']) assert(!excludedDocumentation(path, 'libgdal32', cfg));
  assert(!excludedDocumentation('/usr/share/doc/libgdal32/changelog.gz', 'libgdal32', ''));
});
