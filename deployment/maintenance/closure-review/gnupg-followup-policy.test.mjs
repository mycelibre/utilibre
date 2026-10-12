import test from 'node:test';
import assert from 'node:assert/strict';
import {gnupgReview,gnupgFollowupStatus} from './gnupg-followup-policy.mjs';
import {current,pins,version,names} from '../gnupg-component-followup/policy.mjs';
const image='sha256:'+'a'.repeat(64),base={id:'CVE-2026-24882',type:'debian',scope:'runtime-image',artifact:image,targetName:image,containers:[names[0]],package:'gpgv',installed:current};
test('only reviewed exporter packages and exact current versions',()=>{
 for(const packageName of Object.keys(pins))assert.equal(gnupgFollowupStatus(gnupgReview,{...base,package:packageName,installed:version(packageName)}),'not-affected');
});
test('frontend gpgv and retained role-specific stale metadata',()=>{
 for(const row of [base,{...base,containers:[names[1]]},{...base,installed:'2.4.7-21+deb13u1+dhi3'},{...base,containers:[names[1]],installed:'2.4.7-21+deb13u1+dhi2'}])assert.equal(gnupgFollowupStatus(gnupgReview,row),'not-affected');
});
for(const [name,patch]of Object.entries({otherCVE:{id:'CVE-2026-99999'},host:{scope:'host-os'},otherType:{type:'binary'},daemon:{package:'tpm2daemon'},unreviewedVersion:{installed:'2.4.7-21+deb13u1'},laterVendor:{installed:'2.4.7-21+deb13u1+dhi5'},otherRole:{containers:['utilibre-expanded-penpot-backend-1']},mixedRoles:{containers:names},invalidArtifact:{artifact:'host-dpkg'},targetMismatch:{targetName:'other'},wrongStaleExporter:{installed:'2.4.7-21+deb13u1+dhi2'},wrongStaleFrontend:{containers:[names[1]],installed:'2.4.7-21+deb13u1+dhi3'},unreviewedFrontendPackage:{containers:[names[1]],package:'gpg'}}))test('reject '+name,()=>assert.throws(()=>gnupgFollowupStatus(gnupgReview,{...base,...patch})));
test('reject unknown reviewer',()=>assert.throws(()=>gnupgFollowupStatus('other/review.json',base)));
