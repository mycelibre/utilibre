// Native same-ABI five-package host update; no unrelated dependency upgrades.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',build=dir+'/python-system/build',out=dir+'/python-system/host',here=new URL('.',import.meta.url).pathname;
const version='3.13.16-1~deb13u1+utilibre1',oldVersion='3.13.5-2+deb13u5';
const rollbackHashes={'libpython3.13-minimal':'a4aa6a9a8c77f87bfe545e1d14ec42c001d189ace90e3aa75deec882b39dee49','libpython3.13-stdlib':'db161322a3481d2c0c3b9a3b9a03c3ab0e2b1718f54b88755fb4a3f939165b84','python3.13-minimal':'c1fda9e7b1bf15b2fa75a238d8a8710e142fe14c722fc650c5fc614f078c9073','python3.13':'460c1fd72845516ac3ce9d1686916f3ab2e4c86f8a9746e14d26243a47e2b98d','python3.13-venv':'b079db533ff9d9d11585d06c3b2a5c034d01453a1e915502ffece42fb0ce4a3f'};
const packages=Object.keys(rollbackHashes),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a,env={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DEBIAN_FRONTEND:'noninteractive',...env}}).trim();
const candidate=packages.map(p=>build+'/'+p+'_'+version+'_amd64.deb'),rollback=packages.map(p=>dir+'/sources/'+p+'_'+oldVersion+'_amd64.deb');
assert.equal(process.argv.length,3);assert(['prepare','apply'].includes(process.argv[2]));
assert(fs.readFileSync(build+'/runner.log','utf8').includes('NATIVE_PYTHON_SYSTEM_BUILD_AND_FOCUSED_TESTS_PASSED'));
const sums=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[l.slice(66).split('/').at(-1),l.slice(0,64)]));
for(const [i,pkg] of packages.entries()){assert.equal(sha(candidate[i]),sums.get(candidate[i].split('/').at(-1)));assert.equal(sha(rollback[i]),rollbackHashes[pkg]);}
const pids=()=>Object.fromEntries(['docker.service','ssh.service'].map(s=>[s,run('systemctl',['show','--property','MainPID','--value',s])]));
const modules="import apt,apt_pkg,dbus,requests,cryptography;apt_pkg.init_config();apt_pkg.init_system();assert apt_pkg.version_compare('2','1')>0;assert dbus.String('Ficción')=='Ficción';from cryptography.hazmat.primitives import hashes;h=hashes.Hash(hashes.SHA256());h.update(b'fictional');assert len(h.finalize())==32;print('HOST_PYTHON_MODULES_PASSED')";
function check(binary,env={}){
 const native=JSON.parse(run(binary,['-B',here+'python-system-native.py'],env));assert(native.passed);
 assert.equal(run(binary,['-B','-c',modules],env),'HOST_PYTHON_MODULES_PASSED');
 const http=JSON.parse(run(binary,['-B',here+'urllib3-native.py',dir+'/curl-fixture'],env));assert(http.passed&&http.checks.length===11);
 return {native,http,hostModules:true};
}
if(process.argv[2]==='prepare'){
 assert(!fs.existsSync(out+'/candidate.json'));fs.mkdirSync(out+'/candidate',{recursive:true});for(const deb of candidate)run('dpkg-deb',['-x',deb,out+'/candidate']);
 const env={PYTHONHOME:out+'/candidate/usr',PYTHONPATH:'/usr/lib/python3/dist-packages'};
 const result=check(out+'/candidate/usr/bin/python3.13',env);
 assert.equal(sha(out+'/candidate/etc/python3.13/sitecustomize.py'),sha('/etc/python3.13/sitecustomize.py'));
 fs.writeFileSync(out+'/candidate.json',JSON.stringify({date:new Date().toISOString(),passed:true,version,packages:Object.fromEntries(candidate.map(p=>[p,sha(p)])),configurationSha256:sha('/etc/python3.13/sitecustomize.py'),...result},null,2)+'\n');
 console.log('Host Python candidate: native ABI, APT/D-Bus/crypto imports, file/venv and 11 HTTP/TLS checks passed.');
}else{
 const file=dir+'/python-system-host.json';assert(!fs.existsSync(file));const proof=JSON.parse(fs.readFileSync(out+'/candidate.json'));assert(proof.passed&&Date.now()-Date.parse(proof.date)<86400000);for(const p of candidate)assert.equal(sha(p),proof.packages[p]);
 assert.equal(run('dpkg',['--audit']),'');for(const pkg of packages)assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),oldVersion);
 const sim=run('apt-get',['--simulate','--no-install-recommends','install',...candidate]);assert(!/^Remv /m.test(sim));assert.deepEqual(sim.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1].replace(/:amd64$/,'')).sort(),[...packages].sort());
 const before=pids(),libc=sha('/usr/lib/x86_64-linux-gnu/libc.so.6');
 const report={date:new Date().toISOString(),status:'applying',version,packages:proof.packages,rollback:Object.fromEntries(rollback.map(p=>[p,sha(p)]))};const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');save();
 try{
  run('dpkg',['--force-confold','--install',...candidate]);assert.equal(run('dpkg',['--audit']),'');for(const pkg of packages)assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),version);
  report.checks=check('/usr/bin/python3',{PYTHONHOME:'',PYTHONPATH:''});assert.deepEqual(pids(),before);assert.equal(sha('/usr/lib/x86_64-linux-gnu/libc.so.6'),libc);assert.equal(sha('/etc/python3.13/sitecustomize.py'),proof.configurationSha256);
  report.status='passed';report.libcConfigurationDockerSshUnchanged=true;
 }catch(e){report.status='failed';report.failure=String(e.message).slice(0,180);save();run('dpkg',['--force-confold','--install',...rollback]);assert.equal(run('dpkg',['--audit']),'');for(const pkg of packages)assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),oldVersion);report.rollbackCompleted=true;save();throw Error('Host Python gate failed; original five packages restored.');}
 report.completedAt=new Date().toISOString();save();console.log('Host Python 3.13.16 installed; native/HTTP/host-module gates pass, no libc or Docker/SSH change.');
}
