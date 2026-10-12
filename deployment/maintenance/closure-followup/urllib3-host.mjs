// One pure-Python Debian package. No service restart, native library or data change.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',out=dir+'/urllib3-host',here=new URL('.',import.meta.url).pathname;
const candidate=dir+'/sources/python3-urllib3_2.8.0-2_all.deb',rollback=dir+'/sources/python3-urllib3_2.3.0-3+deb13u2_all.deb';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a,env={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DEBIAN_FRONTEND:'noninteractive',...env}}).trim();
const version=()=>run('dpkg-query',['-W','-f=${Version}','python3-urllib3']);
assert.equal(process.argv.length,3);assert(['prepare','apply'].includes(process.argv[2]));
assert.equal(sha(candidate),'d48b157c65ac9b28a86cd2d6f5af3baa841208bae724bed3a33b0058727b0ff3');assert.equal(sha(rollback),'8132c30c09060562e540025a5d5b1ee9dd3496234c36eab57339e8b94f9e6b38');
const pids=()=>Object.fromEntries(['docker.service','ssh.service'].map(s=>[s,run('systemctl',['show','--property','MainPID','--value',s])]));
const native=path=>{const result=JSON.parse(run('/usr/bin/python3',['-B',here+'urllib3-native.py',dir+'/curl-fixture'],path?{PYTHONPATH:path}:{PYTHONPATH:''}));assert(result.passed&&result.checks.length===11&&result.urllib3==='2.8.0');return result;};
if(process.argv[2]==='prepare'){
 assert(!fs.existsSync(out));fs.mkdirSync(out);run('dpkg-deb',['-x',candidate,out+'/candidate']);
 const result=native(out+'/candidate/usr/lib/python3/dist-packages');
 fs.writeFileSync(out+'/candidate.json',JSON.stringify({date:new Date().toISOString(),passed:true,packageSha256:sha(candidate),native:result},null,2)+'\n');
 console.log('Host candidate: 11 loopback HTTP/TLS/proxy/chunk checks passed; not installed.');
}else{
 const file=dir+'/urllib3-host.json';assert(!fs.existsSync(file));const proof=JSON.parse(fs.readFileSync(out+'/candidate.json'));assert(proof.passed&&Date.now()-Date.parse(proof.date)<86400000);assert.equal(sha(candidate),proof.packageSha256);
 assert.equal(version(),'2.3.0-3+deb13u2');assert.equal(run('dpkg',['--audit']),'');
 const sim=run('apt-get',['--simulate','--no-install-recommends','install',candidate]);assert(!/^Remv /m.test(sim));assert.deepEqual(sim.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]),['python3-urllib3']);
 const before=pids(),report={date:new Date().toISOString(),status:'applying',packageSha256:sha(candidate),rollback,rollbackSha256:sha(rollback)};
 const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');save();
 try{
  run('dpkg',['--force-confold','--install',candidate]);assert.equal(run('dpkg',['--audit']),'');assert.equal(version(),'2.8.0-2');
  report.native=native();assert.deepEqual(pids(),before);report.servicePidsUnchanged=true;report.status='passed';
 }catch(e){report.status='failed';save();run('dpkg',['--force-confold','--install',rollback]);assert.equal(version(),'2.3.0-3+deb13u2');assert.equal(run('dpkg',['--audit']),'');report.rollbackCompleted=true;save();throw Error('Host urllib3 gate failed; original package restored.');}
 report.completedAt=new Date().toISOString();save();console.log('Host urllib3 2.8.0 installed and 11 checks passed; Docker/SSH unchanged.');
}
