import assert from 'node:assert/strict';
// Normalize only the image identity in Trivy's OS target label and the one
// explicitly changed package version. Retain every CVE, severity and file path.
export function comparisonKey(f,image){
 const target=f.type==='debian'&&f.target.startsWith(image+' (debian ')?f.target.slice(image.length):f.target;
 return JSON.stringify({...f,target,installed:f.package==='libmongocrypt0'?'reviewed-library-version':f.installed});
}
export function proveMongocrypt(n,stage,g,spec){
 assert.equal(n.status,'passed');assert.equal(n.version,spec.version);assert.equal(n.unitCases,330);assert.equal(n.baselineFailures,2);assert(n.abiUnchanged);
 assert.equal(n.abiExports,980);assert.equal(stage.status,'passed');assert.equal(stage.base,spec.base);assert.equal(stage.candidate,spec.candidate);
 assert(stage.priorRuntimeBytesUnchanged&&stage.unrelatedPackagesUnchanged&&stage.configurationUnchanged);
 assert.equal(g.status,'passed');assert.equal(g.image,stage.image);assert.equal(g.base,spec.base);assert.equal(g.newHighCritical,0);assert(g.primarySourceFixVerified);
}
