import test from 'node:test';import assert from 'node:assert/strict';import {eligible} from './source-policy.mjs';
const fixture={status:'needs-review',scope:'runtime-image',artifact:'sha256:'+'a'.repeat(64),type:'python-pkg',package:'nltk',installed:'3.10.3',id:'GHSA-j456-xh4h-cpf2',containers:['utilibre-kitchenowl-app-1']};
test('MSAL review requires its exact package/advisory/version/role',()=>{
 const i={...fixture,type:'node-pkg',package:'@azure/msal-node',installed:'5.6.0',id:'CVE-2026-109461',containers:['utilibre-community-uptime-kuma-1']};
 assert(eligible(i,'msal'));
 for(const changed of [{installed:'6.0.0'},{package:'@azure/identity'},{id:'another-advisory'},{scope:'tracked-build-input'},{containers:['another-app']},{type:'javascript'}])assert.equal(eligible({...i,...changed},'msal'),false);
});
test('NLTK requires the exact advisory, package, version, role and scope',()=>{
 assert(eligible(fixture,'nltk'));
 for(const changed of [{id:'CVE-2026-81726'},{installed:'3.10.4'},{containers:[]},{containers:['another-app']},{scope:'tracked-build-input'},{artifact:'moving-tag'},{status:'accepted'},{type:'npm'}])assert.equal(eligible({...fixture,...changed},'nltk'),false);
});
test('Symfony ties each advisory to its actual package and complete role set',()=>{
 const i={...fixture,type:'composer-vendor',package:'symfony/http-foundation',installed:'v7.4.14',id:'CVE-2026-108082',containers:['utilibre-pollaris-worker-1','utilibre-pollaris-pollaris-1']};
 assert(eligible(i,'symfony'));assert(eligible({...i,package:'symfony/yaml',id:'CVE-2026-109413'},'symfony'));
 for(const changed of [{type:'composer'},{installed:'7.4.14'},{package:'symfony/yaml'},{id:'CVE-2026-109413'},{containers:['utilibre-pollaris-pollaris-1']},{installed:'v5.4.50'}])assert.equal(eligible({...i,...changed},'symfony'),false);
 assert(eligible({...i,installed:'v5.4.50',containers:['utilibre-wallabag-app-1']},'symfony'));
 assert.equal(eligible(i,'unknown'),false);
});
