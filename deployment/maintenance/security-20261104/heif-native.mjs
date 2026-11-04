// Exact source/package scope plus bounded existing consumer and metadata tests.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,spec,upgrade,version,packageName,packageSha256,sha,read,run,docker,limits} from '../heif-bookworm-followup/common.mjs';
import {proveNative} from './heif-policy.mjs';
process.umask(0o077);assert(upgrade&&process.argv.length===3);assert(!fs.existsSync(root+'/native.json'));
const hash=p=>sha(fs.readFileSync(p));
assert.equal(hash(root+'/'+spec.archive.file),spec.archive.sha256);
const release=read(root+'/upstream-release-1.23.7.json');assert.equal(release.tag_name,'v1.23.7');
assert.equal(release.assets.find(a=>a.name===spec.archive.file).digest,'sha256:'+spec.archive.sha256);
assert.equal(hash(new URL('./'+spec.patch.file,import.meta.url)),spec.patch.sha256);
assert.equal(hash(root+'/libheif-1.23.7/libheif/compression_zlib.cc'),spec.patch.beforeSha256);
assert.equal(hash(root+'/compiled-source/libheif/compression_zlib.cc'),spec.patch.afterSha256);
const walk=(dir,p='')=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name,p+e.name+'/'):e.isFile()?[p+e.name]:[]);
const before=root+'/libheif-1.23.7',after=root+'/compiled-source';
const changed=[...new Set([...walk(before),...walk(after)])].sort().filter(f=>!fs.existsSync(before+'/'+f)||!fs.existsSync(after+'/'+f)||hash(before+'/'+f)!==hash(after+'/'+f));
assert.deepEqual(changed,['libheif/compression_zlib.cc']);
for(const[f,h]of Object.entries(spec.packaging))assert.equal(hash(after+'/'+f),h);
for(const p of spec.acquiredBuildPackages)assert.equal(hash(root+'/acquired-debs/'+p.file),p.sha256);
assert.equal(hash(root+'/output/build-packages.lock'),spec.buildPackageInventorySha256);
for(const r of spec.priorFixes){const p=root+'/ancestry-'+r.commit+'.json';assert.equal(hash(p),r.sha256);const c=read(p);assert.equal(c.base_commit.sha,r.commit);assert.equal(c.merge_base_commit.sha,r.commit);assert.equal(c.status,'ahead');}
const xml=fs.readFileSync(root+'/output/upstream-tests.xml','utf8');
const cases=[...xml.matchAll(/<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/g)].map(m=>({name:m[1].match(/name="([^"]+)"/)[1],skip:/<skipped\b/.test(m[2]),fail:/<(failure|error)\b/.test(m[2])}));
const upstream={programs:cases.length,passed:cases.filter(c=>!c.skip&&!c.fail).length,skipped:cases.filter(c=>c.skip).length,failed:cases.filter(c=>c.fail).length,passingNames:cases.filter(c=>!c.skip&&!c.fail).map(c=>c.name),skippedNames:cases.filter(c=>c.skip).map(c=>c.name)};
assert.match(fs.readFileSync(root+'/metadata-before.log','utf8'),/limited metadata: 2\/150 Invalid input/);
assert.equal(hash(root+'/output/'+packageName),packageSha256);
assert.equal(run('dpkg-deb',['-f',root+'/output/'+packageName,'Version']),version);
const install=root+'/install';run('dpkg-deb',['-x',root+'/output/'+packageName,install]);
const fixtures=root+'/fixtures';fs.mkdirSync(fixtures,{recursive:true,mode:0o755});fs.chmodSync(fixtures,0o755);
for(const f of ['heif-native','gdal-heif','fictional.heic','fictional.avif'])fs.copyFileSync('/var/lib/utilibre-maintenance/heif-bookworm-followup-20261012/fixtures/'+f,fixtures+'/'+f);
for(const f of ['heif-metadata','metadata.heic','legacy-metadata.heic','metadata-raw.heic','metadata-bad-checksum.heic','metadata-bad-header.heic'])fs.copyFileSync(root+'/output/'+f,fixtures+'/'+f);
for(const f of fs.readdirSync(fixtures))fs.chmodSync(fixtures+'/'+f,f.endsWith('.heic')||f.endsWith('.avif')?0o644:0o755);
fs.copyFileSync(install+spec.library,fixtures+'/libheif.so.1');fs.chmodSync(fixtures+'/libheif.so.1',0o644);
const oldPath='/usr/lib/x86_64-linux-gnu/libheif.so.1.15.1';
run('sh',['-ec','docker run --rm --network none --read-only --user 65534:65534 --cap-drop ALL --security-opt no-new-privileges --memory 128m --cpus .5 --pids-limit 32 --entrypoint cat "$1" "$2" > "$3"','heif',spec.base,oldPath,root+'/before.so']);
const symbols=p=>run('nm',['-D','--defined-only',p]).split('\n').map(l=>l.trim().split(/\s+/).at(-1));
const oldC=symbols(root+'/before.so').filter(s=>s.startsWith('heif_')),newSymbols=new Set(symbols(install+spec.library));assert(oldC.length>100);assert(oldC.every(s=>newSymbols.has(s)));
const dynamic=p=>run('readelf',['-d',p]).split('\n').filter(l=>/SONAME|NEEDED|BIND_NOW/.test(l)).map(l=>l.slice(l.indexOf('('))).sort();assert.deepEqual(dynamic(install+spec.library),dynamic(root+'/before.so'));
const shell=(overlay,cmd)=>docker('run',...limits,'--user','65534:65534','--mount','type=bind,src='+fixtures+',dst=/checks,readonly',...(overlay?['-e','LD_LIBRARY_PATH=/checks']:[]),'--entrypoint','sh',spec.base,'-ec',cmd);
assert.equal(shell(true,'/checks/heif-native codecs'),shell(false,'/checks/heif-native codecs'));
for(const over of [false,true]){const out=shell(over,'/checks/heif-native /tmp');assert.equal((out.match(/roundtrip passed/g)||[]).length,2);fs.writeFileSync(root+(over?'/candidate-roundtrip.log':'/baseline-roundtrip.log'),out+'\n');}
for(const [name,mode]of [['metadata','read'],['legacy-metadata','read'],['metadata-raw','read'],['metadata-bad-checksum','reject'],['metadata-bad-header','reject']]){const out=shell(true,'/checks/heif-metadata /checks/fictional.heic /checks/'+name+'.heic '+mode);assert.match(out,mode==='read'?/exact metadata pass/:/corrupt compression rejected/);fs.writeFileSync(root+'/'+name+'-runtime.log',out+'\n');}
const n={schema:1,date:new Date().toISOString(),status:'passed',version,oldVersion:spec.oldVersion,packageSha256,upstream,publicCExportsPreserved:true,publicCExports:oldC.length,sonameNeededPreserved:true,hevcAv1RgbaOldHeaderRoundtrips:true,codecInventoryUnchanged:true,legacyMetadataPreserved:true,rawDeflatePreserved:true,corruptMetadataRejected:true,metadataLimitsEnforced:true,patchSha256:spec.patch.sha256,priorFixesPreserved:5,libraryPath:spec.library,librarySha256:hash(install+spec.library),isolatedBase:spec.base,network:'none',productionChanged:false,byteReproducibilityClaimed:false};
proveNative(n,spec);
fs.writeFileSync(root+'/source-scope.json',JSON.stringify({status:'passed',archive:spec.archive,changed,patch:spec.patch,packaging:spec.packaging,priorFixes:spec.priorFixes},null,2)+'\n');
fs.writeFileSync(root+'/native.json',JSON.stringify(n,null,2)+'\n');console.log(JSON.stringify({status:n.status,upstream,publicCExports:oldC.length,version,productionChanged:false}));
