import assert from 'node:assert/strict';

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
