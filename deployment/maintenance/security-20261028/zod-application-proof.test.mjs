import test from 'node:test';
import assert from 'node:assert/strict';
import {zodApplicationProof,zodResumeNativeProof} from './zod-application-proof.mjs';
const fixture = key => ({passed:true, nativeStartup:true, imageId:'new',
  network:'none; disposable DB namespace where required', libraryGate:true,
  applicationParity:['old','new'].map(imageId => ({imageId, status:200,
    ...(key === 'candlr' ? {twoAccounts:true, privateRecordCreate:true,
      secondAccountDenied:true, loggedOutDenied:true, nativeExport:true, deletion:true} :
      {nativeMigrationTables:4, location:null})}))});
test('requires native account isolation/export or admin migration parity on the exact pair', () => {
  for (const key of ['candlr','admin']) assert(zodApplicationProof(key,'new',fixture(key),'old'));
});
test('rejects network-enabled, partial, wrong-image and changed native behavior receipts', () => {
  for (const change of [r=>r.passed=false, r=>r.nativeStartup=false,
    r=>r.network='bridge', r=>r.imageId='other', r=>r.libraryGate=false,
    r=>r.applicationParity[0].imageId='other', r=>r.applicationParity.pop(),
    r=>r.applicationParity[1].secondAccountDenied=false, r=>r.applicationParity[1].nativeExport=false]) {
    const r=fixture('candlr'); change(r);
    assert.throws(()=>zodApplicationProof('candlr','new',r,'old'));
  }
  const r=fixture('admin');r.applicationParity[1].nativeMigrationTables=5;
  assert.throws(()=>zodApplicationProof('admin','new',r,'old'));
});
test('Projects requires successful editing/deletion and access denial in both states', () => {
  const receipt={passed:true,nativeStartup:true,imageId:'new',network:'internal; disposable PostgreSQL',
    applicationParity:['old','new'].map(imageId=>({imageId,passed:true,freshDatabaseMigrations:true,
      nativeLoginAndProjectBoardCardEditDelete:true,anonymousApiDenied:true,
      adaptersResolveFixedLibrary:true,herokuExampleAbsent:true,externalNetworkAvailable:false,productionChanged:false}))};
  assert(zodApplicationProof('projects','new',receipt,'old'));
  for(const field of ['anonymousApiDenied','nativeLoginAndProjectBoardCardEditDelete','herokuExampleAbsent']){
    const broken=structuredClone(receipt);broken.applicationParity[1][field]=false;
    assert.throws(()=>zodApplicationProof('projects','new',broken,'old'));
  }
});
test('Resume requires both exact Zod copies, baseline work and candidate bounds',()=>{
 const spec={key:'resume',base:'old',before:{'/older':'4.1.11','/newer':'4.6.5'}};
 const hashes={'zod-native.cjs':'current-hash','zod-legacy-native.cjs':'older-hash'};
 const rows=['old','new'].flatMap(imageId=>Object.entries(spec.before).map(([path,version])=>{
   const legacy=imageId==='old'&&version==='4.1.11';const fixture=legacy?'zod-legacy-native.cjs':'zod-native.cjs';
   return {imageId,path,version:imageId==='old'?version:'4.6.6',fixture,fixtureSha256:hashes[fixture],
     passed:true,normalChecks:15,earlyBounds:imageId==='new',
     results:['array-max','array-length','set-max','set-size',...(!legacy?['map-max','map-size']:[])].map(kind=>({kind,calls:imageId==='old'?20:0,issues:1}))};
 }));
 const receipt={passed:true,regressionReproduced:true,network:'none',imageId:'new',rows};
 assert(zodResumeNativeProof(receipt,spec,'new',hashes));
 for(const change of [r=>r.rows.pop(),r=>r.rows[0].results[0].calls=0,r=>r.rows[2].results[0].calls=20,
   r=>r.rows[0].fixtureSha256='wrong',r=>r.rows[1].version='3.25.76',r=>r.rows[3].path='/older',r=>r.rows[2].normalChecks=0]){
   const r=structuredClone(receipt);change(r);assert.throws(()=>zodResumeNativeProof(r,spec,'new',hashes));
 }
});
test('Resume account proof rejects leaked sharing, incomplete cleanup or missing export',()=>{
 const receipt={passed:true,nativeStartup:true,imageId:'new',network:'internal; synthetic browser and disposable PostgreSQL',
  fixtureSha256:'f69cf61d4b3b567075c40bc3653158f665efd8b2f25617d9210ad1e8de32d9e0',
  applicationParity:['old','new'].map(imageId=>({imageId,result:'passed',fictionalOnly:true,networkInternal:true,
   nativeAccountZip:true,accountFieldsAndEmptyApplicationsChecked:true,resumeJsonAndDesignImportedIntoIndependentAccount:true,
   fullZipRejectedWithNativeGuidance:true,sharingNotMigrated:true,originalAccountDeniedImportedDocument:true,
   nativeEditAndBrowserReload:true,nativeAccountDeletionAndTokenRejection:true,remainingFixtureUsers:0,remainingFixtureResumes:0,cleanup:['app','db','network']}))};
 assert(zodApplicationProof('resume','new',receipt,'old'));
 for(const change of [r=>r.applicationParity[1].sharingNotMigrated=false,r=>r.applicationParity[1].cleanup.pop(),
   r=>r.applicationParity[0].nativeAccountZip=false,r=>r.applicationParity[1].remainingFixtureUsers=1]){
   const r=structuredClone(receipt);change(r);assert.throws(()=>zodApplicationProof('resume','new',r,'old'));
 }
});
