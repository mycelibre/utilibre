// Rebind only unchanged Kuma application advisory evidence, not dependencies.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {dir,spec,inspect,sha} from './stage.mjs';
import {replaceImagePins} from '../language-final/release.mjs';
const file=new URL('../advisory-reviews.json',import.meta.url).pathname;
const original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original),read=p=>JSON.parse(fs.readFileSync(dir+'/'+p+'.json'));
const release=read('release'),build=read('build'),native=read('native'),application=read('application');
assert.equal(release.status,'passed');assert(build.passed&&build.configurationUnchanged&&build.unrelatedPackagesUnchanged&&native.passed&&native.noDelivery&&application.passed&&application.nativeSetupLogin);
for(const [p,digest] of Object.entries(release.proofs))assert.equal(sha(fs.readFileSync(dir+'/'+p+'.json')),digest);
assert.equal(inspect(spec.container).Image,build.imageId);assert.equal(reviews['uptime-kuma'].containers['/'+spec.container],spec.base);
reviews['uptime-kuma'].containers['/'+spec.container]=build.imageId;
reviews['uptime-kuma'].runtimeEvidence='2026-10-12 Click-only follow-up: signed Debian Click 8.3.3-3; all application files, configuration, shared libraries, unrelated Python files/packages preserved. Seven native CLI/API checks, isolated Kuma setup/login and exact-image live health passed. See click-followup/README.md. Application version/advisory IDs/ranges unchanged; dependency findings remain separate. '+reviews['uptime-kuma'].runtimeEvidence;
for(const review of Object.values(reviews))for(const [path,before] of Object.entries(review.files||{})){
 if(path!=='/home/ubuntu/freetools/deployment/community/compose.yaml')continue;
 const current=fs.readFileSync(path,'utf8');if(sha(current)===before)continue;
 const reversed=replaceImagePins(current,[{from:spec.candidate,to:spec.baseRef}]);assert.equal(reversed.replaced,1);assert.equal(sha(reversed.text),before);review.files[path]=sha(current);
}
const before=original.split('\n'),after=(JSON.stringify(reviews,null,2)+'\n').split('\n');assert.equal(before.length,after.length);
const hunks=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])hunks.push('@@\n-'+before[i]+'\n+'+after[i]);assert(hunks.length);
console.log('*** Begin Patch\n*** Update File: '+file+'\n'+hunks.join('\n')+'\n*** End Patch');
