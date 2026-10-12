import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,version,oldVersion,packageName,packageSha256,sha,read,docker,limits,inspect,target} from './common.mjs';
process.umask(0o077);
assert(!fs.existsSync(root+'/native.json'));
assert.equal(sha(fs.readFileSync(root+'/output/'+packageName)),packageSha256);
assert.equal(fs.readFileSync(root+'/output/build-passed','utf8').trim(),'passed');
assert.match(fs.readFileSync(root+'/output/source-signature.log','utf8'),/Good signature/);
assert.match(fs.readFileSync(root+'/output/upstream-tests.log','utf8'),/All tests passed \(14 assertions in 1 test case\)/);
assert.match(fs.readFileSync(root+'/output/overlay-test.log','utf8'),/overlay and alpha compositing passed/);
const symbols=f=>fs.readFileSync(root+'/output/'+f,'utf8').trim().split('\n');
assert.deepEqual(symbols('new-symbols.txt'),symbols('old-symbols.txt'));
const dynamic=f=>{const text=fs.readFileSync(root+'/output/'+f,'utf8');return{soname:text.match(/SONAME.*\[([^\]]+)\]/)[1],needed:[...text.matchAll(/NEEDED.*\[([^\]]+)\]/g)].map(m=>m[1]).sort(),bindNow:text.includes('BIND_NOW')};};
assert.deepEqual(dynamic('old-dynamic.txt'),dynamic('new-dynamic.txt'));assert.equal(dynamic('new-dynamic.txt').soname,'libheif.so.1');
const source='/var/lib/utilibre-maintenance/sudo-followup-20261012/bookworm/work/heif-followup/source',original='/var/lib/utilibre-maintenance/openldap-followup-20261012/next-assessment/libheif/tree';
const vendor=fs.readFileSync(original+'/debian/patches/series','utf8').trim().split('\n');assert.equal(vendor.length,3);
for(const name of vendor)assert.equal(sha(fs.readFileSync(source+'/debian/patches/'+name)),sha(fs.readFileSync(original+'/debian/patches/'+name)));
const base=inspect(target).Image,fixtures=root+'/fixtures';fs.mkdirSync(fixtures,{recursive:true,mode:0o755});fs.chmodSync(fixtures,0o755);
for(const [from,to,mode]of [['heif-native','heif-native',0o755],['install/usr/lib/x86_64-linux-gnu/libheif.so.1.15.1','libheif.so.1',0o644]]){fs.copyFileSync(root+'/output/'+from,fixtures+'/'+to);fs.chmodSync(fixtures+'/'+to,mode);}
const shell=(over,cmd)=>docker('run',...limits,'--user','65534:65534','--mount','type=bind,src='+fixtures+',dst=/checks,readonly',...(over?['-e','LD_LIBRARY_PATH=/checks']:[]),'--entrypoint','sh',base,'-ec',cmd);
assert.equal(shell(false,"dpkg-query -W -f='${Version}' libheif1"),oldVersion);
assert.equal(shell(true,'/checks/heif-native codecs'),shell(false,'/checks/heif-native codecs'));
for(const over of [false,true]){const out=shell(over,'/checks/heif-native');assert.equal((out.match(/roundtrip passed/g)||[]).length,2);fs.writeFileSync(root+(over?'/candidate-roundtrip.log':'/baseline-roundtrip.log'),out+'\n');}
const libraryPath='/usr/lib/x86_64-linux-gnu/libheif.so.1.15.1';
const record={schema:1,date:new Date().toISOString(),status:'passed',version,oldVersion,packageSha256,sourceSignatureVerified:true,vendorPatchesPreserved:vendor,upstream:{assertions:14,enabledCases:1,allPassed:true,disabledUpstreamEncoderCasesNotClaimed:true},ordinaryOverlayAndAlphaTest:true,exports:symbols('new-symbols.txt').length,exactExportsPreserved:true,dynamic:dynamic('new-dynamic.txt'),hevcAv1RgbaOldHeaderRoundtrips:true,codecInventoryUnchanged:true,libraryPath,librarySha256:sha(fs.readFileSync(root+'/output/install'+libraryPath)),isolatedBase:base,productionChanged:false};
fs.writeFileSync(root+'/native.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
