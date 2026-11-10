import test from 'node:test';
import assert from 'node:assert/strict';
import {proveRsync,rsyncComparison} from './rsync-policy.mjs';
import {selectBatch} from '../security-20261103/batch.mjs';
test('rsync needs collision regression, working transfers and database recovery',()=>{
 const input={package:{sha256:'pkg'},fixtureSha256:'fixture'},s={key:'rsync-gathio-postgres',base:'old',candidate:'tag'};
 const b={...s,imageId:'new',version:'3.5.2+ds1-2~deb12u1+utilibre1',passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true,packageSha256:'pkg',applicationSha256:'a'.repeat(64),librariesSha256:'b'.repeat(64)};
 const n={imageId:'new',passed:true,nativeLocalIncrementalAndSafeLinks:true,nativeLoopbackDaemonReadOnly:true,collisionBaselineReproduced:true,collisionCandidatePassed:true,fixtureSha256:'fixture',upstreamPassed:286,upstreamSkipped:90};
 const d={imageId:'new',passed:true,nativeDumpRestore:true,documentdbTypedDataAndRoleIsolation:true,nativePostgresXml:true,postgisGml:true,gdal:true};
 assert(proveRsync(input,s,b,n,d));
 for(const delta of [{imageId:'other'},{collisionBaselineReproduced:false},{collisionCandidatePassed:false},{fixtureSha256:'other'},{nativeLocalIncrementalAndSafeLinks:false},{upstreamPassed:0}])assert.throws(()=>proveRsync(input,s,b,{...n,...delta},d));
 for(const delta of [{imageId:'other'},{nativeDumpRestore:false},{documentdbTypedDataAndRoleIsolation:false}])assert.throws(()=>proveRsync(input,s,b,n,{...d,...delta}));
 for(const delta of [{base:'wrong'},{version:'latest'},{packageSha256:'wrong'},{librariesSha256:''},{unrelatedPackagesUnchanged:false}])assert.throws(()=>proveRsync(input,s,{...b,...delta},n,d));
});
test('same-advisory comparison retains new IDs, severity, target and other packages',()=>{
 const v={id:'CVE-example',package:'rsync',installed:'old',severity:'HIGH',target:'debian'};
 assert.equal(rsyncComparison(v),rsyncComparison({...v,installed:'native-new'}));
 for(const delta of [{id:'new'},{severity:'CRITICAL'},{target:'other'},{package:'other'}])assert.notEqual(rsyncComparison(v),rsyncComparison({...v,...delta}));
});
test('rsync profile is isolated from historic releases and other overlays',()=>{
 const b=selectBatch(['--batch-20261109','--rsync']);assert(b.input('rsync').pathname.endsWith('security-20261109/rsync-followup-inputs.json'));
 assert.throws(()=>selectBatch(['--batch-20261109','--rsync','--sqlite-followup']));
 assert.throws(()=>selectBatch(['--batch-20261103','--rsync']));
});
