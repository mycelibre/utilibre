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
// A later release may retain the repaired library. This proves only the chain;
// the caller must still compare the current package and actual library bytes.
export function proveHeifLineage(original,current,target,rows,releasedAt,scanAt){
 const digest=/^sha256:[a-f0-9]{64}$/;assert(digest.test(original)&&digest.test(current));
 let image=original,after=Date.parse(releasedAt);const end=Date.parse(scanAt),chain=[];
 assert(Number.isFinite(after)&&Number.isFinite(end)&&after<=end);
 const seen=new Set([original]);
 while(image!==current){
  const matches=rows.filter(r=>r.name===target&&r.oldImage===image&&r.newImage!==image);
  assert.equal(matches.length,1,'Missing or ambiguous completed descendant');
  const row=matches[0],at=Date.parse(row.completedAt);
  assert(digest.test(row.newImage)&&Number.isFinite(at)&&at>=after&&at<=end);
  assert(!seen.has(row.newImage),'Cyclic release chain');seen.add(row.newImage);
  chain.push(row);image=row.newImage;after=at;
 }
 return chain;
}
