// Synthetic identity provider through MSAL's networkClient; container has no network.
import assert from 'node:assert/strict';import {createRequire}from'node:module';
const require=createRequire('/app/package.json'),site='/app/node_modules/@azure/msal-node';
const mode=process.argv[2];assert(['baseline','fixed'].includes(mode));
const host='login.microsoftonline.com',tenant='00000000-0000-0000-0000-000000000002',authority=`https://${host}/${tenant}`;
const metadata={authorization_endpoint:authority+'/oauth2/v2.0/authorize',token_endpoint:authority+'/oauth2/v2.0/token',issuer:authority+'/v2.0',jwks_uri:authority+'/discovery/v2.0/keys',end_session_endpoint:authority+'/oauth2/v2.0/logout'};
const scopes=['user.read'],redirectUri='https://client.example.invalid/callback',rows=[];
for(const format of ['cjs','esm']){
 const msal=format==='cjs'?require(site):await import(site+'/dist/index.mjs');
 const calls=[];
 const networkClient={async sendGetRequestAsync(url){calls.push({method:'GET',url});return {status:200,headers:{},body:metadata};},async sendPostRequestAsync(url,options){calls.push({method:'POST',url,body:options.body});return {status:200,headers:{},body:{access_token:'fictional-token',token_type:'Bearer',expires_in:3600,scope:'user.read'}};}};
 const config=()=>({auth:{clientId:'00000000-0000-0000-0000-000000000001',clientSecret:'fictional-local-test-secret',authority,knownAuthorities:[host],authorityMetadata:JSON.stringify(metadata)},system:{networkClient,loggerOptions:{loggerCallback:()=>{},piiLoggingEnabled:false}}});
 const make=()=>new msal.ConfidentialClientApplication(config());let normalChecks=0;
 const url=new URL(await make().getAuthCodeUrl({scopes,redirectUri,state:'fictional-state',nonce:'fictional-nonce'}));assert.equal(url.origin,'https://'+host);assert.equal(url.searchParams.get('state'),'fictional-state');assert.equal(url.searchParams.get('nonce'),'fictional-nonce');normalChecks++;
 const app=make();
 const result=await app.acquireTokenByCode({scopes,redirectUri,code:'fictional-code'});assert.equal(result.accessToken,'fictional-token');normalChecks++;
 const credential=await make().acquireTokenByClientCredential({scopes:['https://graph.microsoft.com/.default']});assert.equal(credential.accessToken,'fictional-token');normalChecks++;
 await assert.rejects(make().acquireTokenByCode({scopes,redirectUri,code:'fictional-code',state:'expected'},{code:'fictional-code',state:'wrong'}),e=>e.errorCode==='state_mismatch');normalChecks++;
 const matching=await make().acquireTokenByCode({scopes,redirectUri,code:'fictional-code',state:'matching'},{code:'fictional-code',state:'matching'});assert.equal(matching.accessToken,'fictional-token');normalChecks++;
 const cache=app.getTokenCache().serialize();assert(cache.includes('fictional-token'));const copy=make();copy.getTokenCache().deserialize(cache);assert.equal(copy.getTokenCache().serialize(),cache);normalChecks++;
 const allowed=new msal.ConfidentialClientApplication({...config(),auth:{...config().auth,instanceAware:false}});assert(allowed);normalChecks++;
 // Test the routing payload boundary the upstream regression exercises, while
 // keeping the parent token request entirely local and recording only fields.
 const parent=Object.getPrototypeOf(msal.ConfidentialClientApplication.prototype),original=parent.acquireTokenByCode;let received;
 parent.acquireTokenByCode=async function(request,payload){received=payload;return {accessToken:'intercepted'};};
 try{
  await make().acquireTokenByCode({scopes,redirectUri,code:'trusted-code',nonce:'trusted-nonce'},{code:'untrusted-code',state:'matching',nonce:'untrusted-nonce',cloud_instance_host_name:'untrusted.example.invalid',cloud_instance_name:'untrusted',msgraph_host:'untrusted.example.invalid'});
 }finally{parent.acquireTokenByCode=original;}
 const sanitized=received.code==='trusted-code'&&received.nonce==='trusted-nonce'&&received.state==='matching'&&!Object.hasOwn(received,'cloud_instance_host_name')&&!Object.hasOwn(received,'cloud_instance_name')&&!Object.hasOwn(received,'msgraph_host');
 let configRejected=false;try{new msal.ConfidentialClientApplication({...config(),auth:{...config().auth,instanceAware:true}});}catch(e){assert.equal(e.errorCode,'unsupported_cca_instance_aware');configRejected=true;}
 const rejected=[];for(const value of ['true','false','']){try{await make().getAuthCodeUrl({scopes,redirectUri,extraQueryParameters:{instance_aware:value}});rejected.push(false);}catch(e){assert.equal(e.errorCode,'unsupported_cca_instance_aware');rejected.push(true);}}
 assert.equal(sanitized,mode==='fixed');assert.equal(configRejected,mode==='fixed');assert.deepEqual(rejected,[mode==='fixed',mode==='fixed',mode==='fixed']);
 assert(calls.some(r=>r.method==='POST'&&new URLSearchParams(r.body).get('grant_type')==='client_credentials'));
 assert(calls.every(r=>new URL(r.url).hostname===host));assert.equal(normalChecks,7);
 rows.push({format,passed:true,normalChecks,sanitized,configRejected,queryRejections:rejected,syntheticTransportOnly:true});
}
console.log(JSON.stringify({passed:true,rows,network:false,realCredentials:false,limitation:'Native token/cache/state behavior and upstream payload boundary tested with a synthetic provider; no live Microsoft tenant or external exploit claimed.'}));
