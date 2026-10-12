// Evidence-gated native sudo package replacement. Default is read-only prepare;
// root maintainer must explicitly pass --apply after reviewing the candidate.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert([undefined,'--apply'].includes(process.argv[2])&&process.argv.length<=3);
const task='/var/lib/utilibre-maintenance/sudo-followup-20261012',here=new URL('.',import.meta.url).pathname;
const old='1.9.16p2-3+deb13u2',next=old+'+utilibre1';
const baseline=`${task}/sources/sudo_${old}_amd64.deb`,candidate=`${task}/trixie/output/sudo_${next}_amd64.deb`;
const expected='ae03fe5112e98ff71b40ed057f6ffe33a316235fb192e66a2a1a825eaf2dc406';
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:12e6,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){throw Error(path.basename(p)+' failed; private stderr retained by caller if needed ('+e.status+')');}};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const manifest=base=>{
 if(!fs.existsSync(base))return [];
 const stat=fs.lstatSync(base),paths=stat.isDirectory()?[base,...fs.readdirSync(base,{recursive:true}).map(p=>base+'/'+p)]:[base];
 return paths.map(file=>{const s=fs.lstatSync(file);return {file,mode:s.mode&0o7777,uid:s.uid,gid:s.gid,...(s.isSymbolicLink()?{link:fs.readlinkSync(file)}:s.isFile()?{sha256:sha(file)}:{directory:true})};}).sort((a,b)=>a.file.localeCompare(b.file));
};
const configRoots=['/etc/sudoers','/etc/sudoers.d','/etc/sudo.conf','/etc/sudo_logsrvd.conf','/etc/pam.d/sudo','/etc/pam.d/sudo-i','/etc/init.d/sudo','/usr/lib/tmpfiles.d/sudo.conf','/usr/lib/systemd/system/sudo.service'];
const config=()=>configRoots.flatMap(manifest);
const timestamps=()=>manifest('/run/sudo').map(row=>({...row,mtimeMs:fs.lstatSync(row.file).mtimeMs}));
const inventory=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']).split('\n').filter(l=>!l.startsWith('sudo=')).sort();
const daemonPids=()=>run('systemctl',['show','docker.service','ssh.service','systemd-networkd.service','systemd-journald.service','systemd-logind.service','-p','Id','-p','MainPID']);
const noConsumers=()=>{
 for(const id of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p))){
  try{const group=fs.readFileSync('/proc/'+id+'/cgroup','utf8');if(group.includes('docker'))continue;
   assert(!/\/usr\/(?:libexec\/sudo\/|bin\/sudo(?:\s|$)|sbin\/sudo_(?:logsrvd|sendlog)(?:\s|$))/.test(fs.readFileSync('/proc/'+id+'/maps','utf8')),'Host sudo process/library consumer active; retry after its normal completion');
  }catch(e){if(e.code==='ENOENT'||e.code==='ESRCH')continue;throw e;}
 }
};
function noSideEffects(){
 assert.equal(fs.readlinkSync('/usr/lib/systemd/system/sudo.service'),'/dev/null');
 assert(fs.readFileSync('/etc/init.d/sudo','utf8').includes('stop|reload|restart|force-reload|status)\n\t;;'));
 assert.equal(fs.readFileSync('/usr/lib/tmpfiles.d/sudo.conf','utf8').trim(),'D /run/sudo 0711 root root');
 const present=file=>{try{fs.lstatSync(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
 for(const file of ['/etc/alternatives/sudo','/etc/sudoers.dist','/etc/sudoers.pre-conffile'])assert(!present(file),'Unexpected legacy maintainer-script target '+file);
 const st=fs.statSync('/etc/sudoers');assert.equal(st.uid,0);assert.equal(st.gid,0);assert.equal(st.mode&0o7777,0o440);
 noConsumers();
}
run('node',[here+'verify-source.mjs']);assert.equal(sha(candidate),expected);
const native=read(task+'/trixie/output/native.json');assert.equal(native.version,next);assert.equal(native.candidateSha256,expected);assert.equal(native.baselineSha256,sha(baseline));
assert.equal(native.abi.length,14);assert.equal(native.configs.length,7);assert(native.helper.startsWith('SUDO_ENVIRONMENT_HELPERS_PASSED:'));
assert.equal(native.upstreamResults.length,92);assert(native.upstreamResults.every(r=>r.errors===0&&r.success===100));
assert.equal(run('dpkg-query',['-W','-f=${Version}','sudo']),old);assert.equal(run('dpkg',['--audit']),'');noSideEffects();
assert(Number(run('df',['-B1','--output=avail','/']).split('\n').at(-1))>=8589934592);
assert(!fs.existsSync(task+'/host-release.json'),'Never overwrite an existing release receipt');
const temp=fs.mkdtempSync('/tmp/utilibre-sudo-release-');
try{
 for(const [kind,file]of [['old',baseline],['new',candidate]])run('dpkg-deb',['--raw-extract',file,temp+'/'+kind]);
 const oldPayload=manifest(temp+'/old').filter(r=>!r.directory&&!r.file.includes('/DEBIAN/')).map(r=>({...r,file:r.file.slice((temp+'/old').length)}));
 const newPayload=manifest(temp+'/new').filter(r=>!r.directory&&!r.file.includes('/DEBIAN/')).map(r=>({...r,file:r.file.slice((temp+'/new').length)}));
 assert.deepEqual(oldPayload.map(r=>r.file),newPayload.map(r=>r.file));
 const exact=rows=>{for(const row of rows){if(row.file.startsWith('/etc/'))continue;const s=fs.lstatSync(row.file);assert.equal(s.mode&0o7777,row.mode,row.file);assert.equal(s.uid,row.uid);assert.equal(s.gid,row.gid);if(row.link!==undefined)assert.equal(fs.readlinkSync(row.file),row.link);else assert.equal(sha(row.file),row.sha256,row.file);}};
 exact(oldPayload);
 for(const name of native.maintainerScriptsUnchanged){const clean=p=>fs.readFileSync(p,'utf8').split('\n').filter(l=>!l.trim().startsWith('#')).join('\n').trim();assert.equal(clean(temp+'/old/DEBIAN/'+name),clean(temp+'/new/DEBIAN/'+name));}
 const simulation=run('apt-get',['--simulate','install',candidate]);
 assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]),['sudo']);assert(!/^Remv /m.test(simulation));
 const oldConfig=config(),oldTimestamps=timestamps(),packages=inventory(),pids=daemonPids();
 // Parser-only checks: no login, authentication, sudo command, or timestamp
 // operation is attempted. The dynamic loader bypasses setuid mechanics.
 run('/usr/sbin/visudo',['-c','-q']);
 run('/lib64/ld-linux-x86-64.so.2',['--library-path',temp+'/new/usr/libexec/sudo',temp+'/new/usr/sbin/visudo','-c','-q']);
 const common={oldVersion:old,version:next,oldPackageSha256:sha(baseline),packageSha256:expected,nativeSha256:sha(task+'/trixie/output/native.json'),buildLogSha256:sha(task+'/trixie/output/build.log'),oldPayload,newPayload,config:oldConfig,timestamps:oldTimestamps,packageInventorySha256:createHash('sha256').update(JSON.stringify(packages)).digest('hex'),daemonPids:pids,recipeSha256:sha(here+'release-host.mjs')};
 const preserved=()=>{assert.deepEqual(config(),oldConfig);assert.deepEqual(timestamps(),oldTimestamps);assert.deepEqual(inventory(),packages);assert.equal(daemonPids(),pids);assert.equal(run('dpkg',['--audit']),'');noSideEffects();};
 preserved();
 if(process.argv[2]!=='--apply'){
  fs.writeFileSync(task+'/host-checks.json',JSON.stringify({date:new Date().toISOString(),...common,simulation,passed:true,productionChanged:false},null,2)+'\n');
  console.log(JSON.stringify({status:'prepared',version:next,package:expected,configRecords:oldConfig.length,payloadFiles:newPayload.length,noActiveHostConsumers:true,parserChecksPassed:true,productionChanged:false}));
 }else{
  const proof=read(task+'/host-checks.json');assert(proof.passed);assert(Date.now()-Date.parse(proof.date)<1800000);
  for(const [key,value]of Object.entries(common))assert.deepEqual(proof[key],value,'Preparation changed: '+key);
  const report={startedAt:new Date().toISOString(),status:'prepared',...common,checksSha256:sha(task+'/host-checks.json')};
  const save=()=>fs.writeFileSync(task+'/host-release.json',JSON.stringify(report,null,2)+'\n');save();
  try{
   run('dpkg',['--force-confold','--install',candidate]);assert.equal(run('dpkg-query',['-W','-f=${Version}','sudo']),next);exact(newPayload);preserved();run('/usr/sbin/visudo',['-c','-q']);
   run('/usr/bin/python3',[new URL('../../../scripts/maintenance-update-policy.py',import.meta.url).pathname,'--write-unattended-blacklist']);
   assert(fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages','utf8').includes('sudo'));
   report.status='passed';report.noServiceRestart=true;report.noTimestampCleanup=true;report.completedAt=new Date().toISOString();save();
  }catch(error){report.status='failed';report.error=error.message;try{run('dpkg',['--force-confold','--install',baseline]);assert.equal(run('dpkg-query',['-W','-f=${Version}','sudo']),old);exact(oldPayload);preserved();report.rollback='Exact native predecessor restored; config, timestamps and other packages preserved';}catch{report.rollback='NOT VERIFIED';}save();throw Error('Native sudo release failed; inspect private receipt before further work');}
  console.log(JSON.stringify({status:report.status,version:next,noServiceRestart:true,noTimestampCleanup:true}));
 }
}finally{assert(path.dirname(temp)==='/tmp'&&path.basename(temp).startsWith('utilibre-sudo-release-'));fs.rmSync(temp,{recursive:true});}
