// Pinned upstream repair, known failing baselines and exact ABI/package scope.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const dir='/var/lib/utilibre-maintenance/security-20261104/mongocrypt',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),spec=read(new URL('./mongocrypt-inputs.json',import.meta.url));
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
const auth=read(dir+'/authenticated.json');assert.equal(auth.status,'passed');assert.deepEqual(auth.sourceFiles,spec.sourceArchives);assert.deepEqual(auth.patches,spec.patches);
for(const p of [...spec.sourceArchives,...spec.patches])assert.equal(sha(dir+'/source/'+p.file),p.sha256);
for(const p of spec.acquiredBuildPackages)assert.equal(sha(dir+'/output/debs/'+p.file),p.sha256);
assert.equal(sha(dir+'/output/build-packages.lock'),spec.buildPackageInventorySha256);
assert.equal(fs.readFileSync(dir+'/output/native-suite.exit','utf8').trim(),'0');
const log=fs.readFileSync(dir+'/output/native-suite.log','utf8'),begin=[...log.matchAll(/^  begin (.+)$/gm)].map(m=>m[1]),end=[...log.matchAll(/  end ([_a-zA-Z0-9]+)$/gm)].map(m=>m[1]);assert(begin.length>100);assert.deepEqual(begin,end);assert(log.includes('... done running tests'));
const names=['test_mongocrypt_key_parsing_duplicate_master_key','test_mongocrypt_kek_parse_failure_leaves_kek_intact'];assert(names.every(n=>begin.includes(n)));
for(const [name,pattern]of [['duplicate',/succeeded \(but should have failed\).*duplicate field 'masterKey'/s],['kek',/comparison failed: 1 == 8/]]){assert.equal(fs.readFileSync(dir+'/output/regression-before-'+name+'.exit','utf8').trim(),'134');assert.match(fs.readFileSync(dir+'/output/regression-before-'+name+'.log','utf8'),pattern);}
const file=spec.package+'_'+spec.version+'_amd64.deb';assert.equal(run('dpkg-deb',['-f',dir+'/output/'+file,'Version']),spec.version);const packageSha256=sha(dir+'/output/'+file);
const installed=dir+'/install';if(!fs.existsSync(installed))run('dpkg-deb',['-x',dir+'/output/'+file,installed]);
const bytes=cp.execFileSync('docker',['run','--rm','--network','none','--read-only','--user','65534:65534','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.5','--pids-limit','32','--entrypoint','cat',spec.base,spec.library],{timeout:30000,maxBuffer:8*1024**2});fs.writeFileSync(dir+'/before.so',bytes);
const library=installed+spec.library;assert(fs.existsSync(library));
const symbols=p=>run('nm',['-D','--defined-only',p]).split('\n').map(l=>l.trim().split(/\s+/).slice(1).join(' ')).sort();
const dynamic=p=>run('readelf',['-d',p]).split('\n').filter(l=>/SONAME|NEEDED|BIND_NOW/.test(l)).map(l=>l.slice(l.indexOf('(')));
assert.deepEqual(symbols(library),symbols(dir+'/before.so'));assert.deepEqual(dynamic(library),dynamic(dir+'/before.so'));
const old=dir+'/work',fixed=dir+'/verified-source';
if(!fs.existsSync(fixed)){fs.copyFileSync(dir+'/source/libmongocrypt_1.13.2.orig.tar.gz',dir+'/output/libmongocrypt_1.13.2.orig.tar.gz');run('dpkg-source',['--no-check','-x',dir+'/output/libmongocrypt_'+spec.version+'.dsc',fixed]);}
const walk=(d,p='')=>fs.readdirSync(d,{withFileTypes:true}).filter(e=>e.name!=='.pc').flatMap(e=>e.isDirectory()?walk(d+'/'+e.name,p+e.name+'/'):e.isFile()?[p+e.name]:[]);
const changed=[...new Set([...walk(old),...walk(fixed)])].sort().filter(p=>!fs.existsSync(old+'/'+p)||!fs.existsSync(fixed+'/'+p)||sha(old+'/'+p)!==sha(fixed+'/'+p));
const expected=['debian/changelog','debian/patches/series',...spec.patches.map(p=>'debian/patches/utilibre-'+p.file),'src/mongocrypt-kek.c','src/mongocrypt-key.c','test/test-mongocrypt-kek.c','test/test-mongocrypt-key.c'].sort();assert.deepEqual(changed,expected);
const vendor='0001_CVE-2026-81523.patch';assert.equal(sha(old+'/debian/patches/'+vendor),sha(fixed+'/debian/patches/'+vendor));for(const p of spec.patches)assert.equal(sha(fixed+'/debian/patches/utilibre-'+p.file),p.sha256);
const sourcePins=Object.fromEntries(['libmongocrypt_'+spec.version+'.dsc','libmongocrypt_'+spec.version+'.debian.tar.xz'].map(file=>[file,sha(dir+'/output/'+file)]));
const r={schema:1,date:new Date().toISOString(),status:'passed',version:spec.version,packages:{[file]:packageSha256},libraries:[{path:spec.library,sha256:sha(library),beforeSha256:sha(dir+'/before.so')}],abiExports:symbols(library).length,abiUnchanged:true,unitCases:begin.length-1,unitNames:begin.filter(n=>n!=='_test_encrypt_macos_no_ctr'),skipped:['_test_encrypt_macos_no_ctr','_test_crypto_hooks_unset','test_is_crypto_available_with_crypto_prohibited'],baselineFailures:2,regressionNames:names,network:'none',compilerBase:spec.compilerBase,buildPackagesSha256:spec.buildPackageInventorySha256,changed,vendorPatchesPreserved:[vendor],sourcePins,productionChanged:false,byteReproducibilityClaimed:false};
fs.writeFileSync(dir+'/native.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({status:r.status,unitCases:r.unitCases,baselineFailures:2,abiExports:r.abiExports,packageSha256}));
