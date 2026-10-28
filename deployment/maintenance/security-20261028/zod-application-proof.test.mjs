import test from 'node:test';
import assert from 'node:assert/strict';
import {zodApplicationProof} from './zod-application-proof.mjs';
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
