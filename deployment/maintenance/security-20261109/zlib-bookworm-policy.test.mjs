import test from 'node:test';import assert from 'node:assert/strict';
import{zlibBookwormRelease,zlibBookwormComparison}from'./zlib-bookworm-policy.mjs';
const h=n=>String(n).repeat(64);
function fixture(){
 const inputs={sourceReceiptSha256:h(1),verification:{preparer:h(2),scopeChecker:h(3),exporter:h(4)},advisories:['CVE-2026-76844','CVE-2026-85091']};
 const s={base:'sha256:'+h(5),releaseApproval:'approved',dataMigration:false,releaseScope:'system-zlib-library-only'};
 const b={base:s.base,imageId:'sha256:'+h(6),scopeSha256:h(7)};
 const scan={passed:true,primarySourceFixVerified:true,newHighCritical:0,base:b.base,imageId:b.imageId,advisories:inputs.advisories};
 const scope={passed:true,allUnrelatedImageFilesUnchanged:true,unrelatedDpkgRecordsUnchanged:true,base:s.base,imageId:b.imageId,fixtureSha256:h(3),exporterSha256:h(4)};
 return [inputs,s,b,scan,scope,{source:h(1),preparer:h(2),scopeChecker:h(3),exporter:h(4),scope:h(7)}];
}
test('exact approved package candidate passes its independent release gate',()=>assert(zlibBookwormRelease(...fixture())));
for(const [name,mutate]of [
 ['unreviewed candidate',a=>a[1].releaseApproval='candidate'],
 ['migration',a=>a[1].dataMigration=true],
 ['different scope',a=>a[1].releaseScope='whole-image'],
 ['changed source receipt',a=>a[5].source=h(9)],
 ['changed preparation code',a=>a[5].preparer=h(9)],
 ['changed scope checker',a=>a[5].scopeChecker=h(9)],
 ['changed exporter',a=>a[5].exporter=h(9)],
 ['changed scope evidence',a=>a[5].scope=h(9)],
 ['unexpected application modification',a=>a[4].allUnrelatedImageFilesUnchanged=false],
 ['unrelated package modification',a=>a[4].unrelatedDpkgRecordsUnchanged=false],
 ['different baseline',a=>a[4].base='sha256:'+h(8)],
 ['different candidate',a=>a[3].imageId='sha256:'+h(8)],
 ['new high finding',a=>a[3].newHighCritical=1],
 ['failed scanner',a=>a[3].passed=false],
 ['version-only assertion',a=>a[3].primarySourceFixVerified=false],
 ['missing advisory',a=>a[3].advisories=[]],
])test('rejects '+name,()=>{const a=fixture();mutate(a);assert.throws(()=>zlibBookwormRelease(...a));});
test('comparison changes only the reviewed zlib version, retaining every finding',()=>{
 const a={id:'CVE-example',package:'zlib1g',installed:'old',severity:'HIGH',type:'debian',target:'debian'};
 assert.equal(zlibBookwormComparison(a),zlibBookwormComparison({...a,installed:'new'}));
 for(const change of [{id:'CVE-new'},{severity:'CRITICAL'},{target:'other'},{package:'other'},{type:'other'}])assert.notEqual(zlibBookwormComparison(a),zlibBookwormComparison({...a,...change}));
 const other={...a,package:'other'};assert.notEqual(zlibBookwormComparison(other),zlibBookwormComparison({...other,installed:'new'}));
});
