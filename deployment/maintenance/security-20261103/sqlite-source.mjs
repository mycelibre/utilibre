// Offline preparation/finalization only. Never installs packages on the host.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
process.umask(0o077);
const [mode,suite]=process.argv.slice(2),here=fileURLToPath(new URL('.',import.meta.url)),spec=JSON.parse(fs.readFileSync(here+'sqlite-source.json'));
assert(['build','finalize'].includes(mode)&&['bookworm','trixie'].includes(suite)&&process.argv.length===4);
const s=spec.suites[suite],dir='/var/lib/utilibre-maintenance/security-20261103/sqlite/'+suite,output=dir+'/output';
const sha=b=>createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(p));
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:60000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
for(const f of s.files)assert.equal(hash(dir+'/input/'+f.file),f.sha256);
assert.equal(hash(here+'sqlite-rowid.patch'),spec.patchSha256);
assert.equal(hash(here+'sqlite-rowid-bookworm.patch'),spec.bookwormContextPatchSha256);
assert.equal(hash(here+spec.trixiePrerequisite.file),spec.trixiePrerequisite.sha256);
assert.equal(run('docker',['image','inspect','--format','{{.Id}}',s.sdkImage]),s.sdkImage);
const limits=['--rm','--network','none','--read-only','--user','65534:65534','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','2g','--memory-swap','2g','--pids-limit','128','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=128m,mode=1777'];
if(mode==='build'){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 for(const p of [dir+'/work',output]){assert(!fs.existsSync(p),'Preserve previous attempts');fs.mkdirSync(p,{mode:0o700});fs.chownSync(p,65534,65534);}
 const log=fs.openSync(dir+'/runner.log','wx',0o600);
 try{run('docker',['run',...limits,'-v',dir+'/input:/input:ro','-v',dir+'/work:/work:rw','-v',output+':/output:rw','-v',here+':/recipe:ro','--entrypoint','/bin/sh',s.sdkImage,'/recipe/build-sqlite.sh',suite],{timeout:3600000,stdio:['ignore',log,log]});}finally{fs.closeSync(log);}
 console.log(suite+': native build finished; finalize explicitly');
}else{
 assert(!fs.existsSync(output+'/build.json'),'Preserve completed source receipt');
 const recorded=Object.fromEntries(fs.readFileSync(output+'/source-before.sha256','utf8').trim().split('\n').map(l=>[l.slice(66),l.slice(0,64)]));assert.deepEqual(recorded,s.filePreconditions);
 assert.equal(hash(dir+'/work/source/debian/rules'),s.filePreconditions['debian/rules']);
 assert(Number(fs.readFileSync(output+'/baseline-exit-status','utf8'))!==0);
 assert.match(fs.readFileSync(output+'/before-sanitized.log','utf8'),/signed integer overflow|heap-buffer-overflow/);
 assert.equal(fs.readFileSync(output+'/after-sanitized.log','utf8').trim(),'SQLITE_NEGATIVE_ROWID_AND_NORMAL_SEARCH_PASSED checks=9');
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
 const sources={'rowid':'sqlite-rowid.c','probe':'../sqlite-final/probe.c','fts':'../closure-followup/sqlite-fts-probe.c'};
 for(const [name,relative]of Object.entries(sources)){
  const path=here+relative;fs.copyFileSync(path,fixture+'/'+name+'.c');fs.chmodSync(fixture+'/'+name+'.c',0o644);fixtures[name+'.c']=hash(path);
  run('docker',['run',...limits,'-v',fixture+':/fixtures:rw','-v',extracted+':/native:ro','--entrypoint','cc',s.sdkImage,'-O2','-DUTILIBRE_SQLITE_VERSION="'+s.sourceVersion+'"','-I/native/usr/include','-L/native/usr/lib/x86_64-linux-gnu','/fixtures/'+name+'.c','-lsqlite3','-o','/fixtures/'+name]);fixtures[name]=hash(fixture+'/'+name);
 }
 const receipt={suite,date:new Date().toISOString(),passed:true,upstreamSourceFix:true,baselineReproduced:true,baselineObservation:fs.readFileSync(output+'/before-sanitized.log','utf8').trim(),afterSanitizersPassed:true,prefixTests,distinctTests,integrityTests,nativePackagingUnchanged:true,librarySha256,packages,fixtures,sdkImage:s.sdkImage,sourceSpecSha256:hash(here+'sqlite-source.json'),buildScriptSha256:hash(here+'build-sqlite.sh'),buildPackagesSha256:hash(output+'/build-packages.lock'),prerequisite:suite==='trixie'?spec.trixiePrerequisite:null,network:'none',scope:'Native system SQLite only; no production data, not proof of byte-for-byte build reproducibility'};
 fs.writeFileSync(output+'/build.json',JSON.stringify(receipt,null,2)+'\n');console.log(suite+': source, sanitizer, native tests and fixture receipt completed');
}
