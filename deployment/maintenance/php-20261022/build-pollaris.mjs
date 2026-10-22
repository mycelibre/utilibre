// Exact upstream PHP payload over the maintained app, not a clean upstream
// rebuild which would lose the deployed OS/library and application corrections.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {specs,output,candidate,advisories} from './specs.mjs';
process.umask(0o077);
const s=specs.find(s=>s.key==='pollaris'),dir=output+'/pollaris';fs.mkdirSync(dir,{recursive:true});
const run=(exe,args,o={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Pollaris PHP candidate failed; private diagnostic retained');}};
const docker=(...a)=>run('docker',a),inspect=id=>JSON.parse(docker('image','inspect',id))[0];
const native=(id,exe,args=[])=>docker('run','--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','384m','--memory-swap','384m','--cpus','1','--pids-limit','64','--log-driver','none','--entrypoint',exe,id,...args);
const base=inspect(s.base),donor=inspect(s.donor);assert.equal(base.Id,s.base);assert.equal(donor.Id,s.donor.slice(4));
assert(native(s.base,'cat',['/etc/alpine-release']).startsWith('3.23.'));assert(native(s.donor,'cat',['/etc/alpine-release']).startsWith('3.23.'));
assert.equal(native(s.base,'php-config',['--configure-options']),native(s.donor,'php-config',['--configure-options']));
const envKeys=['PHP_VERSION','PHP_URL','PHP_ASC_URL','PHP_SHA256'];
const updates=Object.fromEntries(donor.Config.Env.filter(e=>envKeys.some(k=>e.startsWith(k+'='))).map(e=>{const n=e.indexOf('=');return[e.slice(0,n),e.slice(n+1)];}));
assert.equal(updates.PHP_VERSION,s.version);assert.match(updates.PHP_SHA256,/^[a-f0-9]{64}$/);
const expectedConfig={...base.Config,Env:base.Config.Env.map(e=>{const k=e.split('=')[0];return k in updates?k+'='+updates[k]:e;})};
const scope='/app /usr/local/etc /usr/local/lib/php/extensions/no-debug-non-zts-20250925/intl.so /usr/local/lib/php/extensions/no-debug-non-zts-20250925/pdo_pgsql.so /usr/local/lib/php/extensions/no-debug-non-zts-20250925/zip.so';
const unchanged=id=>native(id,'sh',['-ec',`find ${scope} -type f -exec sha256sum {} + | sort | sha256sum; sha256sum /lib/apk/db/installed`]);
const before=unchanged(s.base);
const payload=['/usr/local/bin/php','/usr/local/bin/php-config','/usr/local/bin/phpize','/usr/local/bin/phar.phar','/usr/local/sbin/php-fpm','/usr/local/include/php','/usr/local/lib/php/build','/usr/local/lib/php/extensions/no-debug-non-zts-20250925/sodium.so','/usr/src/php.tar.xz','/usr/src/php.tar.xz.asc'];
const payloadHash=id=>native(id,'sh',['-ec',`find ${payload.join(' ')} -type f -exec sha256sum {} + | sort | sha256sum`]);
const donorHash=payloadHash(s.donor);
assert.equal(native(s.donor,'sha256sum',['/usr/src/php.tar.xz']).split(' ')[0],updates.PHP_SHA256);
const locked=JSON.parse(fs.readFileSync(new URL('./inputs.v1.json',import.meta.url))).compiledInputs.pollaris;
assert.deepEqual({base:s.base,donor:s.donor,version:s.version,sourceSha256:updates.PHP_SHA256,payloadHash:donorHash},locked,'Compiled PHP inputs differ from the reviewed receipt');
const functional=`$e=get_loaded_extensions();sort($e);$r=['version'=>PHP_VERSION,'extensions'=>$e,'icu'=>INTL_ICU_VERSION,'curl'=>curl_version()['version']];$s='Fictional café';$k=random_bytes(SODIUM_CRYPTO_SECRETBOX_KEYBYTES);$n=random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);if(sodium_crypto_secretbox_open(sodium_crypto_secretbox($s,$n,$k),$n,$k)!==$s)exit(1);if(!password_verify($s,password_hash($s,PASSWORD_DEFAULT)))exit(2);if(Normalizer::normalize("cafe\\u{301}")!=='café')exit(3);if(!in_array('pgsql',PDO::getAvailableDrivers()))exit(4);echo json_encode($r);`;
const normalBefore=JSON.parse(native(s.base,'php',['-r',functional]));
const existing=fs.existsSync(dir+'/build.json')?JSON.parse(fs.readFileSync(dir+'/build.json')):null;
if(!existing){
 const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>9*1024**3,'8 GiB reserve plus 1 GiB build headroom');
 const file=`FROM ${s.donor} AS php_runtime\nFROM ${s.base}\nUSER 0\n${payload.map(p=>'COPY --from=php_runtime '+p+' '+p+(p.endsWith('/php')&&p.includes('/include/')||p.endsWith('/build')?'/':'')).join('\n')}\n${Object.entries(updates).map(([k,v])=>'ENV '+k+'='+v).join('\n')}\nUSER ${base.Config.User}\n`;
 fs.writeFileSync(dir+'/Dockerfile',file);
 run('docker',['build','--network','none','--pull=false','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',candidate(s),dir],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
}
const next=inspect(existing?.candidate||candidate(s));if(existing)assert.equal(next.Id,existing.imageId);
assert.deepEqual(next.Config,expectedConfig,'Only the four PHP provenance environment values may change');
assert.equal(unchanged(next.Id),before,'Maintained application/configuration/custom extensions/OS packages changed');assert.equal(payloadHash(next.Id),donorHash,'Official payload not copied exactly');
const normalAfter=JSON.parse(native(next.Id,'php',['-r',functional]));assert.equal(normalAfter.version,s.version);assert.deepEqual({...normalAfter,version:undefined},{...normalBefore,version:undefined});
native(next.Id,'php-fpm',['-t']);
if(!existing)fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),...s,candidate:candidate(s),imageId:next.Id,advisories,donorId:donor.Id,sourceSha256:updates.PHP_SHA256,payloadHash:donorHash,payload,applicationHash:before,normalBefore,normalAfter,configurationUnchanged:true,configurationMetadataOnly:envKeys,applicationUnchanged:true,unrelatedPackagesUnchanged:true,packages:[],passed:true,deployed:false,limitations:['Only PHP provenance metadata changed in image configuration','Compiled PHP requires vendor provenance verification; OS/package scan alone does not inventory it','Native application workflow gate is separate']},null,2)+'\n');
console.log('Pollaris: exact official PHP '+s.version+' payload; application, custom modules and maintained OS preserved');
