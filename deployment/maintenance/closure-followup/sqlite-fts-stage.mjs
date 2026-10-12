// Native single-bound-check backport. Existing SQLite consumer gates are reused.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,dir='/var/lib/utilibre-maintenance/closure-followup-20261012',build=dir+'/sqlite-fts-bookworm',prior='/var/lib/utilibre-maintenance/sqlite-final-20261011';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const docker=a=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:240000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(build+'/stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('SQLite FTS stage failed; private diagnostics retained');}};
const version='3.40.1-2+deb12u2+utilibre2',checks={
 'libsqlite3-0':'070eab3c6f2613c686a5b593a0fd7f99a6fdaa8d6bdf1467a3aa32b85bc2ad6e',
 'sqlite3':'692f5f10d7953afb9d5ec3ff24d3a79ad31b87e2b49e36c041920215fee2bb5f'
};
assert.match(fs.readFileSync(build+'/distinct-patched-tests.log','utf8'),/0 errors out of 87 tests/);
// The independent native FTS checks must pass before even preparing candidates.
const fts=JSON.parse(fs.readFileSync(build+'/fts-native-proof.json'));assert(fts.passed&&fts.patchedSource&&fts.corruptDatabaseRejected);
for(const [pkg,hash] of Object.entries(checks))assert.equal(sha(build+'/'+pkg+'_'+version+'_amd64.deb'),hash);
for(const f of ['sqlite-probe','distinct-10.1.sql','distinct-10.2.sql','distinct-10.3.sql','distinct-10.4.sql','distinct-10.5.sql'])fs.copyFileSync(prior+'/'+f,build+'/'+f);
const rows=[];
for(const s of JSON.parse(fs.readFileSync(here+'sqlite-fts-specs.json'))){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 for(const name of [s.baseRef,...s.containers])assert.equal(JSON.parse(docker(['inspect',name]))[0][name===s.baseRef?'Id':'Image'],s.base);
 const out=build+'/'+s.kind;fs.mkdirSync(out+'/packages',{recursive:true});
 for(const pkg of ['libsqlite3-0',...(s.cli?['sqlite3']:[])])fs.copyFileSync(build+'/'+pkg+'_'+version+'_amd64.deb',out+'/packages/'+pkg+'.deb');
 docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+s.user,'-f',here+'../xml-final/Dockerfile','-t',s.candidate,out]);
 rows.push({...s,base:s.baseRef,baseId:s.base,candidateId:JSON.parse(docker(['inspect',s.candidate]))[0].Id});
 console.log(s.kind+': staged; native application/ABI and live gates still required');
}
fs.writeFileSync(build+'/build.json',JSON.stringify({date:new Date().toISOString(),status:'built-not-runtime-tested',version,rows,libraryPackageSha256:checks['libsqlite3-0'],cliPackageSha256:checks.sqlite3,ftsEvidence:fts},null,2)+'\n');
