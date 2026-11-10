import test from 'node:test';import assert from 'node:assert/strict';
import {validateFollowup,validateOAuthNative} from './xnet-followup-policy.mjs';
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
