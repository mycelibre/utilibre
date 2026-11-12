// Explicit native-package activation; preparation, policy review and tests first.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {acquireReleaseLock} from '../../security-20261103/release-lock.mjs';
process.umask(0o077);
assert(process.argv.length===3&&process.argv[2]==='apply','Use release.mjs apply');
const root='/var/lib/utilibre-maintenance/host-tools-20261112/gh-followup';
const p=JSON.parse(fs.readFileSync(new URL('./inputs.json',import.meta.url)));
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const run=(f,a)=>cp.execFileSync(f,a,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,env:{...process.env,GH_TELEMETRY:'disabled',DEBIAN_FRONTEND:'noninteractive'},stdio:['ignore','pipe','pipe']}).trim();
const deb=root+'/gh_'+p.version+'_amd64.deb',receipt=root+'/release.json';
const check=()=>{
 assert.equal(sha('/usr/bin/gh'),p.binarySha256);
 assert.equal(run('dpkg-query',['-W','-f=${Version}','gh']),p.version);
 assert(run('/usr/bin/gh',['--version']).startsWith('gh version '+p.version+' '));
 assert.equal(run('/usr/bin/gh',['config','get','telemetry']),'disabled');
 assert(run('/usr/bin/gh',['completion','--shell','bash']).includes('__start_gh'));
 assert.equal(run('dpkg',['--audit']),'');
};
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
try{
 if(fs.existsSync(receipt)){
  assert.equal(JSON.parse(fs.readFileSync(receipt)).status,'passed');check();
  console.log('Exact GH CLI package active; no changes');
 }else{
  assert.equal(sha('/usr/bin/gh'),p.previousBinarySha256);
  assert.equal(sha(p.previousPackage),p.previousPackageSha256);
  assert.equal(sha(deb),p.packageSha256);
  assert.equal(sha(root+'/output/gh'),p.binarySha256);
  for(const [file,digest] of Object.entries(p.checks))assert.equal(sha(root+'/'+file),digest);
  const scan=JSON.parse(fs.readFileSync(root+'/candidate-scan.json'));
  assert(scan.Results.some(r=>r.Type==='gobinary'&&r.Packages.length>=100));
  assert(scan.Results.every(r=>!(r.Vulnerabilities||[]).length));
  assert(Date.now()-Date.parse(scan.CreatedAt)<24*3600000,'Candidate scan older than one day');
  const tests=fs.readFileSync(root+'/test-retry.log','utf8');
  for(const path of ['pkg/cmd/api','pkg/cmd/completion','api','internal/telemetry'])assert(new RegExp('^ok\\s+github.com/cli/cli/v2/'+path+'\\s','m').test(tests));
  assert(!tests.includes('FAIL'));
  assert.equal(run('dpkg',['--audit']),'');
  const simulation=run('apt-get',['-s','--no-install-recommends','install',deb]);
  assert.deepEqual(simulation.split('\n').filter(l=>/^(Inst|Remv) /.test(l)).map(l=>l.split(' ').slice(0,2).join(' ')),['Inst gh']);
  const report={date:new Date().toISOString(),status:'activating',version:p.version,binarySha256:p.binarySha256,packageSha256:p.packageSha256,rollback:{package:p.previousPackage,sha256:p.previousPackageSha256},servicesRestarted:0,notifications:0,simulation};
  const save=()=>fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');save();
  try{
   fs.writeFileSync(root+'/install.log',run('dpkg',['-i',deb]));check();
   report.status='passed';report.completedAt=new Date().toISOString();save();
   console.log('GH CLI exact package installed; native checks passed; no service restarts');
  }catch(error){
   report.status='failed';report.error=error.message;save();
   try{fs.writeFileSync(root+'/rollback.log',run('dpkg',['-i',p.previousPackage]));assert.equal(sha('/usr/bin/gh'),p.previousBinarySha256);report.status='failed-rolled-back';save();}catch(rollback){report.rollbackError=rollback.message;save();}
   throw error;
  }
 }
}finally{unlock();}
