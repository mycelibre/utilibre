import test from 'node:test';import assert from 'node:assert/strict';
import {proveXi,xiComparison,advisories} from './xi-policy.mjs';
const inputs={package:'libxi6',advisories,packages:{trixie:{sha256:'archive'}},librarySha256:'native'};
const s={version:'2:1.8.4-1',base:'old',key:'debian-expanded-penpot-backend'};
const rows=[{imageId:'old',passed:true,checks:14,librarySha256:'previous'},{imageId:'new',passed:true,checks:14,librarySha256:'native'}];
const b={...s,imageId:'new',pin:{sha256:'archive'},passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true,nativeRows:rows};
const c={passed:true,imageId:'new',base:'old',abiPreserved:true,neededPreserved:true,nativeRows:rows,abi:[{}, {sha256:'native'}]};
const a={passed:true,imageId:'new',base:'old',systemAndPrivateRasterParity:true,codecSetPreserved:true,font:{fontforgeTtfOtf:true,woffRoundtrip:true,woff2Roundtrip:true}};
test('libXi release requires matching payload, ABI, both native states and application checks',()=>{
 proveXi(inputs,s,b,c,a);
 for(const delta of [{imageId:'different'},{abiPreserved:false},{neededPreserved:false},{nativeRows:rows.slice(1)},{abi:[{},{sha256:'unreviewed'}]}])assert.throws(()=>proveXi(inputs,s,b,{...c,...delta},a));
 for(const delta of [{pin:{sha256:'other'}},{unrelatedPackagesUnchanged:false},{version:'2:1.8.2-1'}])assert.throws(()=>proveXi(inputs,s,{...b,...delta},c,a));
 assert.throws(()=>proveXi(inputs,s,b,c,{...a,font:{...a.font,woffRoundtrip:false}}));
});
test('comparison preserves all findings outside the two exact package advisories',()=>{
 const v={id:advisories[0],package:'libxi6',installed:'old',severity:'HIGH'};
 assert.equal(xiComparison(v),xiComparison({...v,installed:'new'}));
 for(const delta of [{id:'unrelated'},{package:'other'}])assert.notEqual(xiComparison({...v,...delta}),xiComparison({...v,...delta,installed:'new'}));
});
