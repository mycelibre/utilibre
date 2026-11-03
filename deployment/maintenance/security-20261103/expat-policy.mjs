import assert from 'node:assert/strict';
export const advisories=['CVE-2026-117610','CVE-2026-118370'];
// Receipt lineage permits a fresh payload check; it never replaces that check.
export function expatDescendant(name,imageId,releasedAt,scanAt,rows){
 let completed=Date.parse(releasedAt),image=imageId;
 const scan=Date.parse(scanAt),seen=new Set([image]);
 assert(Number.isFinite(completed)&&Number.isFinite(scan)&&completed<=scan);
 for(;;){
  const next=rows.filter(r=>r.name===name&&r.oldImage===image&&r.newImage!==image&&Date.parse(r.completedAt)>=completed);
  assert(next.length<=1,'Ambiguous release lineage');
  if(!next.length)return image;
  const r=next[0],date=Date.parse(r.completedAt);
  assert(date<=scan,'Scan precedes completed overlay');
  assert(r.newImage&&!seen.has(r.newImage),'Invalid or cyclic release lineage');
  seen.add(r.newImage);image=r.newImage;completed=date;
 }
}
// Debian's stable advisory feed has no fixed version for the separately verified
// 2.10.0 package. Keep those raw records; do not mistake a version match for code.
export function proveExpat(inputs,s,b,c){
 assert.deepEqual(inputs.advisories,advisories);
 assert(['2.10.0-1','2.10.0-1~deb12u1+utilibre1'].includes(s.version));
 assert.equal(b.version,s.version);assert.equal(b.pin.sha256,inputs.packages[s.suite].sha256);
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);
 assert(c.passed&&c.imageId===b.imageId&&c.base===b.base&&c.abiPreserved&&c.neededPreserved);
 assert(c.nativeRows.length===2&&c.nativeRows.every(r=>r.passed&&r.checks===5));
 assert(c.nativeRows[1].subparser==='completed');
 assert(c.wideRows.length===2&&c.wideRows.every(r=>r.passed&&r.checks===3));
 for(const library of ['libexpat','libexpatw']){
  const row=c.abi.find(a=>a.imageId===b.imageId&&a.library===library);
  assert(row&&row.sha256===(inputs.librariesBySuite?.[s.suite]||inputs.libraries)[library+'.so.1']);
 }
 if(s.bundledLibrary)assert(c.abi.some(a=>a.imageId===b.imageId&&a.library==='bundled-expat'&&a.sha256===s.bundledLibrary.afterSha256));
}
export function expatComparison(v){
 return JSON.stringify(v.package==='libexpat1'&&advisories.includes(v.id)?{...v,installed:'separately-verified-expat-2.10-update'}:v);
}
