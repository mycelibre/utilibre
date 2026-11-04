import assert from 'node:assert/strict';
export const advisories=['CVE-2026-109089','CVE-2026-109090'];
export function proveXi(inputs,s,b,c,a){
 assert.equal(inputs.package,'libxi6');assert.deepEqual(inputs.advisories,advisories);
 assert.equal(s.version,'2:1.8.4-1');assert.equal(b.version,s.version);
 assert.equal(b.base,s.base);assert.equal(b.pin.sha256,inputs.packages.trixie.sha256);
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);
 assert(c.passed&&c.imageId===b.imageId&&c.base===s.base&&c.abiPreserved&&c.neededPreserved);
 assert.deepEqual(c.nativeRows,b.nativeRows);assert.equal(c.nativeRows.length,2);
 assert.deepEqual(c.nativeRows.map(r=>r.imageId),[s.base,b.imageId]);
 assert(c.nativeRows.every(r=>r.passed&&r.checks===14));
 assert.equal(c.abi[1].sha256,inputs.librarySha256);
 assert.equal(c.nativeRows[1].librarySha256,inputs.librarySha256);
 assert(a.passed&&a.imageId===b.imageId&&a.base===s.base&&a.systemAndPrivateRasterParity&&a.codecSetPreserved);
 if(s.key.endsWith('-backend'))assert(a.font.fontforgeTtfOtf&&a.font.woffRoundtrip&&a.font.woff2Roundtrip);
}
export function xiComparison(v){return JSON.stringify(v.package==='libxi6'&&advisories.includes(v.id)?{...v,installed:'authenticated-libxi-1.8.4'}:v);}
