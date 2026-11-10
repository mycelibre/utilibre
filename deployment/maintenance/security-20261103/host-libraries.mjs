// Finite native host-library release; existing package/ABI/rollback mechanisms.
// Preparation is read-only. Apply never restarts a service or changes boot state.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {inventory} from '../component-followup/inventory.mjs';
import {payloadManifest,validatePayload} from '../vendor-leaves-final/dhi-proof.mjs';
process.umask(0o077);const followup=process.argv.includes('--batch-20261109'),args=process.argv.slice(2).filter(a=>a!=='--batch-20261109'),apply=args[0]==='apply';assert(['prepare','apply'].includes(args[0])&&args.length===1&&process.argv.length===(followup?4:3));
const root='/var/lib/utilibre-maintenance/'+(followup?'security-20261109':'security-20261103'),dir=root+'/host-libraries';
fs.mkdirSync(dir,{recursive:true,mode:0o700});
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(new URL(followup?'../security-20261109/host-library-inputs.json':'./host-library-inputs.json',import.meta.url)),names=spec.packages.map(p=>p.package);
assert.deepEqual(names,followup?['libsqlite3-0']:['libxi6','libsqlite3-0']);
if(followup)assert.equal(spec.approval,'approved');
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:90000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('Host library operation failed; private evidence retained');}};
const actual=p=>inventory(p).records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));
const noResident=()=>{for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p))){try{if(/docker|containerd/.test(fs.readFileSync('/proc/'+pid+'/cgroup','utf8')))continue;assert(!/\/(?:libXi\.so|libsqlite3\.so)/.test(fs.readFileSync('/proc/'+pid+'/maps','utf8')),'Host library consumer active; refresh plan required');}catch(e){if(['ENOENT','ESRCH'].includes(e.code))continue;throw e;}}};
const otherPackages=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']).split('\n').filter(l=>!names.some(n=>l.startsWith(n+'=')||l.startsWith(n+':amd64='))).sort();
const pids=()=>run('systemctl',['show','docker.service','ssh.service','qemu-guest-agent.service','-p','Id','-p','MainPID']);
const sourceReceipt=root+(followup?'/sqlite-followup':'/sqlite')+'/trixie/output/build.json';
const nativeSql=read(sourceReceipt);assert(nativeSql.passed&&nativeSql.baselineReproduced&&nativeSql.afterSanitizersPassed&&nativeSql.distinctTests>=87);
if(followup){
 assert.equal(sha(sourceReceipt),spec.sourceReceiptSha256);assert.equal(nativeSql.sessionTests,203);assert.equal(nativeSql.secureDeleteTests,11030);assert(nativeSql.nativePackagingUnchanged);
 assert.equal(sha(new URL('../security-20261109/check-sqlite-ordinary.py',import.meta.url)),spec.fixtureSha256);
}else{const xi=read(root+'/libxi/debian-expanded-penpot-backend/consumer.json');assert(xi.passed&&xi.abiPreserved&&xi.neededPreserved&&xi.nativeRows.every(r=>r.passed&&r.checks===14));}
assert.equal(run('dpkg',['--audit']),'');noResident();
if(followup&&fs.existsSync(dir+'/release.json')){
 const previous=read(dir+'/release.json');assert.equal(previous.status,'passed','Preserve failed release evidence');assert(previous.noServiceRestart&&previous.native.passed&&previous.native.checks===15);
 for(const p of spec.packages){assert.equal(sha(p.candidateFile),p.candidateSha256);assert.equal(sha(p.library),p.librarySha256);assert.equal(run('dpkg-query',['-W','-f=${Version}',p.package]),p.after);const row=previous.rows.find(r=>r.package===p.package);assert(row);validatePayload(row.newPayload,actual(p.package));}
 console.log('Already deployed; exact installed package unchanged. No install or service restart.');process.exit(0);
}
assert(!fs.existsSync(dir+'/release.json'),'Preserve release evidence');assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
const temp=fs.mkdtempSync('/tmp/utilibre-host-libraries-');fs.chmodSync(temp,0o755);
try{
 const rows=[];
 for(const p of spec.packages){
  assert.equal(run('dpkg-query',['-W','-f=${Version}',p.package]),p.before);assert.equal(sha(p.file),p.sha256);assert.equal(sha(p.candidateFile),p.candidateSha256);
  assert.equal(run('dpkg-deb',['-f',p.candidateFile,'Package']),p.package);assert.equal(run('dpkg-deb',['-f',p.candidateFile,'Version']),p.after);
  const old=temp+'/'+p.package+'/old',next=temp+'/'+p.package+'/new';fs.mkdirSync(temp+'/'+p.package,{mode:0o755});fs.chmodSync(temp+'/'+p.package,0o755);run('dpkg-deb',['--extract',p.file,old]);run('dpkg-deb',['--extract',p.candidateFile,next]);
  validatePayload(payloadManifest(old),actual(p.package));assert.equal(sha(next+p.library),p.librarySha256);
  assert(!run('ldd',[next+p.library]).includes('not found'));
  if(followup){
   const symbols=lib=>run('nm',['-D','--defined-only',lib]).split('\n').map(l=>l.trim().split(/\s+/).slice(1).join(' ')).sort();
   const dynamic=lib=>run('readelf',['-d',lib]).split('\n').filter(l=>/\((NEEDED|SONAME|RPATH|RUNPATH)\)/.test(l)).map(l=>l.replace(/^.*?\(/,'(')).sort();
   assert.deepEqual(symbols(next+p.library),symbols(old+p.library));assert.deepEqual(dynamic(next+p.library),dynamic(old+p.library));
  }
  rows.push({...p,oldPayload:payloadManifest(old),newPayload:payloadManifest(next)});
 }
 const simulation=run('apt-get',['--simulate','--no-install-recommends','install',...spec.packages.map(p=>p.candidateFile)]);
 assert.deepEqual([...simulation.matchAll(/^Inst (\S+)/gm)].map(m=>m[1]).sort(),[...names].sort());assert(!/^Remv /m.test(simulation));
 const before={otherPackages:otherPackages(),servicePids:pids()};
 // Copy only synthetic executables/data to an unprivileged, networkless check.
 const fixture=temp+'/fixture';fs.mkdirSync(fixture,{mode:0o755});fs.chmodSync(fixture,0o755);
 if(followup){fs.copyFileSync(new URL('../security-20261109/check-sqlite-ordinary.py',import.meta.url),fixture+'/ordinary.py');fs.chmodSync(fixture+'/ordinary.py',0o644);}
 else for(const [file,hash]of Object.entries(nativeSql.fixtures)){assert.equal(sha(root+'/sqlite/trixie/fixture/'+file),hash);fs.copyFileSync(root+'/sqlite/trixie/fixture/'+file,fixture+'/'+file);fs.chmodSync(fixture+'/'+file,0o755);}
 for(const pkg of names)for(const state of ['old','new'])run('chmod',['-R','a+rX',temp+'/'+pkg+'/'+state]);
 const check=(state)=>{
  const prefix=state==='live'?'':temp+'/libsqlite3-0/'+state,lib=prefix+'/usr/lib/x86_64-linux-gnu';
  const env={PATH:'/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C.UTF-8'};
  if(followup){
   const result=JSON.parse(run('unshare',['--net','prlimit','--core=0','--as=536870912','--cpu=30','--','runuser','-u','nobody','--','env','LD_LIBRARY_PATH='+lib,'/usr/bin/python3','-I',fixture+'/ordinary.py'],{env,cwd:temp}));
   assert(result.passed&&result.checks===15&&result.backupRestore);
   return {...result,network:'none',uid:65534};
  }
  const native=(exe,args=[])=>run('unshare',['--net','prlimit','--core=0','--','runuser','-u','nobody','--','env','LD_LIBRARY_PATH='+lib,fixture+'/'+exe,...args],{env,cwd:temp});
  assert.match(native('rowid'),/SQLITE_NEGATIVE_ROWID_AND_NORMAL_SEARCH_PASSED checks=9/);
  assert.match(native('probe',[1,2,3,4,5].map(n=>fixture+'/distinct-10.'+n+'.sql')),/native backup\/restore and integrity passed/);
  assert.match(native('fts',[fixture+'/fts-corrupt.db']),/rejected with SQLITE_CORRUPT/);
  const xiLib=(state==='live'?'':temp+'/libxi6/'+state)+'/usr/lib/x86_64-linux-gnu/libXi.so.6';
  run('unshare',['--net','runuser','-u','nobody','--','python3','-c','import ctypes,sys; x=ctypes.CDLL(sys.argv[1]); assert x.XIQueryVersion and x.XListInputDevices and x.XGetDeviceControl',xiLib]);
  return {passed:true,sqliteNegativeRowidChecks:9,sqliteDistinctChecks:5,sqliteBackupRestore:true,sqliteCorruptFtsRejected:true,xiHostLoad:true,network:'none',uid:65534};
 };
 const common={rows,...before,sqliteSourceProofSha256:sha(sourceReceipt),...(followup?{fixtureSha256:spec.fixtureSha256}:{xiConsumerProofSha256:sha(root+'/libxi/debian-expanded-penpot-backend/consumer.json')})};
 const preserve=()=>{assert.deepEqual(otherPackages(),before.otherPackages);assert.equal(pids(),before.servicePids);assert.equal(run('dpkg',['--audit']),'');noResident();};
 if(!apply){const baseline=followup?check('old'):null,native=check('new');preserve();fs.writeFileSync(dir+'/prepared.json',JSON.stringify({date:new Date().toISOString(),status:'prepared-not-deployed',...common,baseline,native,simulation},null,2)+'\n');console.log('Exact rollback payloads, package simulation and isolated native host checks passed; not deployed.');}
 else{
  const prepared=read(dir+'/prepared.json');assert.equal(prepared.status,'prepared-not-deployed');assert(Date.now()-Date.parse(prepared.date)<1800000);assert(prepared.native.passed);for(const [k,v]of Object.entries(common))assert.deepEqual(prepared[k],v,'Preparation changed: '+k);
  const report={startedAt:new Date().toISOString(),status:'applying',...common},save=()=>fs.writeFileSync(dir+'/release.json',JSON.stringify(report,null,2)+'\n');save();
  try{
   noResident();fs.writeFileSync(dir+'/install.log',run('dpkg',['--force-confold','--install',...rows.map(p=>p.candidateFile)])+'\n');
   for(const p of rows){assert.equal(run('dpkg-query',['-W','-f=${Version}',p.package]),p.after);validatePayload(p.newPayload,actual(p.package));}
   report.native=check('live');preserve();run('python3',[new URL('../../../scripts/maintenance-update-policy.py',import.meta.url).pathname,'--write-unattended-blacklist']);
   report.status='passed';report.noServiceRestart=true;report.completedAt=new Date().toISOString();save();console.log('Declared host libraries installed; native checks passed, other packages/services unchanged.');
  }catch(e){report.status='failed';report.error=e.message;try{noResident();run('dpkg',['--force-confold','--install',...rows.map(p=>p.file)]);for(const p of rows)validatePayload(p.oldPayload,actual(p.package));preserve();report.rollback='Exact old payloads restored';}catch{report.rollback='NOT VERIFIED';}save();throw e;}
 }
}finally{fs.rmSync(temp,{recursive:true});}
