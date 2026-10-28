import test from 'node:test';import assert from 'node:assert/strict';
import {unchangedPackages,proveTrust} from './trust-policy.mjs';
const old='P:example\nV:1-r0\nD:\np:\nk:0\nC:Q1hash\nF:etc\nR:example\na:0:0:0644\nZ:Q1file';
const next='C:Q1hash\nP:example\nV:1-r0\nF:etc\nR:example\na:0:0:644\nZ:Q1file';
test('accept only APK serialization differences',()=>unchangedPackages({example:old},{example:next}));
for(const [label,value]of [['version',next.replace('1-r0','2-r0')],['package checksum',next.replace('Q1hash','Q1different')],['file checksum',next.replace('Q1file','Q1different')],['mode',next.replace(':644',':777')],['dependency',next.replace('F:etc','D:extra\nF:etc')]])test('reject changed '+label,()=>assert.throws(()=>unchangedPackages({example:old},{example:value})));
test('reject extra packages',()=>assert.throws(()=>unchangedPackages({example:old},{example:next,extra:next})));
function proof(){
 const s={key:'anubis',base:'old'},inputs={version:'20261020-r0',bundleSha256:'bundle',compiler:'compiler'};
 const changedFiles=['/etc/apk/world','/etc/ssl/certs/ca-certificates.crt','/lib/apk/db/installed','/var/lib/db/sbom/ca-certificates-bundle-20261020-r0.spdx.json'];
 const b={passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true,signedIndexVerified:true,nativeApkInstall:true,base:'old',imageId:'new',version:inputs.version,bundleSha256:'bundle',changedFiles};
 const n={passed:true,imageId:'new',fixture:{sourceSha256:'fixture',compiler:'compiler'},rows:['old','new'].map((imageId,i)=>({imageId,passed:true,ordinaryTrustedRootPassed:true,reviewedRemovedRoots:3,network:false,removedRootsStillPresent:i?0:3}))};
 const v={passed:true,imageId:'new',changedPaths:changedFiles.map(p=>p==='/lib/apk/db/installed'?'/usr/lib/apk/db/installed':p).sort()};
 const a={passed:true,imageId:'new',nativeAllowAndDeny:true,twoIndependentBrowserPowChallenges:true,authenticatedReload:true,externalBrowserCalls:0};
 return [s,b,n,v,a,{...a,imageId:'old'},inputs,'fixture'];
}
test('exact trust and application evidence passes',()=>proveTrust(...proof()));
for(const [label,mutate]of [
 ['unverified signature',p=>p[1].signedIndexVerified=false],
 ['remaining obsolete roots',p=>p[2].rows[1].removedRootsStillPresent=3],
 ['broken normal trust',p=>p[2].rows[1].ordinaryTrustedRootPassed=false],
 ['different fixture',p=>p[2].fixture.sourceSha256='other'],
 ['extra changed file',p=>p[3].changedPaths.push('/app')],
 ['wrong application artifact',p=>p[4].imageId='unrelated'],
 ['failed challenge',p=>p[4].twoIndependentBrowserPowChallenges=false],
 ['external browser request',p=>p[4].externalBrowserCalls=1],
 ['missing baseline',p=>p[5].passed=false],
])test('reject '+label,()=>{const p=proof();mutate(p);assert.throws(()=>proveTrust(...p));});
