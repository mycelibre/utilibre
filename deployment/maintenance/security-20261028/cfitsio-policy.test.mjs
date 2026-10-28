import test from 'node:test';import assert from 'node:assert/strict';
import {proveCfitsio} from './cfitsio-policy.mjs';
function fixture(){
 const inputs={library:'/usr/lib/x86_64-linux-gnu/libcfitsio.so.10.4.2.0',librarySha256:'library',fixtureSha256:'fixture',sourceFixtureSha256:'source-fixture'},source={patchSha256:'patch'},s={base:'old',candidate:'candidate'};
 const normal={passed:true,normalChecks:8,gdalFitsConsumer:true,fixedWidthBoundaryAccepted:28799};
 const b={passed:true,configurationUnchanged:true,packageMetadataPreserved:true,base:'old',candidate:'candidate',imageId:'new',librarySha256:'library',fixtureSha256:'fixture',source,abiSymbols:1808,changedFiles:[inputs.library],native:{passed:true,network:false,syntheticFilesOnly:true,rows:[{imageId:'old',normal,regression:{passed:false,oversizedRejected:false,exitCode:139}},{imageId:'new',normal,regression:{passed:true,oversizedRejected:true,status:108}}]}};
 const v={passed:true,imageId:'new',changedPaths:[inputs.library]},a={passed:true,imageId:'new',network:'none',fictionalDataOnly:true,nativeTypedDataAndIsolation:true,logicalRestore:true};
 const replay={prepared:true,network:false,productionChanged:false,source,nativeFixtureSourceSha256:'source-fixture',librarySha256:'library',libraryBytesIdentical:true};
 const limitation={unresolved:true,notIntroducedByPatch:true,network:false,rows:['old','new'].map(imageId=>({imageId,passed:false,exit:139,stderr:'Fictional string mismatch: requested=16384 returned=5752\n'}))};
 return [inputs,source,s,b,v,a,replay,limitation];
}
test('accepts the finite bounds repair with retained unresolved baseline evidence',()=>assert.doesNotThrow(()=>proveCfitsio(...fixture())));
for(const [name,change]of [
 ['unsupported revision',x=>x[3].base='other'],
 ['unrelated file modification',x=>x[4].changedPaths.push('/etc/setting')],
 ['wrong output bytes',x=>x[3].librarySha256='other'],
 ['changed patch',x=>x[3].source={patchSha256:'other'}],
 ['lost ABI',x=>x[3].abiSymbols=1807],
 ['missing legitimate consumer check',x=>x[3].native.rows[1].normal.gdalFitsConsumer=false],
 ['unfixed overflow',x=>x[3].native.rows[1].regression.oversizedRejected=false],
 ['wrong rejection status',x=>x[3].native.rows[1].regression.status=1],
 ['different tested image',x=>x[5].imageId='other'],
 ['no synthetic restore',x=>x[5].logicalRestore=false],
 ['networked replay',x=>x[6].network=true],
 ['different rebuilt library',x=>x[6].librarySha256='other'],
 ['hidden pre-existing limitation',x=>x[7].unresolved=false],
 ['new behavior regression',x=>x[7].rows[1].stderr='different failure'],
])test('rejects '+name,()=>{const x=fixture();change(x);assert.throws(()=>proveCfitsio(...x));});
