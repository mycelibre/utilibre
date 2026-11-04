import assert from 'node:assert/strict';
export function proveNative(n,spec){
 assert.equal(n.status,'passed');assert.equal(n.version,spec.version);
 assert.equal(n.packageSha256,spec.packageSha256);assert.equal(n.isolatedBase,spec.base);
 assert.equal(n.upstream.programs,50);assert.equal(n.upstream.passed,38);
 assert.equal(n.upstream.skipped,12);assert.equal(n.upstream.failed,0);
 for(const name of ['overlay_amplification','transformation_amplification','alpha_composite_decode','parallel_grid_deadlock','sequence_stsc_lookup','mini_security_limits'])assert(n.upstream.passingNames.includes(name),name);
 assert(n.publicCExportsPreserved&&n.sonameNeededPreserved&&n.hevcAv1RgbaOldHeaderRoundtrips);
 assert(n.legacyMetadataPreserved&&n.rawDeflatePreserved&&n.corruptMetadataRejected&&n.metadataLimitsEnforced);
 assert.equal(n.patchSha256,spec.patch.sha256);assert.equal(n.priorFixesPreserved,5);
 assert.equal(n.network,'none');assert.equal(n.productionChanged,false);
}
export function comparisonKey(f,image){
 const target=f.type==='debian'&&f.target.startsWith(image+' (debian ')?f.target.slice(image.length):f.target;
 return JSON.stringify({...f,target,installed:f.package==='libheif1'?'reviewed-library-version':f.installed});
}
