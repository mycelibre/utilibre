import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{createHash}from'node:crypto';
import{proveOauthDebian}from'./oauth-debian-policy.mjs';
const inputs=JSON.parse(fs.readFileSync(new URL('./oauth-debian-inputs.json',import.meta.url))),s=inputs.rows[0];
const sha=f=>createHash('sha256').update(fs.readFileSync(new URL(f,import.meta.url))).digest('hex');
const normal={passed:true,checks:13,normalGrantsAndOAuth1Preserved:true,network:'none'};
const b={passed:true,imageId:'candidate',base:s.base,configurationUnchanged:true,consumer:{passed:true,oauthlib:'3.2.2'},baseline:{...normal,identityEscalationReproduced:true,identityMismatchRejected:false},native:{...normal,identityEscalationReproduced:false,identityMismatchRejected:true},changedFiles:s.files.map(f=>s.site+'/'+f.path),patches:inputs.patches,fixtureSha256:sha('./oauth-debian-check.py'),consumerFixtureSha256:sha('../kuma-crypto-final/native.py')};
const app={passed:true,imageId:'candidate',nativeKumaSetupAndLogin:true,network:'none',productionChanged:false};
test('requires reproduced bug, functional native checks and exact application/artifact scope',()=>{
 proveOauthDebian(s,b,app);
 for(const altered of [{...b,base:'unreviewed'}, {...b,changedFiles:[...b.changedFiles,'/etc/passwd']}, {...b,fixtureSha256:'0'.repeat(64)}, {...b,baseline:{...b.baseline,identityEscalationReproduced:false}}, {...b,native:{...b.native,checks:0}}, {...b,consumer:{passed:false}}])assert.throws(()=>proveOauthDebian(s,altered,app));
 for(const altered of [{...app,imageId:'other'},{...app,nativeKumaSetupAndLogin:false},{...app,network:'public'},{...app,productionChanged:true}])assert.throws(()=>proveOauthDebian(s,b,altered));
 assert.throws(()=>proveOauthDebian({...s,key:'other'},b,app));
});
