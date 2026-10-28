import assert from 'node:assert/strict';

export function zodResumeNativeProof(receipt,spec,imageId,hashes){
  assert.equal(spec.key,'resume');
  assert(receipt.passed&&receipt.regressionReproduced);
  assert.equal(receipt.network,'none');assert.equal(receipt.imageId,imageId);
  const paths=Object.keys(spec.before);
  assert.deepEqual(Object.values(spec.before).sort(),['4.1.11','4.6.5']);
  assert.equal(receipt.rows.length,4);
  for(const state of [spec.base,imageId])for(const path of paths){
    const matches=receipt.rows.filter(r=>r.imageId===state&&r.path===path);
    assert.equal(matches.length,1);const row=matches[0];
    const old=state===spec.base,legacy=old&&spec.before[path]==='4.1.11';
    const fixture=legacy?'zod-legacy-native.cjs':'zod-native.cjs';
    assert(row.passed);assert.equal(row.normalChecks,15);
    assert.equal(row.version,old?spec.before[path]:'4.6.6');
    assert.equal(row.fixture,fixture);assert.equal(row.fixtureSha256,hashes[fixture]);
    const kinds=['array-max','array-length','set-max','set-size',...(!legacy?['map-max','map-size']:[])];
    assert.deepEqual(row.results.map(r=>r.kind),kinds);
    assert(row.results.every(r=>r.calls===(old?20:0)));
    if(!old){assert(row.earlyBounds);assert(row.results.every(r=>r.issues===1));}
  }
  return true;
}

// Distinct existing native workflows, not a universal HTTP-success gate.
export function zodApplicationProof(key, imageId, receipt, base) {
  assert(receipt.passed && receipt.nativeStartup);
  assert.equal(receipt.imageId, imageId);
  if (key === 'rsshub') assert.equal(receipt.network, 'none');
  else if (key === 'wishlist') {
    assert.equal(receipt.network, 'internal; isolated synthetic browser');
    for (const name of ['nativeBlankDatabaseStartup', 'typescriptTransform',
      'nativeAccountCreated', 'listCreated', 'itemCreated', 'reloadPersistence',
      'anonymousListDenied']) assert.equal(receipt[name], true, name);
    assert.deepEqual(receipt.pageErrors, []);
    assert.deepEqual(receipt.externalBrowserOrigins, []);
  } else if (key === 'resume') {
    assert.equal(receipt.network,'internal; synthetic browser and disposable PostgreSQL');
    assert.equal(receipt.fixtureSha256,'f69cf61d4b3b567075c40bc3653158f665efd8b2f25617d9210ad1e8de32d9e0');
    assert.deepEqual(receipt.applicationParity.map(r=>r.imageId),[base,imageId]);
    for(const row of receipt.applicationParity){
      assert.equal(row.result,'passed');
      for(const field of ['fictionalOnly','networkInternal','nativeAccountZip',
        'accountFieldsAndEmptyApplicationsChecked','resumeJsonAndDesignImportedIntoIndependentAccount',
        'fullZipRejectedWithNativeGuidance','sharingNotMigrated','originalAccountDeniedImportedDocument',
        'nativeEditAndBrowserReload','nativeAccountDeletionAndTokenRejection']) assert.equal(row[field],true,field);
      assert.equal(row.remainingFixtureUsers,0);assert.equal(row.remainingFixtureResumes,0);
      assert.equal(row.cleanup.length,3);
    }
  } else if (key === 'projects') {
    assert.equal(receipt.network, 'internal; disposable PostgreSQL');
    assert.deepEqual(receipt.applicationParity.map(r=>r.imageId), [base,imageId]);
    for (const row of receipt.applicationParity) {
      assert(row.passed && row.freshDatabaseMigrations && row.nativeLoginAndProjectBoardCardEditDelete);
      assert(row.anonymousApiDenied && row.adaptersResolveFixedLibrary && row.herokuExampleAbsent);
      assert.equal(row.externalNetworkAvailable, false);
      assert.equal(row.productionChanged, false);
    }
  } else {
    assert(['candlr', 'admin'].includes(key));
    assert.equal(receipt.network, 'none; disposable DB namespace where required');
    assert(receipt.libraryGate);
    assert.deepEqual(receipt.applicationParity.map(r => r.imageId), [base, imageId]);
    for (const row of receipt.applicationParity) {
      if (key === 'candlr') {
        assert.equal(row.status, 200);
        for (const name of ['twoAccounts', 'privateRecordCreate', 'secondAccountDenied',
          'loggedOutDenied', 'nativeExport', 'deletion']) assert.equal(row[name], true, name);
      } else {
        assert(row.status >= 200 && row.status < 400);
        assert(Number.isInteger(row.nativeMigrationTables) && row.nativeMigrationTables > 0);
      }
    }
    const comparable = ({imageId: ignored, ...rest}) => rest;
    assert.deepEqual(...receipt.applicationParity.map(comparable));
  }
  return true;
}
