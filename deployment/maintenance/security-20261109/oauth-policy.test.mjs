import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {proveOauth} from './oauth-policy.mjs';

function evidence() {
  const inputs=JSON.parse(readFileSync(new URL('./oauth-inputs.json',import.meta.url)));
  const spec={...inputs.rows[0],approval:'approved'};
  const fixture=createHash('sha256').update(readFileSync(new URL('./oauth-check.py',import.meta.url))).digest('hex');
  const imageId='sha256:'+'a'.repeat(64),changedFiles=[spec.site+'/oauthlib/oauth2/rfc8628/grant_types/device_code.py'];
  const normal={passed:true,version:'4.0.0',normalChecks:12,network:'none',invalidDeviceReproduction:false,jsonpRemoved:true};
  const build={...spec,imageId,passed:true,fixtureSha256:fixture,wheelSha256:inputs.wheel.sha256,configurationUnchanged:true,unrelatedDependencyFilesUnchanged:true,existingCertifiFixPreserved:true,changedFiles,baseline:{...normal},native:{...normal,version:'4.0.1',authorizedDeviceValidated:true,deviceSourceSha256:inputs.verification.deviceSourceSha256}};
  const inventory={passed:true,imageId,changedPaths:[...changedFiles],unchangedFiles:1000,removedPackageBytecode:[]};
  const application={status:'passed',newImage:imageId,oldImage:spec.base,freshSyntheticDatabase:true,nativeOAuth1ConsumerPassed:true,checks:'UTILIBRE_NATIVE_AUTH_PASSED: synthetic fixture',network:'none; disposable DB'};
  const scan={passed:true,imageId,base:spec.base,targetedFindingRemoved:true,newHighCritical:0,upstreamFixSourceVerified:true,invalidDeviceReproduction:false,advisories:[inputs.advisory],databaseSha256:'b'.repeat(64),rows:[spec.base,imageId].map(id=>({imageId:id,rawSha256:'c'.repeat(64)}))};
  return [inputs,spec,build,inventory,application,scan,fixture];
}
test('complete supported proof is deterministic and does not mutate evidence',()=>{
  const args=evidence(),before=JSON.stringify(args);
  assert.equal(proveOauth(...args),true);assert.equal(proveOauth(...args),true);
  assert.equal(JSON.stringify(args),before);
});
for(const [name,alter] of [
  ['proposed release',a=>a[1].approval='proposed'],
  ['unsupported baseline',a=>a[1].previous='3.3.1'],
  ['different fixed wheel',a=>a[0].wheel.sha256='0'.repeat(64)],
  ['fixture drift',a=>a[2].fixtureSha256='0'.repeat(64)],
  ['source drift',a=>a[2].native.deviceSourceSha256='0'.repeat(64)],
  ['missing authorized flow',a=>a[2].native.authorizedDeviceValidated=false],
  ['changed certifi',a=>a[2].existingCertifiFixPreserved=false],
  ['unexpected app edit',a=>{a[2].changedFiles=['/app/settings.py'];a[3].changedPaths=[...a[2].changedFiles];}],
  ['path traversal',a=>{a[2].changedFiles=[a[1].site+'/oauthlib/../../../app.py'];a[3].changedPaths=[...a[2].changedFiles];}],
  ['incomplete image inventory',a=>a[3].changedPaths=[]],
  ['unrelated cache deletion',a=>a[3].removedPackageBytecode=['/app/__pycache__/main.pyc']],
  ['wrong candidate tested',a=>a[4].newImage=a[1].base],
  ['production DB fixture',a=>a[4].freshSyntheticDatabase=false],
  ['missing OAuth1 consumer',a=>a[4].nativeOAuth1ConsumerPassed=false],
  ['external test network',a=>a[4].network='bridge'],
  ['another app without a consumer',a=>{a[1].key='trip';a[2].key='trip';}],
  ['new high finding',a=>a[5].newHighCritical=1],
  ['target unresolved',a=>a[5].targetedFindingRemoved=false],
  ['scan incomplete',a=>a[5].passed=false],
  ['missing raw evidence',a=>a[5].rows[1].rawSha256=''],
]) test('rejects '+name,()=>{const args=evidence();alter(args);assert.throws(()=>proveOauth(...args));});

function applicationEvidence(key) {
  const a=evidence();a[1].key=key;a[2].key=key;
  if(key==='simplelogin')Object.assign(a[1],{privateEvaluation:true,expectedPublicStatus:503});
  const fixtures=a[0].applicationFixtures[key];
  const checks=key==='trip'?{nativeAccountIsolation:true,tripCreateEditReadDelete:true,nativeOidcFactory:true,productionDataUsed:false,network:'none'}:{native_auth_csrf_sudo_csv_import_function_export:true,native_oauth_cors_and_invalid_bearer_denial:true,native_signed_token_and_pgp_roundtrips_tamper_denials:true,requests_aiohttp_loopback:true,native_http_login:true,smtp_ehlo_noop_only:true,fixture_dump_restore:true,p4_schema_rollback_compatible:true,native_alias_delete_and_model_account_cleanup:true,external_mail_sent:false,live_database_touched:false,network:'none/shared fixture loopback only'};
  a[4]={key,status:'passed',newImage:a[2].imageId,oldImage:a[2].base,productionDataUsed:false,network:'none; disposable native storage only',fixtureSha256:structuredClone(fixtures),rows:[a[2].base,a[2].imageId].map(imageId=>({imageId,image:imageId,passed:true,...checks}))};
  a.push(structuredClone(fixtures));return a;
}
for (const key of ['trip','simplelogin']) {
  test(key+' accepts two native application checks',()=>assert.equal(proveOauth(...applicationEvidence(key)),true));
  test(key+' rejects an untested previous image',()=>{const a=applicationEvidence(key);a[4].rows.shift();assert.throws(()=>proveOauth(...a));});
  test(key+' rejects changed native fixture',()=>{const a=applicationEvidence(key);a[7][Object.keys(a[7])[0]]='d'.repeat(64);assert.throws(()=>proveOauth(...a));});
}
test('TRIP requires the account/task flow',()=>{const a=applicationEvidence('trip');a[4].rows[1].tripCreateEditReadDelete=false;assert.throws(()=>proveOauth(...a));});
test('SimpleLogin requires no mail sent',()=>{const a=applicationEvidence('simplelogin');a[4].rows[1].external_mail_sent=true;assert.throws(()=>proveOauth(...a));});
test('SimpleLogin requires a successful restore',()=>{const a=applicationEvidence('simplelogin');a[4].rows[1].fixture_dump_restore=false;assert.throws(()=>proveOauth(...a));});
