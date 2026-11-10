import assert from 'node:assert/strict';

// Finite release proof for the upstream 4.0.1 wheel, not a general dependency updater.
export function proveOauth(inputs, spec, build, inventory, application, scan, fixtureSha256, applicationFixtures = {}) {
  assert.equal(inputs.schemaVersion, 1);
  assert.equal(inputs.version, '4.0.1');
  assert.equal(inputs.advisory, 'CVE-2026-49272');
  assert.equal(inputs.upstreamFix, '77a5f1c8ce00da2b0b8c5f6e9cc129920085f114');
  assert.equal(spec.approval, 'approved');
  assert.equal(spec.previous, '4.0.0');
  assert.equal(spec.method, 'upstream-wheel');
  assert.equal(inputs.wheel.sha256, '498a298876e996301950a5b053d12c31628bb7b895db03666430c69ce182eb61');
  assert.match(fixtureSha256, /^[a-f0-9]{64}$/);
  assert.equal(fixtureSha256, inputs.verification.fixtureSha256);
  assert.equal(build.fixtureSha256, fixtureSha256);
  assert.equal(build.wheelSha256, inputs.wheel.sha256);
  assert.equal(build.key, spec.key);
  assert.equal(build.base, spec.base);
  assert.equal(build.candidate, spec.candidate);
  assert.match(build.imageId, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(build.base, build.imageId);
  for (const field of ['passed', 'configurationUnchanged', 'unrelatedDependencyFilesUnchanged', 'existingCertifiFixPreserved']) assert.equal(build[field], true, field);
  for (const [result, version] of [[build.baseline, spec.previous], [build.native, inputs.version]]) {
    assert.equal(result.passed, true);
    assert.equal(result.version, version);
    assert.equal(result.normalChecks, 12);
    assert.equal(result.network, 'none');
    assert.equal(result.invalidDeviceReproduction, false);
    assert.equal(result.jsonpRemoved, true);
  }
  assert.equal(build.native.authorizedDeviceValidated, true);
  assert.equal(inputs.verification.deviceSourceSha256, 'e75d01898546168125cff9cdde9cb870ba59d781d53ae40530eb6c0e570cebf4');
  assert.equal(build.native.deviceSourceSha256, inputs.verification.deviceSourceSha256);
  assert.equal(inventory.passed, true);
  assert.equal(inventory.imageId, build.imageId);
  assert.deepEqual(inventory.changedPaths, build.changedFiles);
  assert(build.changedFiles.length > 0 && new Set(build.changedFiles).size === build.changedFiles.length);
  const roots = ['/oauthlib/', `/oauthlib-${spec.previous}.dist-info/`, `/oauthlib-${inputs.version}.dist-info/`].map(p => spec.site + p);
  for (const path of build.changedFiles) assert(!path.split('/').includes('..') && roots.some(root => path.startsWith(root)), 'Unexpected file scope');
  for (const path of inventory.removedPackageBytecode || []) assert(path.startsWith(spec.site + '/oauthlib/') && path.includes('/__pycache__/') && path.endsWith('.pyc') && !path.split('/').includes('..'));
  assert(inventory.unchangedFiles > build.changedFiles.length);
  assert.equal(application.status, 'passed');
  assert.equal(application.newImage, build.imageId);
  assert.equal(application.oldImage, build.base);
  assert(application.network.startsWith('none;'));
  if (spec.key === 'authentik') {
    assert.equal(application.freshSyntheticDatabase, true);
    assert.equal(application.nativeOAuth1ConsumerPassed, true);
    assert(application.checks.startsWith('UTILIBRE_NATIVE_AUTH_PASSED'));
  } else {
    assert(['trip','simplelogin'].includes(spec.key), 'Unsupported application');
    assert.equal(application.productionDataUsed, false);
    assert.equal(application.key, spec.key);
    assert.deepEqual(application.rows.map(r => r.imageId), [build.base,build.imageId]);
    assert(Object.keys(applicationFixtures).length > 0);
    assert.deepEqual(applicationFixtures, inputs.applicationFixtures[spec.key]);
    assert.deepEqual(application.fixtureSha256, applicationFixtures);
    for (const h of Object.values(applicationFixtures)) assert.match(h, /^[a-f0-9]{64}$/);
    for (const row of application.rows) {
      assert.equal(row.passed, true);
      if (spec.key === 'trip') {
        for (const field of ['nativeAccountIsolation','tripCreateEditReadDelete','nativeOidcFactory']) assert.equal(row[field], true, field);
        assert.equal(row.productionDataUsed, false);
        assert.equal(row.network, 'none');
      } else {
        assert.equal(spec.privateEvaluation, true);
        assert.equal(spec.expectedPublicStatus, 503);
        assert.equal(row.image, row.imageId);
        for (const field of ['native_auth_csrf_sudo_csv_import_function_export','native_oauth_cors_and_invalid_bearer_denial','native_signed_token_and_pgp_roundtrips_tamper_denials','requests_aiohttp_loopback','native_http_login','smtp_ehlo_noop_only','fixture_dump_restore','p4_schema_rollback_compatible','native_alias_delete_and_model_account_cleanup']) assert.equal(row[field], true, field);
        assert.equal(row.external_mail_sent, false);
        assert.equal(row.live_database_touched, false);
        assert.equal(row.network, 'none/shared fixture loopback only');
      }
    }
  }
  assert.equal(scan.passed, true);
  assert.equal(scan.imageId, build.imageId);
  assert.equal(scan.base, build.base);
  assert.equal(scan.targetedFindingRemoved, true);
  assert.equal(scan.newHighCritical, 0);
  assert.equal(scan.upstreamFixSourceVerified, true);
  assert.equal(scan.invalidDeviceReproduction, false);
  assert.deepEqual(scan.advisories, [inputs.advisory]);
  assert.match(scan.databaseSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(scan.rows.map(r => r.imageId), [build.base, build.imageId]);
  for (const row of scan.rows) assert.match(row.rawSha256, /^[a-f0-9]{64}$/);
  return true;
}
