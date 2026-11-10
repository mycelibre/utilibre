import test from 'node:test';
import assert from 'node:assert/strict';
import {proveSqliteFollowup,sqliteReleaseApproval} from './sqlite-policy.mjs';
import {selectBatch} from '../security-20261103/batch.mjs';
function fixture(suite){
 const s={base:'old',version:suite==='trixie'?'3.46.1-7+deb13u2+utilibre2':'3.40.1-2+deb12u2+utilibre4',candidate:'new',suite,sourceSpecSha256:'spec',buildScriptSha256:'build',sanitizerScriptSha256:'sanitizer',patches:suite==='trixie'?[{file:'session',sha256:'a'},{file:'fts',sha256:'b'}]:[{file:'session',sha256:'a'}],releaseApproval:'approved',releaseScope:'system-sqlite-library-only',dataMigration:false,containers:['fixture']};
 const b={...s,passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true,applicationSha256:'app',unrelatedLibrariesSha256:'libs',imageId:'new-id',sourceReceiptSha256:'receipt',librarySha256:'native',packages:[{name:'libsqlite3-0',version:s.version,sha256:'pkg'}]};
 const n={passed:true,imageId:b.imageId,base:s.base,abiPreserved:true,neededPreserved:true,compileOptionsUnchanged:true,sourceReceiptSha256:'receipt',abi:[{}, {sha256:'native'}],rows:[s.base,b.imageId].map(imageId=>({imageId,passed:true,negativeRowidOutcome:'passed',negativeRowidChecks:9,previousDistinctChecks:5,syntheticBackupRestore:true,corruptFtsRejected:true,sessionChecks:5,secureDeleteChecks:suite==='trixie'?3:0}))};
 const source={suite,passed:true,upstreamSourceFix:true,baselineReproduced:true,afterSanitizersPassed:true,prefixTests:18,distinctTests:87,nativePackagingUnchanged:true,librarySha256:'native',packages:{'libsqlite3-0':{sha256:'pkg'}},sessionTests:100,secureDeleteTests:suite==='trixie'?100:null,advisories:['CVE-2026-119374','CVE-2026-119379'],sourceSpecSha256:s.sourceSpecSha256,buildScriptSha256:s.buildScriptSha256,sanitizerScriptSha256:s.sanitizerScriptSha256,patches:s.patches};
 return {s,b,n,source};
}
test('both exact backports require new and previous behavioral proof',()=>{
 for(const suite of ['bookworm','trixie']){
  const {s,b,n,source}=fixture(suite);assert(proveSqliteFollowup(s,b,n,source));
  for(const delta of [{sessionTests:0},{advisories:[]},{sourceSpecSha256:'other'},{patches:[]},{sanitizerScriptSha256:'other'},{afterSanitizersPassed:false}])assert.throws(()=>proveSqliteFollowup(s,b,n,{...source,...delta}));
  for(const property of ['sessionChecks','negativeRowidChecks','syntheticBackupRestore']){const bad=structuredClone(n);bad.rows[1][property]=0;assert.throws(()=>proveSqliteFollowup(s,b,bad,source));}
  const bad=structuredClone(n);bad.rows[1].secureDeleteChecks=suite==='trixie'?0:3;assert.throws(()=>proveSqliteFollowup(s,b,bad,source));
  assert.throws(()=>proveSqliteFollowup({...s,version:'latest'},b,n,source));
 }
});
test('a successful candidate does not grant deployment approval',()=>{
 const {s}=fixture('trixie');assert(sqliteReleaseApproval(s));
 for(const delta of [{releaseApproval:'candidate'},{releaseScope:'all-packages'},{dataMigration:true},{containers:[]}])assert.throws(()=>sqliteReleaseApproval({...s,...delta}));
});
test('finite profile keeps older batches separate and forbids combinations',()=>{
 const b=selectBatch(['--batch-20261109','--sqlite-followup','prepare','fixture']);assert(b.input('sqlite-followup').pathname.endsWith('security-20261109/sqlite-followup-inputs.json'));
 for(const extra of ['--sqlite','--zlib','--xnet','--anything'])assert.throws(()=>selectBatch(['--batch-20261109','--sqlite-followup',extra]));
 assert.throws(()=>selectBatch(['--batch-20261103','--sqlite-followup']));
});
