// One native wheel package; never host pip, service restarts or distro changes.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert([undefined,'--apply'].includes(process.argv[2])&&process.argv.length<=3);
const dir='/var/lib/utilibre-maintenance/host-python-vendor-followup-20261012',here=new URL('.',import.meta.url).pathname;
const old='78.1.1-0.1',next=old+'+utilibre1',pkg='python3-setuptools-whl';
const wheel='/usr/share/python-wheels/setuptools-78.1.1-py3-none-any.whl';
const before=dir+'/sources/'+pkg+'_'+old+'_all.deb',candidate=dir+'/build/'+pkg+'_'+next+'_all.deb';
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){throw Error(path.basename(p)+' failed; private diagnostic output retained by its own checks; exit '+e.status);}};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
run('node',[here+'verify-source.mjs']);
const sums=new Map(fs.readFileSync(dir+'/build/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
assert.equal(sha(candidate),sums.get(path.basename(candidate)));
assert.match(fs.readFileSync(dir+'/build/runner.log','utf8'),/NATIVE_STABLE_SETUPTOOLS_WHEEL_BUILD_PASSED/);
assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),old);
assert.equal(run('dpkg',['--audit']),'');
assert(Number(run('df',['-B1','--output=avail','/']).split('\n').at(-1))>=8589934592);
assert(!fs.existsSync(dir+'/release.json'),'Never overwrite a completed release receipt');
const inventory=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']).split('\n').filter(l=>!l.startsWith(pkg+'=')).sort();
const pids=()=>run('systemctl',['show','docker.service','ssh.service','-p','Id','-p','MainPID']);
const oldPids=pids(),packages=inventory();
const simulation=run('apt-get',['--simulate','install',candidate]);
assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]),[pkg]);
assert(!simulation.split('\n').some(l=>l.startsWith('Remv ')));
const temp=fs.mkdtempSync('/tmp/utilibre-setuptools-stage-');fs.chmodSync(temp,0o755);
const checks=()=>[here+'check.py',here+'compare.py',here+'context.patch',here+'verify-source.mjs'].map(p=>({file:path.basename(p),sha256:sha(p)}));
try{
 run('dpkg-deb',['-x',before,temp+'/old']);run('dpkg-deb',['-x',candidate,temp+'/new']);
 assert.equal(sha(temp+'/old'+wheel),sha(wheel),'Installed baseline wheel differs from signed rollback package');
 const compare=JSON.parse(run('/usr/bin/python3',['-B',here+'compare.py',temp+'/old'+wheel,temp+'/new'+wheel]));
 const check=(file,mode)=>JSON.parse(run('unshare',['--net','--','runuser','-u','nobody','--','/usr/bin/python3','-B',here+'check.py',file,mode]));
 const common={package:pkg,oldVersion:old,newVersion:next,oldPackageSha256:sha(before),newPackageSha256:sha(candidate),oldWheelSha256:sha(temp+'/old'+wheel),newWheelSha256:sha(temp+'/new'+wheel),compare,checks:checks()};
 if(process.argv[2]!=='--apply'){
  const report={date:new Date().toISOString(),...common,old:check(temp+'/old'+wheel,'old'),candidate:check(temp+'/new'+wheel,'new'),passed:true};
  assert.equal(report.old.baselineUnsafeCases,7);assert.equal(report.candidate.rejectedOrConfinedCases,7);
  fs.writeFileSync(dir+'/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }else{
  const proof=read(dir+'/checks.json');assert(proof.passed);assert(Date.now()-Date.parse(proof.date)<1800000);
  for(const [key,value]of Object.entries(common))assert.deepEqual(proof[key],value,'Staging proof changed: '+key);
  const report={startedAt:new Date().toISOString(),status:'prepared',...common,checksSha256:sha(dir+'/checks.json'),simulation};
  const save=()=>fs.writeFileSync(dir+'/release.json',JSON.stringify(report,null,2)+'\n');save();
  try{
   run('dpkg',['--install',candidate]);assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),next);assert.equal(sha(wheel),common.newWheelSha256);
   report.live=check(wheel,'new');assert(report.live.passed&&report.live.rejectedOrConfinedCases===7);
   assert.equal(run('dpkg',['--audit']),'');assert.deepEqual(inventory(),packages);assert.equal(pids(),oldPids);
   run('/usr/bin/python3',[new URL('../../../scripts/maintenance-update-policy.py',import.meta.url).pathname,'--write-unattended-blacklist']);
   const guard=fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages','utf8');assert(guard.includes('python3[-]setuptools[-]whl'));
   report.status='passed';report.noServiceRestart=true;report.completedAt=new Date().toISOString();save();
  }catch(error){
   report.status='failed';report.error=error.message;
   try{run('dpkg',['--install',before]);assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),old);assert.equal(sha(wheel),common.oldWheelSha256);report.rollback='Exact old native package restored';}catch{report.rollback='NOT VERIFIED';}
   save();throw Error('Host wheel release failed; inspect private receipt and rollback result');
  }
  console.log(JSON.stringify({status:report.status,version:next,live:report.live,noServiceRestart:true,protectedFromUnattendedReplacement:true}));
 }
}finally{assert(path.dirname(temp)==='/tmp'&&path.basename(temp).startsWith('utilibre-setuptools-stage-'));fs.rmSync(temp,{recursive:true});}
