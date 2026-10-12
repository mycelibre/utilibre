// One native CLI package only. No libc, service restart, user data or policy change.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {checkWget} from './check-wget.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',build=dir+'/wget-trixie',version='1.25.0-2+utilibre1';
const candidate=build+'/wget_'+version+'_amd64.deb',rollback=dir+'/sources/wget_1.25.0-2_amd64.deb';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DEBIAN_FRONTEND:'noninteractive'}}).trim();
assert.equal(process.argv.length,3);assert(['prepare','apply'].includes(process.argv[2]));
assert.equal(sha(rollback),'5649cad63c781b2dcf5a7b87d70b3bf789291cd0d6bcabc4d521211f94980683');
assert(fs.readFileSync(build+'/runner.log','utf8').includes('NATIVE_WGET_BUILD_AND_TESTS_PASSED'));
const checksums=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[l.slice(66).split('/').at(-1),l.slice(0,64)]));
assert.equal(checksums.get(candidate.split('/').at(-1)),sha(candidate));
const suite=fs.readFileSync(build+'/upstream-suite.log','utf8');assert(!/^FAIL:|^ERROR:/m.test(suite));assert(/# FAIL:\s+0/.test(suite));
const pids=()=>Object.fromEntries(['docker.service','ssh.service'].map(s=>[s,run('systemctl',['show','--property','MainPID','--value',s])]));
if(process.argv[2]==='prepare'){
 assert(!fs.existsSync(build+'/candidate.json'));
 const old=read(build+'/old-native.json');assert(old.passed&&old.oldRegressionObserved&&old.checks.length===8);assert.equal(old.binarySha256,sha('/usr/bin/wget'));
 const extracted=build+'/candidate';fs.mkdirSync(extracted);run('dpkg-deb',['-x',candidate,extracted]);
 assert.equal(run('dpkg-deb',['-f',candidate,'Version']),version);
 const native=await checkWget(extracted+'/usr/bin/wget');assert(native.passed&&!native.oldRegressionObserved&&native.checks.length===8);
 assert.equal(sha(extracted+'/etc/wgetrc'),sha('/etc/wgetrc'),'Refuse changed/default operator configuration');
 const features=p=>run(p,['--version']).split('\n').filter(l=>/^\+|^\-/.test(l)).join('\n');assert.equal(features(extracted+'/usr/bin/wget'),features('/usr/bin/wget'));
 fs.writeFileSync(build+'/candidate.json',JSON.stringify({date:new Date().toISOString(),passed:true,version,packageSha256:sha(candidate),native,configurationSha256:sha('/etc/wgetrc'),featuresUnchanged:true,upstreamSuiteSha256:sha(build+'/upstream-suite.log')},null,2)+'\n');console.log('Candidate Wget: eight isolated checks and unchanged configuration/features passed.');
}else{
 const file=dir+'/wget-host.json';assert(!fs.existsSync(file));const proof=read(build+'/candidate.json');assert(proof.passed&&Date.now()-Date.parse(proof.date)<86400000);assert.equal(proof.packageSha256,sha(candidate));assert.equal(proof.native.binarySha256,sha(build+'/candidate/usr/bin/wget'));assert.equal(proof.configurationSha256,sha('/etc/wgetrc'));assert.equal(run('dpkg-query',['-W','-f=${Version}','wget']),'1.25.0-2');assert.equal(run('dpkg',['--audit']),'');
 const sim=run('apt-get',['--simulate','--no-install-recommends','install',candidate]);assert(!/^Remv /m.test(sim));assert.deepEqual(sim.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]),['wget']);
 const libraries=Object.fromEntries([...run('ldd',['/usr/bin/wget']).matchAll(/\s(\/\S+)\s+\(/g)].map(m=>[m[1],sha(m[1])]));assert(Object.keys(libraries).length>5);const before=pids();
 const report={date:new Date().toISOString(),status:'applying',version,packageSha256:proof.packageSha256,rollback,rollbackSha256:sha(rollback),configurationSha256:proof.configurationSha256,libraries};const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');save();
 try{
  run('dpkg',['--force-confold','--install',candidate]);assert.equal(run('dpkg',['--audit']),'');assert.equal(run('dpkg-query',['-W','-f=${Version}','wget']),version);assert.equal(sha('/usr/bin/wget'),proof.native.binarySha256);assert.equal(sha('/etc/wgetrc'),proof.configurationSha256);for(const [path,hash]of Object.entries(libraries))assert.equal(sha(path),hash);assert.deepEqual(pids(),before);
  report.native=await checkWget('/usr/bin/wget');assert(report.native.passed&&!report.native.oldRegressionObserved);report.status='passed';report.librariesConfigurationServicePidsUnchanged=true;
 }catch(e){report.status='failed';report.failure=e.message.slice(0,180);save();run('dpkg',['--force-confold','--install',rollback]);assert.equal(run('dpkg',['--audit']),'');assert.equal(run('dpkg-query',['-W','-f=${Version}','wget']),'1.25.0-2');report.rollbackCompleted=true;save();throw Error('Wget gate failed; original package restored.');}
 report.completedAt=new Date().toISOString();save();console.log('Host Wget repaired: actual installed CLI passed eight checks; services, libraries and config unchanged.');
}
