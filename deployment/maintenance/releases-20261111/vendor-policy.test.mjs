import test from 'node:test';
import assert from 'node:assert/strict';
import {proveVendor} from './vendor-policy.mjs';
import {selectBatch} from '../security-20261103/batch.mjs';

const now = Date.parse('2026-11-11T15:00:00Z');
function fixture() {
 const base='sha256:'+'a'.repeat(64), imageId='sha256:'+'b'.repeat(64);
 const pin={version:'1.1.43-r4'};
 const inputs={schemaVersion:1,packages:{'3.24/libxslt':pin},nativeFixture:{binaries:{'xslt-native':'pinned'}},databaseSha256:'db',baselineScanSha256:'baseline',maximumDatabaseAgeHours:48};
 const s={key:'example',base,candidate:'finite:example',approval:'preparation-only',releaseApproval:'approved',packages:{libxslt:'1.1.43-r3'},branch:'3.24',consumerProfile:'nginx-runtime',advisories:['CVE-example']};
 const common={passed:true,base,imageId};
 const nativeRows=[base,imageId].map(imageId=>({imageId,passed:true,results:{'xslt-native':'XSLT_NATIVE_PASSED parse-transform-sort-parameter-utf8-serialize'}}));
 const b={...common,candidate:s.candidate,configurationUnchanged:true,unrelatedPackagesUnchanged:true,applicationBytesUnchanged:true,pins:[pin],nativeFixture:inputs.nativeFixture,nativeRows};
 const scope={...common,packages:['libxslt'],allUnrelatedImageFilesUnchanged:true,unrelatedApkRecordsUnchanged:true,muslUnchanged:true,abi:[{preserved:true,baselineSymbols:100}]};
 const consumer={...common,profile:'nginx-runtime',nativeRows,rows:[base,imageId].map(imageId=>({imageId,passed:true,checks:9,rootSha256:'same-content'}))};
 const scan={...common,nativeApkInventoryComplete:true,targetedFindingRemoved:true,newHighCritical:0,databaseSha256:'db',baselineScanSha256:'baseline',baselineTargets:[{id:'CVE-example'}],advisoryUpdatedAt:'2026-11-10T19:00:00Z'};
 return [inputs,s,b,scope,consumer,scan];
}
test('finite compatible candidate passes; stable repeated decision',()=>{
 const f=fixture();proveVendor(...f,now);proveVendor(...f,now);
});
const rejects={
 'missing approval':f=>{f[1].releaseApproval='pending';},
 'unsupported version':f=>{f[1].packages.libxslt='1.1.42-r0';},
 'changed image':f=>{f[4].imageId='sha256:'+'c'.repeat(64);},
 'unrelated change':f=>{f[3].allUnrelatedImageFilesUnchanged=false;},
 'ABI loss':f=>{f[3].abi[0].preserved=false;},
 'consumer fails':f=>{f[4].passed=false;},
 'missing native check':f=>{f[2].nativeRows[1].results={};},
 'different response':f=>{f[4].rows[1].rootSha256='changed';},
 'scanner failure':f=>{f[5].passed=false;},
 'incomplete extraction':f=>{f[5].nativeApkInventoryComplete=false;},
 'new finding':f=>{f[5].newHighCritical=1;},
 'unfixed target':f=>{f[5].targetedFindingRemoved=false;},
 'stale advisory data':f=>{f[5].advisoryUpdatedAt='2026-11-08T00:00:00Z';},
 'changed snapshot':f=>{f[5].databaseSha256='different';},
 'wrong target coverage':f=>{f[5].baselineTargets=[];},
 'unverified profile':f=>{f[1].consumerProfile='arbitrary';},
 'unexpected extra package':f=>{f[1].packages.unreviewed='1';f[3].packages=['libxslt','unreviewed'];},
 'unsupported Alpine branch':f=>{f[1].branch='edge';},
};
for(const [name,mutate] of Object.entries(rejects))test(name,()=>{const f=fixture();mutate(f);assert.throws(()=>proveVendor(...f,now));});
test('explicit batch selector rejects mixed or unknown profiles',()=>{
 assert.equal(selectBatch(['--batch-20261111','--vendor-libs-20261111','prepare','example']).root,'/var/lib/utilibre-maintenance');
 for(const args of [['--batch-20261111'],['--batch-20261111','--vendor-libs-20261111','--musl'],['--batch-20261111','--vendor-libs-20261111','--batch-20261109']])assert.throws(()=>selectBatch(args));
});
