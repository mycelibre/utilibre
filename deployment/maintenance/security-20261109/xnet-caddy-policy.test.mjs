import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCaddy} from './xnet-caddy-policy.mjs';
function fixture(key='caddy-wishlist'){
 const binary=key==='caddy-wishlist'?'/usr/bin/caddy':'/app/node_modules/.bin/caddy';
 const s={key,binary,approval:'approved',base:'old',imageId:'new',candidate:'candidate',binarySha256:'binary',checkSha256:'checker',databaseSha256:'db',rawEvidence:{before:'before',after:'after'}};
 const b={...s,passed:true,configurationUnchanged:true,allUnrelatedImageFilesUnchanged:true,scopeCheckerSha256:'checker',changedFiles:[binary.slice(1),...['build-info.txt','go.mod','go.sum','modules.txt'].map(f=>'usr/local/share/utilibre-caddy-security/'+f)].sort()};
 const n={passed:true,productionChanged:false,network:'none; isolated internal application fixtures',adapters:[{},{},{}]};
 const row={key,candidateId:'new',base:'old',compiler:'go1.26.10',nativeProxy:true,gzip:true,sse:true,http2:true,configUnchanged:true,applicationUnchanged:true,originalChecksumsMatchOfficialArtifact:true};
 const checks={status:'passed',rows:[row,{key:'other'},{key:'another'}]};
 const app=key==='caddy-wishlist'?{passed:true,imageId:'new',externalBrowserOrigins:[],pageErrors:[],network:'internal; isolated synthetic browser',nativeBlankDatabaseStartup:true,typescriptTransform:true,nativeAccountCreated:true,listCreated:true,itemCreated:true,reloadPersistence:true,anonymousListDenied:true}:{status:'passed',webImage:'new',smtpImage:'new',externalBrowserOrigins:[],nativeMigration:true,browserFeedCreate:true,isolatedSmtpAccepted:true,atomContents:true,nativeDelete:true,backendEgress:'internal bridge, no external route'};
 const scan={passed:true,base:'old',imageId:'new',targetedFindingRemoved:true,newHighCritical:0,databaseSha256:'db',rawEvidence:s.rawEvidence,removedFindings:[['CVE-2026-78661','golang.org/x/net','v0.60.0','HIGH'],['GO-2026-5932','golang.org/x/crypto','v0.57.0','UNKNOWN']],newFindings:[['GO-2026-5932','golang.org/x/crypto','v0.58.0','UNKNOWN']]};
 return [s,b,n,checks,app,scan,Array.from({length:110},(_,i)=>'fixture/'+i)];
}
for(const key of ['caddy-wishlist','caddy-newsletters-web','caddy-newsletters-mail-jobs'])test(key+' accepts only the bounded complete proof',()=>assert(validateCaddy(...fixture(key))));
const rejected={
 'unapproved candidate':f=>{f[0].approval='candidate-only';},
 'different base':f=>{f[1].base='different';},
 'different candidate artifact':f=>{f[1].imageId='different';},
 'application file changed':f=>{f[1].changedFiles.push('app/server.js');},
 'unverified full image':f=>{f[1].allUnrelatedImageFilesUnchanged=false;},
 'live native check':f=>{f[2].productionChanged=true;},
 'missing proxy result':f=>{f[3].rows[0].nativeProxy=false;},
 'broken HTTP2':f=>{f[3].rows[0].http2=false;},
 'different native artifact':f=>{f[3].rows[0].candidateId='different';},
 'anonymous account exposure':f=>{f[4].anonymousListDenied=false;},
 'lost reload persistence':f=>{f[4].reloadPersistence=false;},
 'external browser request':f=>{f[4].externalBrowserOrigins=['https://example.invalid'];},
 'scanner failure':f=>{f[5].passed=false;},
 'different advisory snapshot':f=>{f[5].databaseSha256='changed';},
 'new high finding':f=>{f[5].newHighCritical=1;},
 'unreviewed unknown finding':f=>{f[5].newFindings.push(['unreviewed','other','1','UNKNOWN']);},
 'OpenPGP actually imported':f=>{f[6].push('golang.org/x/crypto/openpgp');},
 'missing dependency coverage':f=>{f[6]=[];},
};
for(const [name,mutate]of Object.entries(rejected))test('reject '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>validateCaddy(...f));});
test('newsletter delivery and deletion are required',()=>{
 for(const key of ['caddy-newsletters-web','caddy-newsletters-mail-jobs'])for(const field of ['isolatedSmtpAccepted','atomContents','nativeDelete']){
  const f=fixture(key);f[4][field]=false;assert.throws(()=>validateCaddy(...f));
 }
});
