import assert from 'node:assert/strict';
import test from 'node:test';
import {verifyCompose,verifyOverlay} from './review-advisories.mjs';
const original='image: utilibre-actual:mount-security-20261012\nimage: utilibre-resume:mount-security-20261012\npenpot: unchanged\n';
const candidate=original.replaceAll(':mount-security-20261012',':runtime-minimal-20261012');
test('only the two reviewed unrelated Compose image changes are accepted',()=>{
 verifyCompose(original,candidate);
 assert.throws(()=>verifyCompose(original,candidate.replace('penpot: unchanged','penpot: changed')));
 assert.throws(()=>verifyCompose(original+original,candidate));
});
const fixture=()=>[
 {status:'passed',name:'test',oldImage:'old',newImage:'new'},
 {containers:{'/test':'old'}},
 {passed:true,configurationUnchanged:true,filesystemParity:true,base:'old',imageId:'new',packageRemovalExact:['apt','libgnutls30:amd64'],packagesBefore:{apt:['2.6.1'],'libgnutls30:amd64':['3.7.9'],app:['1.0']},packagesAfter:{app:['1.0']},changedPaths:['/usr/bin/apt']},
 {passed:true,imageId:'new',date:'2026-10-12'},
 {'/usr/bin/apt':{sha256:'old'},'/app/index.js':{sha256:'unchanged'}},
 {'/app/index.js':{sha256:'unchanged'}},['parent'],['parent','layer'],new Set(['/usr/bin/apt'])
];
test('exact completed runtime-only reduction retains the historical native test date',()=>{
 const r=verifyOverlay(...fixture());assert.equal(r.applicationTestDate,'2026-10-12');assert.equal(r.changedFiles,1);
});
for(const key of ['passed','configurationUnchanged','filesystemParity'])test('reject missing '+key,()=>{
 const f=fixture();f[2][key]=false;assert.throws(()=>verifyOverlay(...f));
});
test('changed application file cannot inherit its earlier advisory review',()=>{
 const f=fixture();f[5]['/app/index.js'].sha256='changed';f[2].changedPaths.unshift('/app/index.js');assert.throws(()=>verifyOverlay(...f),/Unexpected changed file/);
});
test('changed dependency, unknown ownership and missing image ancestry fail',()=>{
 const f=fixture();f[2].packagesAfter.app=['2.0'];assert.throws(()=>verifyOverlay(...f));
 const g=fixture();g[8]=new Set();assert.throws(()=>verifyOverlay(...g));
 const h=fixture();h[7]=['other','layer'];assert.throws(()=>verifyOverlay(...h));
});
test('failed app check, wrong parent and changed immutable candidate fail',()=>{
 const f=fixture();f[3].passed=false;assert.throws(()=>verifyOverlay(...f));
 const g=fixture();g[1].containers['/test']='different';assert.throws(()=>verifyOverlay(...g));
 const h=fixture();h[3].imageId='different';assert.throws(()=>verifyOverlay(...h));
});
