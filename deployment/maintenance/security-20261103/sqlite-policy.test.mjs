import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {proveSqlite,sqliteComparison} from './sqlite-policy.mjs';
const s={base:'old',version:'native+1',candidate:'new',suite:'bookworm'};
const b={...s,passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true,applicationSha256:'app',unrelatedLibrariesSha256:'libs',imageId:'new-id',sourceReceiptSha256:'receipt',librarySha256:'native',packages:[{name:'libsqlite3-0',version:s.version,sha256:'pkg'}]};
const n={passed:true,imageId:'new-id',base:s.base,abiPreserved:true,neededPreserved:true,compileOptionsUnchanged:true,sourceReceiptSha256:'receipt',abi:[{}, {sha256:'native'}],rows:[s.base,b.imageId].map(imageId=>({imageId,passed:true,negativeRowidOutcome:'passed',negativeRowidChecks:9,previousDistinctChecks:5,syntheticBackupRestore:true,corruptFtsRejected:true}))};
const source={suite:s.suite,passed:true,upstreamSourceFix:true,baselineReproduced:true,afterSanitizersPassed:true,prefixTests:18,distinctTests:87,nativePackagingUnchanged:true,librarySha256:'native',packages:{'libsqlite3-0':{sha256:'pkg'}}};
test('requires the exact native package, behavior, ABI and source evidence',()=>{
 assert(proveSqlite(s,b,n,source));
 const reproduced=structuredClone(n);Object.assign(reproduced.rows[0],{negativeRowidChecks:0,negativeRowidOutcome:'allocator-failure'});assert(proveSqlite(s,b,reproduced,source));
 const failed=structuredClone(n);Object.assign(failed.rows[1],{negativeRowidChecks:0,negativeRowidOutcome:'allocator-failure'});assert.throws(()=>proveSqlite(s,b,failed,source));
 for(const delta of [{base:'wrong'},{version:'latest'},{configurationUnchanged:false},{unrelatedPackagesUnchanged:false},{librarySha256:'other'}])assert.throws(()=>proveSqlite(s,{...b,...delta},n,source));
 for(const delta of [{compileOptionsUnchanged:false},{abiPreserved:false},{neededPreserved:false},{rows:[n.rows[1]]},{sourceReceiptSha256:'stale'}])assert.throws(()=>proveSqlite(s,b,{...n,...delta},source));
 for(const delta of [{suite:'unknown'},{baselineReproduced:false},{afterSanitizersPassed:false},{distinctTests:0},{nativePackagingUnchanged:false}])assert.throws(()=>proveSqlite(s,b,n,{...source,...delta}));
});
test('comparison changes only the reviewed SQLite package version',()=>{
 const f={id:'CVE-test',package:'libsqlite3-0',installed:'old',severity:'HIGH',type:'debian',path:'native'};
 assert.equal(sqliteComparison(f),sqliteComparison({...f,installed:'native+1'}));
 for(const delta of [{id:'new'},{severity:'CRITICAL'},{type:'binary'},{path:'different'}])assert.notEqual(sqliteComparison(f),sqliteComparison({...f,...delta}));
 assert.notEqual(sqliteComparison({...f,package:'other'}),sqliteComparison({...f,package:'other',installed:'new'}));
});
test('Bookworm context adjustment preserves the upstream code and regression changes',()=>{
 const edits=file=>fs.readFileSync(new URL(file,import.meta.url),'utf8').split('\n').filter(l=>/^[+-]/.test(l)&&!/^---|^\+\+\+/.test(l));
 assert.deepEqual(edits('./sqlite-rowid.patch'),edits('./sqlite-rowid-bookworm.patch'));
});

import {sqliteEligible}from'./sqlite-policy.mjs';
test('SQLite review excludes other packages, versions, hosts and advisory scopes',()=>{const i={status:'needs-review',scope:'runtime-image',type:'debian',package:'libsqlite3-0',installed:'3.46.1-7+deb13u2+utilibre1',id:'CVE-2026-119373',containers:['fixture']};assert(sqliteEligible(i));for(const change of [{scope:'host-os'},{type:'npm'},{package:'libsqlite3-dev'},{installed:'3.46.1-7+deb13u2'},{id:'CVE-9999-11111'},{containers:[]},{status:'not-rechecked'}])assert(!sqliteEligible({...i,...change}));});
