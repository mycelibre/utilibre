// Offline preparation/finalization only. Never installs packages on the host.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
process.umask(0o077);
const followup=process.argv[2]==='--batch-20261109',args=process.argv.slice(followup?3:2);
const [mode,suite]=args,here=fileURLToPath(new URL(followup?'../security-20261109/':'.',import.meta.url)),spec=JSON.parse(fs.readFileSync(here+'sqlite-source.json'));
assert(['build','finalize'].includes(mode)&&['bookworm','trixie'].includes(suite)&&args.length===2);
const s=spec.suites[suite],dir='/var/lib/utilibre-maintenance/'+(followup?'security-20261109/sqlite-followup':'security-20261103/sqlite')+'/'+suite,output=dir+'/output',work=dir+(followup?'/package-work':'/work'),buildScript=followup?'build-sqlite-followup.sh':'build-sqlite.sh';
const sha=b=>createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(p));
// Historical diagnostic inputs remain protected operator evidence. Public
// source/native packaging must not depend on publishing those standalone cases.
const diagnostics='/var/lib/utilibre-maintenance/security-20261109/retained-diagnostics/';
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:60000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
for(const f of s.files)assert.equal(hash(dir+'/input/'+f.file),f.sha256);
if(followup){
 for(const [p,h]of Object.entries(s.filePostconditions))assert.equal(hash(dir+'/work/baseline/'+p),h);
 for(const p of s.patches)assert.equal(hash(here+p.file),p.sha256);
 for(const [p,h]of Object.entries(spec.fixtures))assert.equal(hash(diagnostics+p),h);
 assert.equal(Number(fs.readFileSync(dir+'/test-output/before-session.status','utf8')),134);
 assert.match(fs.readFileSync(dir+'/test-output/before-session.log','utf8'),/heap-buffer-overflow/);
 assert.equal(fs.readFileSync(dir+'/test-output/after-session.log','utf8').trim(),'SQLITE_SESSION_NORMAL_AND_CORRUPT_PASSED checks=5');
 if(suite==='trixie'){
  assert.notEqual(Number(fs.readFileSync(dir+'/test-output/before-secure-delete.status','utf8')),0);
  assert.match(fs.readFileSync(dir+'/test-output/before-secure-delete.log','utf8'),/signed integer overflow|heap-buffer-overflow/);
  assert.equal(fs.readFileSync(dir+'/test-output/after-secure-delete.log','utf8').trim(),'SQLITE_SECURE_DELETE_NORMAL_AND_CORRUPT_PASSED checks=3');
 }
}else{
 assert.equal(hash(here+'sqlite-rowid.patch'),spec.patchSha256);
 assert.equal(hash(here+'sqlite-rowid-bookworm.patch'),spec.bookwormContextPatchSha256);
 assert.equal(hash(here+spec.trixiePrerequisite.file),spec.trixiePrerequisite.sha256);
}
assert.equal(run('docker',['image','inspect','--format','{{.Id}}',s.sdkImage]),s.sdkImage);
const limits=['--rm','--network','none','--read-only','--user','65534:65534','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','2g','--memory-swap','2g','--pids-limit','128','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=128m,mode=1777'];
if(mode==='build'){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 for(const p of [work,output]){assert(!fs.existsSync(p),'Preserve previous attempts');fs.mkdirSync(p,{mode:0o700});fs.chownSync(p,65534,65534);}
 const log=fs.openSync(dir+'/runner.log','wx',0o600);
 try{run('docker',['run',...limits,'-v',dir+'/input:/input:ro','-v',work+':/work:rw','-v',output+':/output:rw','-v',here+':/recipe:ro','--entrypoint','/bin/sh',s.sdkImage,'/recipe/'+buildScript,suite],{timeout:3600000,stdio:['ignore',log,log]});}finally{fs.closeSync(log);}
 console.log(suite+': native build finished; finalize explicitly');
}else{
 assert(!fs.existsSync(output+'/build.json'),'Preserve completed source receipt');
 const recorded=Object.fromEntries(fs.readFileSync(output+'/source-before.sha256','utf8').trim().split('\n').map(l=>[l.slice(66),l.slice(0,64)]));
 if(followup){for(const [p,h]of Object.entries(s.filePreconditions))assert.equal(recorded[p],h);}else assert.deepEqual(recorded,s.filePreconditions);
 assert.equal(hash(work+'/source/debian/rules'),s.filePreconditions['debian/rules']);
 if(followup){for(const [p,h]of Object.entries(s.filePostconditions))assert.equal(hash(work+'/source/'+p),h);}
 else{
  assert(Number(fs.readFileSync(output+'/baseline-exit-status','utf8'))!==0);
  assert.match(fs.readFileSync(output+'/before-sanitized.log','utf8'),/signed integer overflow|heap-buffer-overflow/);
  assert.equal(fs.readFileSync(output+'/after-sanitized.log','utf8').trim(),'SQLITE_NEGATIVE_ROWID_AND_NORMAL_SEARCH_PASSED checks=9');
 }
 const tests=name=>{const body=fs.readFileSync(output+'/'+name+'-tests.log','utf8'),m=body.match(/^0 errors out of (\d+) tests/m);assert(m,'Native '+name+' regression failed');return Number(m[1]);};
 const prefixTests=tests('fts-prefix'),distinctTests=tests('distinct'),integrityTests=tests('integrity');assert(prefixTests>=18&&distinctTests>=87&&integrityTests>=5);
 const packages={};for(const name of ['libsqlite3-0','sqlite3','libsqlite3-dev']){const file=name+'_'+s.version+'_amd64.deb';assert.equal(run('dpkg-deb',['-f',output+'/'+file,'Package']),name);assert.equal(run('dpkg-deb',['-f',output+'/'+file,'Version']),s.version);packages[name]={file,version:s.version,sha256:hash(output+'/'+file)};}
 const extracted=fs.mkdtempSync(dir+'/native-package-');run('dpkg-deb',['-x',output+'/'+packages['libsqlite3-0'].file,extracted]);
 const librarySha256=hash(extracted+'/usr/lib/x86_64-linux-gnu/libsqlite3.so.0');
 run('dpkg-deb',['-x',output+'/'+packages['libsqlite3-dev'].file,extracted]);fs.chmodSync(extracted,0o755);
 const fixture=dir+'/fixture';assert(!fs.existsSync(fixture));fs.mkdirSync(fixture,{mode:0o755});fs.chmodSync(fixture,0o755);fs.chownSync(fixture,65534,65534);
 const files={};for(let n=1;n<=5;n++){const name='distinct-10.'+n+'.sql';files[name]='/var/lib/utilibre-maintenance/sqlite-final-20261011/'+name;}
 files['fts-corrupt.db']='/var/lib/utilibre-maintenance/closure-followup-20261012/sqlite-fts-bookworm/fts-corrupt.db';
 const fixtures={};for(const[name,path]of Object.entries(files)){fs.copyFileSync(path,fixture+'/'+name);fs.chmodSync(fixture+'/'+name,0o644);fixtures[name]=hash(path);}
 const sources={'rowid':followup?'../security-20261103/sqlite-rowid.c':'sqlite-rowid.c','probe':'../sqlite-final/probe.c','fts':'../closure-followup/sqlite-fts-probe.c',...(followup?{session:'sqlite-session-native.c',...(suite==='trixie'?{'secure-delete':'sqlite-secure-delete-native.c'}:{})}:{})};
 if(followup)for(const name of ['sqlite-session-corrupt.bin',...(suite==='trixie'?['sqlite-secure-delete-corrupt.db']:[])]){fs.copyFileSync(diagnostics+name,fixture+'/'+name);fs.chmodSync(fixture+'/'+name,0o644);fixtures[name]=hash(diagnostics+name);}
 for(const [name,relative]of Object.entries(sources)){
  const path=(followup&&['session','secure-delete'].includes(name)?diagnostics:here)+relative;fs.copyFileSync(path,fixture+'/'+name+'.c');fs.chmodSync(fixture+'/'+name+'.c',0o644);fixtures[name+'.c']=hash(path);
  run('docker',['run',...limits,'-v',fixture+':/fixtures:rw','-v',extracted+':/native:ro','--entrypoint','cc',s.sdkImage,'-O2','-DSQLITE_ENABLE_SESSION','-DSQLITE_ENABLE_PREUPDATE_HOOK','-DUTILIBRE_SQLITE_VERSION="'+s.sourceVersion+'"','-I/native/usr/include','-L/native/usr/lib/x86_64-linux-gnu','/fixtures/'+name+'.c','-lsqlite3','-o','/fixtures/'+name]);fixtures[name]=hash(fixture+'/'+name);
 }
 const receipt={suite,date:new Date().toISOString(),passed:true,upstreamSourceFix:true,baselineReproduced:true,baselineObservation:fs.readFileSync(followup?dir+'/test-output/before-session.log':output+'/before-sanitized.log','utf8').trim(),afterSanitizersPassed:true,prefixTests,distinctTests,integrityTests,nativePackagingUnchanged:true,librarySha256,packages,fixtures,sdkImage:s.sdkImage,sourceSpecSha256:hash(here+'sqlite-source.json'),buildScriptSha256:hash(here+buildScript),buildPackagesSha256:hash(output+'/build-packages.lock'),prerequisite:suite==='trixie'?spec.trixiePrerequisite:null,network:'none',scope:'Native system SQLite only; no production data, not proof of byte-for-byte build reproducibility',...(followup?{sessionTests:tests('session'),secureDeleteTests:suite==='trixie'?['',2,3,4,5,6,7,8].reduce((n,x)=>n+tests('secure'+x),0):null,patches:s.patches,advisories:spec.advisories,sanitizerScriptSha256:hash(diagnostics+'check-sqlite-followup.sh')}:{})};
 fs.writeFileSync(output+'/build.json',JSON.stringify(receipt,null,2)+'\n');console.log(suite+': source, sanitizer, native tests and fixture receipt completed');
}
