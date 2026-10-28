// Optional native server backend removal; preserve the installed DNS client.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const oct28=process.argv[2]==='--oct28';assert(process.argv.length===(oct28?3:2));
const previous='/var/lib/utilibre-maintenance/closure-followup-20261012',root=oct28?'/var/lib/utilibre-maintenance/security-20261028/bind':previous;process.umask(0o077);
const spec=oct28?JSON.parse(fs.readFileSync(new URL('../security-20261028/bind-inputs.json',import.meta.url))):null;
const names=['bind9-host','bind9-libs'],version=oct28?spec.version:'1:9.20.29-1~deb13u1+utilibre1';
const hashes=oct28?spec.packages.map(p=>p.sha256):['91385bf4465a28245ac45045726b04c1be86e4542db85d17ed8376c7250b5908','b2bfbc0ee0f8c8b2a4043e19c4bcd5a36ea5bb61509a4c65f3166cbb72f39139'];
const run=(cmd,args)=>{try{return cp.execFileSync(cmd,args,{encoding:'utf8',timeout:120000,maxBuffer:3*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(root+'/bind-release-error.log',String(e.stderr||e.stdout||e.message));throw Error('BIND gate failed; private diagnostic retained');}};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const next=oct28?spec.packages.map(p=>root+'/'+p.file):names.map(n=>root+'/sources/'+n+'_9.20.29-1~deb13u1+utilibre1_amd64.deb');
const old=oct28?names.map(n=>previous+'/sources/'+n+'_9.20.29-1~deb13u1+utilibre1_amd64.deb'):[...names.map(n=>root+'/rollback/'+n+'_1%3a9.20.29-1~deb13u1_amd64.deb'),root+'/rollback/liblmdb0_0.9.31-1+b2_amd64.deb'];
assert(!fs.existsSync(root+'/bind-release.json'));
if(oct28){
 assert.deepEqual(spec.packages.map(p=>p.name),names);const prior=JSON.parse(fs.readFileSync(previous+'/bind-release.json'));assert.equal(prior.status,'passed');
 for(let i=0;i<old.length;i++){assert.equal(sha(old[i]),prior.packages[i].sha256);assert.equal(run('dpkg-query',['-W','-f=${Version}',names[i]]),spec.previous);}
 assert(!fs.existsSync('/usr/lib/x86_64-linux-gnu/liblmdb.so.0'));
 const live=JSON.parse(fs.readFileSync(previous+'/bind-live.json'));assert.equal(live.status,'passed');for(const [name,hash] of Object.entries(live.libraryHashes))assert.equal(sha('/usr/lib/x86_64-linux-gnu/'+name),hash);
}
for(let i=0;i<next.length;i++)assert.equal(sha(next[i]),hashes[i]);for(const f of old)assert(fs.statSync(f).size>10000);
const n=JSON.parse(fs.readFileSync(root+'/bind-native.json'));assert.equal(n.status,'passed');assert(!n.installed&&n.checks.length===4&&n.noLmdbDependencyOrEnvironmentOpenSymbol);
assert(Date.now()-Date.parse(n.date)<86400000);
const changes=run('apt-get',['-s','install',...next]);assert(!/^Remv /m.test(changes));assert.deepEqual(changes.split('\n').filter(s=>s.startsWith('Inst ')).map(s=>s.split(' ')[1]).sort(),names);
function noHostMaps(){const ns=fs.readlinkSync('/proc/1/ns/mnt');for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p))){try{if(fs.readlinkSync('/proc/'+pid+'/ns/mnt')===ns)assert(!/liblmdb|libdns-/.test(fs.readFileSync('/proc/'+pid+'/maps','utf8')),'Existing host consumer requires a separate restart gate');}catch(e){if(!['ENOENT','EACCES','ESRCH'].includes(e.code))throw e;}}}
noHostMaps();assert.equal(run('dpkg',['--audit']),'');
const report={date:new Date().toISOString(),status:'applying',version,packages:next.map((p,i)=>({path:p,sha256:hashes[i]})),rollbackPackages:old.map(p=>({path:p,sha256:sha(p)})),native:root+'/bind-native.json'};
const pids=()=>Object.fromEntries(['ssh.service','docker.service'].map(s=>[s,run('systemctl',['show','--value','--property','MainPID',s])]));
const beforePids=pids(),libc=sha('/usr/lib/x86_64-linux-gnu/libc.so.6');
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
const native=()=>run('unshare',['-n','sh','-c','ip link set lo up; exec python3 deployment/maintenance/closure-followup/check-bind.py '+(oct28?'--oct28 ':'')+'--installed']);
const save=()=>fs.writeFileSync(root+'/bind-release.json',JSON.stringify(report,null,2)+'\n');save();
try{
 run('dpkg',['--install',next[1],next[0]]);assert.equal(run('dpkg',['--audit']),'');
 native();noHostMaps();
 if(!oct28){
 const sim=run('apt-get',['-s','remove','liblmdb0']);assert.deepEqual(sim.split('\n').filter(l=>l.startsWith('Remv ')).map(l=>l.split(' ')[1]),['liblmdb0']);
 run('dpkg',['--remove','liblmdb0']);assert.equal(run('dpkg',['--audit']),'');
 }
 for(const pkg of names)assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),version);
 assert(!fs.existsSync('/usr/lib/x86_64-linux-gnu/liblmdb.so.0'));
 if(!oct28)native();
 const live=JSON.parse(fs.readFileSync(root+'/bind-live.json'));assert.deepEqual(live.libraryHashes,n.libraryHashes);
 assert.deepEqual(pids(),beforePids);assert.equal(sha('/usr/lib/x86_64-linux-gnu/libc.so.6'),libc);
 report.status='passed';report.libcAndServicePidsUnchanged=true;report.removed=oct28?'No package removed; previous no-LMDB configuration preserved.':'Unused liblmdb0 package only; no database/user files removed.';
}catch(error){report.status='failed';report.failure=error.message;save();run('dpkg',['--install',...old.toReversed()]);assert.equal(run('dpkg',['--audit']),'');report.rollback='original packages restored';save();throw error;}
report.completedAt=new Date().toISOString();save();console.log('DNS client and libraries updated and tested; no LMDB dependency, service restart or user-data change.');
