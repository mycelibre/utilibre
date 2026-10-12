import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,version,oldVersion,names,commit,sha,read,run,docker,limits,base} from './common.mjs';
process.umask(0o077);
assert(!fs.existsSync(root+'/native.json'));
const auth=read(root+'/authenticated.json');assert.equal(auth.status,'passed');assert.equal(auth.commit,commit);
assert.equal(fs.readFileSync(root+'/output/tests-passed','utf8').trim(),'passed-with-baseline-failures');
// Upstream 1.30 test reporter emits one trailing comma in framework metadata.
const testResult=f=>JSON.parse(fs.readFileSync(root+'/output/'+f,'utf8').replace('"skipLiveTests": false,','"skipLiveTests": false'));
const baseline=testResult('baseline-bson-results.json');assert.deepEqual(baseline.results.map(r=>[r.test_file,r.status]),[['/bson/validate','fail'],['/bson/validate/dbref','fail']]);
const tests={},skipped={};for(const name of ['ocsp','offline']){const result=testResult(name+'-results.json');assert(result.results.length);const failed=result.results.filter(r=>!['pass','skip'].includes(r.status));assert.deepEqual(failed.map(r=>[r.test_file,r.status]),name==='offline'?baseline.results.map(r=>[r.test_file,r.status]):[]);tests[name]=result.results.filter(r=>r.status==='pass').map(r=>r.test_file);skipped[name]=result.results.filter(r=>r.status==='skip').map(r=>r.test_file);assert.deepEqual(skipped[name],name==='offline'?['/bson/string/capacity','/bson/value/big_copy']:[]);}
assert.deepEqual(tests.ocsp,['/OCSP/responder/url_parse_errors']);assert(tests.offline.length>100);
const symbols=f=>fs.readFileSync(root+'/output/'+f,'utf8').trim().split('\n');
const dynamic=f=>{const t=fs.readFileSync(root+'/output/'+f,'utf8');return{soname:t.match(/SONAME.*\[([^\]]+)\]/)[1],needed:[...t.matchAll(/NEEDED.*\[([^\]]+)\]/g)].map(m=>m[1]).sort(),bindNow:t.includes('BIND_NOW')};};
const libraries=['libbson-1.0.so.0','libmongoc-1.0.so.0'].map(n=>{const old=symbols(n+'.old-symbols'),next=symbols(n+'.new-symbols');assert(old.every(s=>next.includes(s)));const added=next.filter(s=>!old.includes(s));assert.deepEqual(added,n.startsWith('libmongoc')?['T _mongoc_contact_ocsp_responder']:[]);assert.deepEqual(dynamic(n+'.old-dynamic'),dynamic(n+'.new-dynamic'));const path='/usr/lib/x86_64-linux-gnu/'+n+'.0.0';return{path,sha256:sha(fs.readFileSync(root+'/output/install'+path)),oldExports:old.length,newExports:next.length,added,dynamic:dynamic(n+'.new-dynamic')};});
const packages=Object.fromEntries(names.map(n=>{const file=n+'_'+version+'_amd64.deb';assert.equal(run('dpkg-deb',['-f',root+'/output/'+file,'Version']),version);return[file,sha(fs.readFileSync(root+'/output/'+file))];}));
const fixture=root+'/fixture';fs.mkdirSync(fixture,{recursive:true,mode:0o755});fs.chmodSync(fixture,0o755);fs.copyFileSync(root+'/output/mongo-native',fixture+'/mongo-native');fs.chmodSync(fixture+'/mongo-native',0o755);
for(const row of libraries){const basename=row.path.split('/').at(-1).replace(/\.0\.0$/,'');fs.copyFileSync(root+'/output/install'+row.path,fixture+'/'+basename);fs.chmodSync(fixture+'/'+basename,0o644);}
for(const over of [false,true]){const output=docker('run',...limits,'--user','65534:65534','--mount','type=bind,src='+fixture+',dst=/checks,readonly',...(over?['-e','LD_LIBRARY_PATH=/checks']:[]),'--entrypoint','/checks/mongo-native',base);assert.match(output,/passed/);fs.writeFileSync(root+(over?'/candidate-native.log':'/baseline-native.log'),output+'\n');}
const sourceNew=root+'/source-new',sourceOld=root+'/source-old';assert(!fs.existsSync(sourceNew));assert(!fs.existsSync(sourceOld));
run('dpkg-source',['--no-check','-x',root+'/output/mongo-c-driver_'+version+'.dsc',sourceNew]);
run('dpkg-source',['--no-check','-x',root+'/input/mongo-c-driver_'+oldVersion+'.dsc',sourceOld]);
const series=fs.readFileSync(sourceOld+'/debian/patches/series','utf8').trim().split('\n').filter(l=>l&&!l.startsWith('#'));assert.equal(series.length,10);
for(const name of series)assert.equal(sha(fs.readFileSync(sourceOld+'/debian/patches/'+name)),sha(fs.readFileSync(sourceNew+'/debian/patches/'+name)));
assert.equal(sha(fs.readFileSync(sourceNew+'/debian/patches/utilibre-CVE-2026-84964.patch')),auth.patchSha256);
assert.deepEqual(fs.readFileSync(sourceNew+'/debian/patches/series','utf8').trim().split('\n'),[...series,'utilibre-CVE-2026-84964.patch']);
const list=(dir,p='')=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>['.pc'].includes(e.name)?[]:e.isDirectory()?list(dir+'/'+e.name,p+e.name+'/'):e.isFile()?[p+e.name]:[]);
const union=[...new Set([...list(sourceOld),...list(sourceNew)])].sort();const changed=union.filter(f=>!fs.existsSync(sourceOld+'/'+f)||!fs.existsSync(sourceNew+'/'+f)||sha(fs.readFileSync(sourceOld+'/'+f))!==sha(fs.readFileSync(sourceNew+'/'+f)));
assert.deepEqual(changed,['debian/changelog','debian/patches/series','debian/patches/utilibre-CVE-2026-84964.patch','src/libmongoc/CMakeLists.txt','src/libmongoc/src/mongoc/mongoc-openssl-private.h','src/libmongoc/src/mongoc/mongoc-openssl.c','src/libmongoc/tests/test-libmongoc-main.c','src/libmongoc/tests/test-mongoc-ocsp.c']);
const sourcePins=Object.fromEntries(['mongo-c-driver_'+version+'.dsc','mongo-c-driver_'+version+'.debian.tar.xz'].map(f=>[f,sha(fs.readFileSync(root+'/output/'+f))]));
const record={schema:1,date:new Date().toISOString(),status:'passed',version,oldVersion,commit,patchSha256:auth.patchSha256,authenticatedSha256:sha(fs.readFileSync(root+'/authenticated.json')),packages,libraries,tests,skipped,baselineFailures:baseline.results.map(r=>r.test_file),oldHeadersAndNativeConsumerPassed:true,vendorPatchesPreserved:series,changed,sourcePins,productionChanged:false};
fs.writeFileSync(root+'/native.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:'passed',tests:Object.fromEntries(Object.entries(tests).map(([k,v])=>[k,v.length])),packages,libraries}));
