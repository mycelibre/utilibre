import test from 'node:test';import assert from 'node:assert/strict';
import {eligible,prove,binarySha256,changedFiles} from './nginx-debian-policy.mjs';
const i={status:'needs-review',scope:'runtime-image',type:'debian',id:'CVE-2026-15176',package:'nginx',installed:'1.22.1-9+deb12u10',containers:['utilibre-community-rssbridge-1']};
test('NGINX review is limited to exact source-family records and role',()=>{
 assert(eligible(i));assert(eligible({...i,package:'nginx-common'}));
 for(const x of [{scope:'host-os'},{type:'alpine'},{id:'CVE-2026-12345'},{package:'libssl3'},{installed:'1.22.1-9+deb12u11'},{containers:['other']},{containers:[...i.containers,'other']}])assert(!eligible({...i,...x}));
});
test('NGINX candidate requires exact signed bytes, whole-image scope and both real application states',()=>{
 const b={passed:true,configurationUnchanged:true,packageMetadataPreserved:true,version:'1.30.6',base:'sha256:b540fb1d954f85cd6bb1ee8e69c8b935db30ecbbc4e7ab8408687b27a47b3914',imageId:'candidate',binarySha256,pin:{sha256:'8e505dccb99697371eb72fe1c58d29d82f7a3c4f0f8eb57d65df72d44edb676f'},changedFiles};
 const a={passed:true,imageId:b.imageId,consumerUnchanged:true,rows:[b.base,b.imageId].map(imageId=>({imageId,passed:true,checks:14,nativeNginxPhp:true,privatePathsDenied:true,boundedRateLimit:true}))};
 const v={passed:true,imageId:b.imageId,changedPaths:changedFiles},s={passed:true,imageId:b.imageId,primarySourceFixVerified:true,newHighCritical:0};prove(b,a,v,s);
 for(const x of [{version:'1.30.5'},{base:'other'},{binarySha256:'bad'},{packageMetadataPreserved:false},{changedFiles:[...changedFiles,'/app/index.php']}])assert.throws(()=>prove({...b,...x},a,v,s));
 for(const x of [{consumerUnchanged:false},{rows:a.rows.slice(1)},{rows:a.rows.map(r=>({...r,privatePathsDenied:false}))}])assert.throws(()=>prove(b,{...a,...x},v,s));
 assert.throws(()=>prove(b,a,{...v,changedPaths:['/usr/sbin/nginx']},s));assert.throws(()=>prove(b,a,v,{...s,newHighCritical:1}));
});
