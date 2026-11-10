import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/security-20261109/xnet';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const completedCheckers={safetwitch:'c2fa64e01d5de17a9c719cf39975f157346da40e',galene:'c2fa64e01d5de17a9c719cf39975f157346da40e',gothub:'9c13c74ee95db4039b15c3b4be6323c8379fa98a',mezzo:'807cfe54e3c181d543b8fc074bbb55fd225555dd',anubis:'aa6bb5e5c1fda827efe478e2e02ec81e242e3b11','oauth2-proxy':'91fc41f5cb6e87495a1c68299960fa86468c893a',wakapi:'f4b78b8ccc9d4a4d880fde954a2c62e0051bf80d',opengist:'f6417791c58a5cde10435dca893df3577ed6a9b6',ntfy:'f6417791c58a5cde10435dca893df3577ed6a9b6',donetick:'7a13c38874e48a29dab68716787ce90bac67a9f8'};
export function validateOAuthNative(r,image){
 assert.equal(r.imageId,image);
 for(const f of ['passed','nativeDiscoveryAuthorizationCodePkceAndSignedIdToken','authenticatedCookieAndIdentityHeader','invalidCsrfRejected','anonymousDeniedAndLogoutCleared','onlyLoopbackIssuer','networkIsolated'])assert.equal(r[f],true,f);
 return true;
}
export function validateWakapiNative(r,image){
 assert.equal(r.imageId,image);
 for(const f of ['passed','freshSqliteMigrations','nativeAccountLoginLogout','authenticatedHeartbeatAndAnonymousDenial','nativeHealthcheck'])assert.equal(r[f],true,f);
 return true;
}
export function validateOpengistNative(r,image){
 assert.equal(r.imageId,image);
 for(const f of ['passed','blankRamOnlySqlite','twoNativeAccountsLogin','privateAnonymousAndOtherAccountDenied','createEditCommitsZip','privateGitClonePushReopen','gistsAndAccountsDeletedNatively'])assert.equal(r[f],true,f);
 assert.equal(r.network,'internal-only, no production mounts, tokens kept in memory');return true;
}
export function validateNtfyNative(r,image,configurationSha256){
 assert.equal(r.imageId,image);assert.equal(r.configurationSha256,configurationSha256);
 for(const f of ['passed','networkIsolated','onlySyntheticData','anonymousPublishAndPoll','oneHourExpiry','noCacheHonoured','attachmentsDisabled','registrationDisabled','metricsDisabled','ramCacheClearedOnRestart'])assert.equal(r[f],true,f);
 return true;
}
export function validateVikunjaNative(r,image,configurationSha256){
 assert.equal(r.imageId,image);assert.equal(r.configurationSourceSha256,configurationSha256);
 for(const f of ['passed','networkIsolated','onlySyntheticData','twoNativeAccounts','createCompleteTask','projectAndAttachmentIsolation','attachmentRoundTrip','exportPasswordRequired','nativeZipExportImport','importedProjectOwnedByRecipient','syntheticSqliteBackupRestore','reloadPreservesTaskAndAttachment','nativeProjectDeletion'])assert.equal(r[f],true,f);
 return true;
}
export function validateDonetickNative(r,image){
 assert.equal(r.imageId,image);assert.equal(r.status,'passed');assert.equal(r.network,'Docker internal bridge; no external route');
 for(const f of ['twoFictionalAccounts','createReadDelete','crossAccountDenied','deletedAbsentFromList','anonymousDenied'])assert.equal(r.checks[f],true,f);
 assert([400,403,404,500].includes(r.checks.crossAccountStatus));assert([400,404,500].includes(r.checks.deletedLookupStatus));return true;
}
export function validateFerretNative(r,image){
 assert.equal(r.imageId,image);assert.equal(r.productionChanged,false);assert.equal(r.network,'none/shared fictional loopback only');
 for(const f of ['passed','nativeGathioCreateEdit','invalidEditTokenDenied','imageUpload','icsImportExport','stoppedDatabaseCopyRestore','reopenedOriginalAndImportedEvents'])assert.equal(r[f],true,f);
 return true;
}
export function validateFollowup(s,original,b,n,scan,dependencies){
 assert(['safetwitch','galene','gothub','mezzo','anubis','oauth2-proxy','wakapi','opengist','ntfy','vikunja','donetick','ferretdb'].includes(s.key)&&s.mode==='binary-followup'&&s.approval==='approved');
 if(s.checkRevision){assert(completedCheckers[s.key]);assert.equal(s.checkRevision,completedCheckers[s.key]);}
 assert(b.passed&&b.sourceUnchanged&&b.configurationUnchanged&&b.allOtherFilesUnchanged);
 assert.equal(b.base,s.base);assert.equal(b.base,original.base);assert.equal(b.imageId,s.imageId);assert.equal(b.candidate,s.candidate);
 assert.deepEqual(b.changedFiles,[original.binary]);
 // Retained minimal images still require a complete comparison, permitting
 // only the executable to differ; file count is not a security threshold.
 const minimalEntries={donetick:10,vikunja:15};
 assert(Object.hasOwn(minimalEntries,s.key)?b.imageEntries===minimalEntries[s.key]:b.imageEntries>100);
 assert.deepEqual(b.locks,original.locks);assert.equal(b.compilerVersion,['wakapi','opengist','ntfy','vikunja','donetick'].includes(s.key)?'1.27.3':'1.26.10');
 if(['wakapi','opengist','ntfy','vikunja','donetick'].includes(s.key))assert.equal(b.compiler,'sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b');
 assert(b.moduleChanges.some(r=>r.module==='golang.org/x/net'&&(r.after.startsWith('v0.62.0 ')||(['oauth2-proxy','wakapi'].includes(s.key)&&r.after==='v0.62.0'))));
 assert(b.moduleChanges.every(r=>['golang.org/x/net','golang.org/x/crypto','golang.org/x/sys','golang.org/x/text','golang.org/x/sync','golang.org/x/tools','golang.org/x/term'].includes(r.module)));
 assert(n.passed&&n.productionChanged===false&&n.network==='internal; no upstream requests');
 assert.equal(n.imageId,b.imageId);assert.equal(n.base,b.base);assert.equal(n.adapters.length,['galene','wakapi','donetick'].includes(s.key)?2:1);
 assert(scan.passed&&scan.targetedFindingRemoved&&scan.newHighCritical===0);assert.equal(scan.imageId,b.imageId);assert.equal(scan.base,b.base);
 assert.equal(scan.databaseSha256,s.databaseSha256);assert.equal(b.scopeCheckerSha256,s.checkSha256);
 assert.deepEqual(scan.rawEvidence,s.rawEvidence);
 if(['anubis','oauth2-proxy','wakapi','opengist','ntfy','vikunja','donetick','ferretdb'].includes(s.key)){
  assert(/^[a-f0-9]{64}$/.test(s.builderSha256));
  assert(dependencies.length>100&&!dependencies.some(p=>p.startsWith('golang.org/x/telemetry')));
 }
 // The old OpenPGP module-level attribution may change its version label.
 // Require proof that the application does not import that unmaintained API.
 if(scan.newFindings.length){
  assert.deepEqual(scan.newFindings,[['GO-2026-5932','golang.org/x/crypto','v0.58.0','UNKNOWN']]);
  assert(scan.removedFindings.some(f=>f[0]==='GO-2026-5932'&&f[1]==='golang.org/x/crypto'&&f[2]==='v0.57.0'));
  assert(dependencies.length>100&&!dependencies.some(p=>p.startsWith('golang.org/x/crypto/openpgp')));
 }
 return true;
}
export function proveFollowup(s,{requireRecentCandidate=true}={}){
 const d=root+'/'+s.key,m=read(new URL('./xnet-inputs.json',import.meta.url)),original=m.rows.find(r=>r.key===s.key);
 assert(original);const b=read(d+'/build.json'),n=read(d+'/native.json'),scan=read(d+'/scan-gate.json');
 assert.equal(sha(d+'/native-dependencies.txt'),s.dependenciesSha256);
 validateFollowup(s,original,b,n,scan,fs.readFileSync(d+'/native-dependencies.txt','utf8').trim().split('\n'));
 assert.equal(sha(d+'/'+s.key),b.binarySha256);assert.equal(sha(d+'/source-proof.json'),original.sourceProofSha256);
 for(const f of read(d+'/source-proof.json').sourceFiles)assert.equal(sha(d+'/source/'+f.path),f.sha256);
 for(const [f,h]of Object.entries(original.locks)){assert.equal(sha(d+'/source/'+f),h);assert.equal(sha(new URL('./xnet-locks/'+s.key+'/'+f,import.meta.url)),h);}
 if(s.checkRevision){
  // Completed releases remain bound to the exact committed checker used then.
  // A later checker edit cannot retroactively rewrite their recorded evidence.
  assert(completedCheckers[s.key]);
  assert.equal(s.checkRevision,completedCheckers[s.key]);
  const source=cp.execFileSync('git',['show',s.checkRevision+':deployment/maintenance/security-20261109/xnet-followup.py'],{cwd:new URL('../../../',import.meta.url),timeout:10000,maxBuffer:128*1024});
  assert.equal(createHash('sha256').update(source).digest('hex'),s.checkSha256);
 }else assert.equal(sha(new URL('./xnet-followup.py',import.meta.url)),s.checkSha256);
 assert.equal(sha(new URL('./zlib-check.py',import.meta.url)),b.exporterSha256);
 for(const a of n.adapters){assert.equal(sha(new URL(a.fixture,import.meta.url)),a.fixtureSha256);assert.equal(sha(a.adapter),a.adapterSha256);}
 if(['anubis','oauth2-proxy','wakapi','opengist','ntfy','vikunja','donetick','ferretdb'].includes(s.key)){
  const builder=s.checkRevision?cp.execFileSync('git',['show',s.checkRevision+':deployment/maintenance/security-20261109/xnet-build.mjs'],{cwd:new URL('../../../',import.meta.url),timeout:10000,maxBuffer:128*1024}):fs.readFileSync(new URL('./xnet-build.mjs',import.meta.url));
  assert.equal(createHash('sha256').update(builder).digest('hex'),s.builderSha256);
  assert.equal(sha(new URL('../../../'+original.buildRecipe,import.meta.url)),original.buildRecipeSha256);
 }
 if(['oauth2-proxy','wakapi'].includes(s.key)){
  if(s.key==='oauth2-proxy')for(const phase of ['before','after'])validateOAuthNative(read(d+'/'+phase+'/oauth2-proxy-native.json'),phase==='before'?s.base:s.imageId);
  assert.equal(sha(d+'/jose-v3-jwk.go'),original.joseV3Sha256);
  const vendor=fs.readFileSync(d+'/'+s.key+'-vendor-modules.txt','utf8');assert(vendor.includes('# github.com/go-jose/go-jose/v3 v3.0.5\n')&&vendor.includes('# github.com/go-jose/go-jose/v4 v4.1.6\n'));
 }
 if(s.key==='wakapi'){
  for(const phase of ['before','after'])validateWakapiNative(read(d+'/'+phase+'-native.json'),phase==='before'?s.base:s.imageId);
  const assets=read(d+'/wakapi-assets.json');assert(assets.passed&&assets.unchangedEmbeddedFiles===82);assert.equal(assets.binarySha256,b.binarySha256);assert.equal(assets.baseImageId,s.base);
  assert.equal(sha(new URL('../go-leaf-final/check-wakapi-assets.py',import.meta.url)),original.assetsFixtureSha256);
  assert.equal(sha(new URL('../go-leaf-final/extract-embed.py',import.meta.url)),original.embedExtractorSha256);
 }
 if(s.key==='vikunja'){
  assert.equal(sha(new URL('../../community/vikunja/config.yml',import.meta.url)),original.configurationSha256);
  for(const phase of ['before','after'])validateVikunjaNative(read(d+'/'+phase+'-native.json'),phase==='before'?s.base:s.imageId,original.configurationSha256);
  const assets=read(d+'/assets.json');assert(assets.passed&&assets.embeddedAssetsUnchanged.length===1&&assets.embeddedAssetsUnchanged[0].files===361);assert.equal(assets.binarySha256,b.binarySha256);
  assert.equal(sha(new URL('../go-leaf-final/check-assets.py',import.meta.url)),original.assetsFixtureSha256);assert.equal(sha(new URL('../go-leaf-final/extract-embed.py',import.meta.url)),original.embedExtractorSha256);
  const tests=fs.readFileSync(d+'/echo-middleware-tests.txt','utf8');assert(/^ok\s/m.test(tests)&&!/(^|\n)FAIL(?:\s|$)/.test(tests));
 }
 if(s.key==='donetick'){
  assert.equal(sha(new URL('../../donetick/config.yaml',import.meta.url)),original.configurationSha256);
  validateDonetickNative(read(d+'/donetick-baseline.json'),s.base);validateDonetickNative(read(d+'/donetick-native.json'),s.imageId);
  const assets=read(d+'/assets.json');assert(assets.passed&&assets.unchangedEmbeddedAssets.length===254);
  assert.equal(sha(new URL('../security-20261028/check-donetick-assets.py',import.meta.url)),original.assetsFixtureSha256);
 }
 if(s.key==='ferretdb'){
  for(const phase of ['before','after'])validateFerretNative(read(d+'/'+phase+'/native.json'),phase==='before'?s.base:s.imageId);
  for(const [f,h]of Object.entries(original.fixtureFiles))assert.equal(sha(new URL('../../../'+f,import.meta.url)),h);
  for(const id of Object.values(original.fixtureCompanionImages))assert(/^sha256:[a-f0-9]{64}$/.test(id));
 }
 if(s.key==='ntfy'){
  assert.equal(sha(new URL('../../community/ntfy.yml',import.meta.url)),original.configurationSha256);
  for(const phase of ['before','after'])validateNtfyNative(read(d+'/'+phase+'-native.json'),phase==='before'?s.base:s.imageId,original.configurationSha256);
  const assets=read(d+'/assets.json');assert(assets.passed&&assets.embeddedAssetsUnchanged.length===1&&assets.embeddedAssetsUnchanged[0].files===295);assert.equal(assets.binarySha256,b.binarySha256);
  assert.equal(sha(new URL('../go-leaf-final/check-assets.py',import.meta.url)),original.assetsFixtureSha256);
  assert.equal(sha(new URL('../go-leaf-final/extract-embed.py',import.meta.url)),original.embedExtractorSha256);
 }
 if(s.key==='opengist'){
  for(const phase of ['before','after'])validateOpengistNative(read(d+'/'+phase+'-native.json'),phase==='before'?s.base:s.imageId);
  const assets=read(d+'/assets.json');assert(assets.passed&&assets.embeddedAssetsUnchanged.length===1);assert.equal(assets.binarySha256,b.binarySha256);
  assert.equal(sha(new URL('../go-leaf-final/check-assets.py',import.meta.url)),original.assetsFixtureSha256);
  assert.equal(sha(new URL('../go-leaf-final/extract-embed.py',import.meta.url)),original.embedExtractorSha256);
  const lock=fs.readFileSync(d+'/opengist-build-go.mod','utf8');assert(lock.includes('replace github.com/go-jose/go-jose/v3 => /work/jose-v3'));
  for(const file of ['opengist-jose-v3-tests.txt','echo-middleware-tests.txt']){const tests=fs.readFileSync(d+'/'+file,'utf8');assert(/^ok\s/m.test(tests)&&!/(^|\n)FAIL(?:\s|$)/.test(tests));}
 }
 if(s.key==='anubis'){
  for(const phase of ['before','after']){const r=read(d+'/'+phase+'-native.json');assert(r.passed&&r.nativeAllowAndDeny&&r.twoIndependentBrowserPowChallenges&&r.authenticatedReload&&r.externalBrowserCalls===0);assert.equal(r.imageId,phase==='before'?s.base:s.imageId);}
  const assets=read(d+'/assets.json');assert(assets.passed&&assets.embeddedAssetsUnchanged.length===2);assert.equal(assets.binarySha256,b.binarySha256);
  assert.equal(sha(new URL('../go-leaf-final/check-assets.py',import.meta.url)),original.assetsFixtureSha256);
  assert.equal(sha(new URL('../go-leaf-final/extract-embed.py',import.meta.url)),original.embedExtractorSha256);
  assert.equal(sha(new URL('../go-leaf-final/anubis-native-policy.yaml',import.meta.url)),original.policySha256);
 }
 for(const [f,h]of Object.entries(s.proofs))assert.equal(sha(d+'/'+f),h);
 for(const phase of ['before','after'])assert.equal(sha(d+'/'+phase+'-scan.json'),s.rawEvidence[phase]);
 const source=read(root+(['gothub','mezzo','anubis','oauth2-proxy','wakapi','opengist','ntfy','vikunja','donetick','ferretdb'].includes(s.key)?'/published-'+s.key+'-source.json':'/published-followup-source.json'));assert(source.passed);
 const offer=source.rows.find(r=>r.key===s.key&&r.imageId===b.imageId);assert(offer);assert.equal(sha('/opt/utilibre/toolbox-public/'+offer.archive),offer.sha256);
 // Activation always uses the default freshness gate. Read-only review of a
 // retained patch may reuse immutable receipts alongside a fresh fleet scan.
 if(requireRecentCandidate){
  assert(Date.now()-Date.parse(b.date)<86400000&&Date.now()-Date.parse(scan.date)<86400000);
  assert(Date.now()-Date.parse(s.advisoryUpdatedAt)<48*3600000);
 }
 return {s,b,scan:{passed:true,base:s.base,imageId:s.imageId,remainingHigh:scan.remainingCounts.HIGH||0,remainingCritical:scan.remainingCounts.CRITICAL||0}};
}
