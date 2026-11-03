import test from 'node:test';import assert from 'node:assert/strict';import {advisories,proveExpat,expatComparison,expatDescendant} from './expat-policy.mjs';
test('later Expat reviews require an unambiguous completed same-role lineage',()=>{
 const start='2026-11-03T10:00:00Z',end='2026-11-03T12:00:00Z';
 const row={name:'service',oldImage:'a',newImage:'b',completedAt:'2026-11-03T11:00:00Z'};
 assert.equal(expatDescendant('service','a',start,end,[row]),'b');
 assert.equal(expatDescendant('other','a',start,end,[row]),'a');
 assert.equal(expatDescendant('service','a',start,end,[]),'a');
 for(const rows of [[row,{...row,newImage:'c'}],[{...row,completedAt:'2026-11-03T13:00:00Z'}],[row,{...row,oldImage:'b',newImage:'a'}]])assert.throws(()=>expatDescendant('service','a',start,end,rows));
});
test('comparison retains other CVEs, packages, severity and paths',()=>{
 const a={id:advisories[0],package:'libexpat1',installed:'2.9.0-1',severity:'HIGH',target:'debian'};
 assert.equal(expatComparison(a),expatComparison({...a,installed:'2.10.0-1'}));
 for(const [key,value] of Object.entries({id:'CVE-2026-999999',package:'other',severity:'CRITICAL',target:'other'}))assert.notEqual(expatComparison(a),expatComparison({...a,[key]:value}));
});
test('metadata alone cannot establish an Expat fix',()=>{
 const i={advisories,packages:{trixie:{sha256:'fixture'}},libraries:{'libexpat.so.1':'narrow','libexpatw.so.1':'wide'}};
 const s={suite:'trixie',version:'2.10.0-1'},b={version:s.version,pin:i.packages.trixie,passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true,imageId:'candidate',base:'original'};
 const c={passed:true,imageId:b.imageId,base:b.base,abiPreserved:true,neededPreserved:true,nativeRows:[0,1].map(()=>({passed:true,checks:5,subparser:'completed'})),wideRows:[0,1].map(()=>({passed:true,checks:3})),abi:[{imageId:b.imageId,library:'libexpat',sha256:'narrow'},{imageId:b.imageId,library:'libexpatw',sha256:'wide'}]};
 proveExpat(i,s,b,c);
 for(const change of [{passed:false},{wideRows:[]},{abi:[]},{imageId:'wrong'},{nativeRows:[]}])assert.throws(()=>proveExpat(i,s,b,{...c,...change}));
 assert.throws(()=>proveExpat(i,{...s,version:'2.9.0-1'},b,c));
});
