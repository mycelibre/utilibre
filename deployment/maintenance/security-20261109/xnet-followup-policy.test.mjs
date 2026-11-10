import test from 'node:test';import assert from 'node:assert/strict';
import {validateFollowup,validateOAuthNative,validateWakapiNative,validateOpengistNative,validateNtfyNative,validateVikunjaNative,validateDonetickNative,validateFerretNative} from './xnet-followup-policy.mjs';
function data(){
 const s={key:'safetwitch',mode:'binary-followup',approval:'approved',base:'old',imageId:'new',candidate:'candidate',databaseSha256:'db',checkSha256:'check',rawEvidence:{before:'before',after:'after'}};
 const original={base:'old',binary:'/safetwitch',locks:{'go.mod':'mod','go.sum':'sum'}};
 const b={passed:true,sourceUnchanged:true,configurationUnchanged:true,allOtherFilesUnchanged:true,base:'old',imageId:'new',candidate:'candidate',changedFiles:['/safetwitch'],imageEntries:1234,locks:{...original.locks},compilerVersion:'1.26.10',moduleChanges:[{module:'golang.org/x/net',after:'v0.62.0 h1:sum'}],scopeCheckerSha256:'check'};
 const n={passed:true,productionChanged:false,network:'internal; no upstream requests',imageId:'new',base:'old',adapters:[{}]};
 const scan={passed:true,targetedFindingRemoved:true,newHighCritical:0,imageId:'new',base:'old',databaseSha256:'db',rawEvidence:{...s.rawEvidence},newFindings:[],removedFindings:[]};
 return {s,original,b,n,scan,dependencies:Array.from({length:101},(_,i)=>'package/'+i)};
}
const validate=d=>validateFollowup(d.s,d.original,d.b,d.n,d.scan,d.dependencies);
test('exact binary-only candidate and unchanged native fixtures can qualify',()=>assert(validate(data())));
test('historical checker identity is limited to its exact completed releases',()=>{
 const d=data();d.s.checkRevision='c2fa64e01d5de17a9c719cf39975f157346da40e';assert(validate(d));
 d.s.checkRevision='main';assert.throws(()=>validate(d));
 d.s.checkRevision='c2fa64e01d5de17a9c719cf39975f157346da40e';d.s.key='gothub';assert.throws(()=>validate(d));
 d.s.checkRevision='9c13c74ee95db4039b15c3b4be6323c8379fa98a';assert(validate(d));
 d.s.key='mezzo';assert.throws(()=>validate(d));
 delete d.s.checkRevision;assert(validate(d));
});
test('Mezzo is subject to the same binary, dependency and native proof gates',()=>{
 const d=data();d.s.key='mezzo';assert(validate(d));
 d.b.moduleChanges.push({module:'github.com/PuerkitoBio/goquery',after:'v1.99.0'});assert.throws(()=>validate(d));
});
test('Anubis rejects a newly linked telemetry package',()=>{
 const d=data();d.s.key='anubis';d.s.builderSha256='a'.repeat(64);assert(validate(d));
 d.dependencies.push('golang.org/x/telemetry/counter');assert.throws(()=>validate(d));
 d.dependencies.pop();delete d.s.builderSha256;assert.throws(()=>validate(d));
});
test('vendored version notation is limited to the reviewed OAuth build',()=>{
 const d=data();d.b.moduleChanges[0].after='v0.62.0';assert.throws(()=>validate(d));
 d.s.key='oauth2-proxy';d.s.builderSha256='a'.repeat(64);assert(validate(d));
});
test('OAuth requires complete login, identity, rejection, logout and isolation checks',()=>{
 const r={imageId:'image',passed:true,nativeDiscoveryAuthorizationCodePkceAndSignedIdToken:true,authenticatedCookieAndIdentityHeader:true,invalidCsrfRejected:true,anonymousDeniedAndLogoutCleared:true,onlyLoopbackIssuer:true,networkIsolated:true};assert(validateOAuthNative(r,'image'));assert.throws(()=>validateOAuthNative(r,'different'));
 for(const key of Object.keys(r).filter(k=>k!=='imageId'))assert.throws(()=>validateOAuthNative({...r,[key]:false},'image'));
});
test('Wakapi requires its exact retained compiler and two native adapters',()=>{
 const d=data();d.s.key='wakapi';d.s.builderSha256='a'.repeat(64);d.b.compilerVersion='1.27.3';d.b.compiler='sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b';d.n.adapters.push({});assert(validate(d));
 d.b.compilerVersion='1.26.10';assert.throws(()=>validate(d));d.b.compilerVersion='1.27.3';
 d.b.compiler='different';assert.throws(()=>validate(d));d.b.compiler='sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b';
 d.n.adapters.pop();assert.throws(()=>validate(d));
});
test('Wakapi requires useful account and authenticated heartbeat behavior',()=>{
 const r={imageId:'image',passed:true,freshSqliteMigrations:true,nativeAccountLoginLogout:true,authenticatedHeartbeatAndAnonymousDenial:true,nativeHealthcheck:true};assert(validateWakapiNative(r,'image'));assert.throws(()=>validateWakapiNative(r,'different'));
 for(const key of Object.keys(r).filter(k=>k!=='imageId'))assert.throws(()=>validateWakapiNative({...r,[key]:false},'image'));
});
test('OpenGist requires two-account privacy, editing, Git and native deletion',()=>{
 const r={imageId:'image',passed:true,blankRamOnlySqlite:true,twoNativeAccountsLogin:true,privateAnonymousAndOtherAccountDenied:true,createEditCommitsZip:true,privateGitClonePushReopen:true,gistsAndAccountsDeletedNatively:true,network:'internal-only, no production mounts, tokens kept in memory'};
 assert(validateOpengistNative(r,'image'));assert.throws(()=>validateOpengistNative(r,'different'));
 for(const key of Object.keys(r).filter(k=>!['imageId','network'].includes(k)))assert.throws(()=>validateOpengistNative({...r,[key]:false},'image'));
 assert.throws(()=>validateOpengistNative({...r,network:'host'},'image'));
});
test('ntfy preserves anonymous notifications, limits, disabled collection and RAM-only cache',()=>{
 const r={imageId:'image',configurationSha256:'configuration',passed:true,networkIsolated:true,onlySyntheticData:true,anonymousPublishAndPoll:true,oneHourExpiry:true,noCacheHonoured:true,attachmentsDisabled:true,registrationDisabled:true,metricsDisabled:true,ramCacheClearedOnRestart:true};
 assert(validateNtfyNative(r,'image','configuration'));assert.throws(()=>validateNtfyNative(r,'different','configuration'));assert.throws(()=>validateNtfyNative(r,'image','different'));
 for(const key of Object.keys(r).filter(k=>!['imageId','configurationSha256'].includes(k)))assert.throws(()=>validateNtfyNative({...r,[key]:false},'image','configuration'));
});
test('Vikunja requires account isolation, exports, attachment persistence and restore',()=>{
 const r={imageId:'image',configurationSourceSha256:'configuration'};
 for(const f of ['passed','networkIsolated','onlySyntheticData','twoNativeAccounts','createCompleteTask','projectAndAttachmentIsolation','attachmentRoundTrip','exportPasswordRequired','nativeZipExportImport','importedProjectOwnedByRecipient','syntheticSqliteBackupRestore','reloadPreservesTaskAndAttachment','nativeProjectDeletion'])r[f]=true;
 assert(validateVikunjaNative(r,'image','configuration'));
 assert.throws(()=>validateVikunjaNative(r,'different','configuration'));assert.throws(()=>validateVikunjaNative(r,'image','different'));
 for(const f of Object.keys(r).filter(k=>typeof r[k]==='boolean'))assert.throws(()=>validateVikunjaNative({...r,[f]:false},'image','configuration'));
});
test('Donetick requires a working native chore lifecycle as well as denial',()=>{
 const r={imageId:'image',status:'passed',network:'Docker internal bridge; no external route',checks:{twoFictionalAccounts:true,createReadDelete:true,crossAccountDenied:true,deletedAbsentFromList:true,anonymousDenied:true,crossAccountStatus:404,deletedLookupStatus:404}};
 assert(validateDonetickNative(r,'image'));assert.throws(()=>validateDonetickNative(r,'different'));
 for(const f of Object.keys(r.checks).filter(k=>typeof r.checks[k]==='boolean'))assert.throws(()=>validateDonetickNative({...r,checks:{...r.checks,[f]:false}},'image'));
 assert.throws(()=>validateDonetickNative({...r,checks:{...r.checks,crossAccountStatus:200}},'image'));
});
test('FerretDB requires native application behavior and a synthetic restored database',()=>{
 const r={imageId:'image',productionChanged:false,network:'none/shared fictional loopback only'};
 for(const f of ['passed','nativeGathioCreateEdit','invalidEditTokenDenied','imageUpload','icsImportExport','stoppedDatabaseCopyRestore','reopenedOriginalAndImportedEvents'])r[f]=true;
 assert(validateFerretNative(r,'image'));assert.throws(()=>validateFerretNative(r,'different'));
 for(const f of Object.keys(r).filter(k=>typeof r[k]==='boolean'))assert.throws(()=>validateFerretNative({...r,[f]:!r[f]},'image'));
});
for(const [label,mutate]of Object.entries({
 'unapproved':d=>d.s.approval='pending','unknown application':d=>d.s.key='unknown',
 'wrong artifact':d=>d.s.imageId='other','unexpected file':d=>d.b.changedFiles.push('/etc/config'),
 'changed source':d=>d.b.sourceUnchanged=false,'changed configuration':d=>d.b.configurationUnchanged=false,
 'unproven image scope':d=>d.b.allOtherFilesUnchanged=false,'wrong lock':d=>d.b.locks['go.sum']='other',
 'unexpected module':d=>d.b.moduleChanges.push({module:'other',after:'v1'}),
 'public network test':d=>d.n.network='host','test changed production':d=>d.n.productionChanged=true,
 'incomplete native proof':d=>d.n.adapters=[],'wrong native baseline':d=>d.n.base='other',
 'scanner failure':d=>d.scan.passed=false,'target still present':d=>d.scan.targetedFindingRemoved=false,
 'new high finding':d=>d.scan.newHighCritical=1,'changed database':d=>d.scan.databaseSha256='other',
 'changed raw evidence':d=>d.scan.rawEvidence.after='other','unknown new finding':d=>d.scan.newFindings=[['new','pkg','v1','LOW']],
}))test('rejects '+label,()=>{const d=data();mutate(d);assert.throws(()=>validate(d));});
test('retained OpenPGP attribution requires exact before/after and absent imports',()=>{
 const d=data();d.scan.newFindings=[['GO-2026-5932','golang.org/x/crypto','v0.58.0','UNKNOWN']];
 d.scan.removedFindings=[['GO-2026-5932','golang.org/x/crypto','v0.57.0','UNKNOWN']];assert(validate(d));
 d.dependencies.push('golang.org/x/crypto/openpgp/packet');assert.throws(()=>validate(d));
 d.dependencies.pop();d.scan.removedFindings=[];assert.throws(()=>validate(d));
});

test('Donetick retains its exact minimal image inventory and two native fixtures',()=>{
 const d=data();d.s.key='donetick';d.s.builderSha256='a'.repeat(64);d.b.compilerVersion='1.27.3';d.b.compiler='sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b';d.n.adapters.push({});d.b.imageEntries=10;assert(validate(d));
 d.b.imageEntries=9;assert.throws(()=>validate(d));d.b.imageEntries=11;assert.throws(()=>validate(d));
});
