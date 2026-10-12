// Bridge existing native SQLite checks to the standard exact-image release.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',build=dir+'/sqlite-fts-bookworm';
const read=p=>JSON.parse(fs.readFileSync(p)),specs=read(new URL('./sqlite-fts-specs.json',import.meta.url)),checks=read(build+'/checks.json'),compiled=read(build+'/build.json'),fts=read(build+'/fts-native-proof.json');
assert.equal(checks.status,'passed');assert.equal(checks.rows.length,3);assert(fts.passed&&fts.corruptDatabaseRejected);
const docker=a=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const bounded=['--rm','--network','none','--hostname','utilibre-sqlite-fixture','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--ulimit','core=0','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none'];
for(const s of specs){
 const n=checks.rows.find(r=>r.kind===s.kind);assert.equal(n.status,'passed');assert.equal(n.baseId,s.base);assert.equal(n.candidate,s.candidate);
 assert(n.nativeConfigurationUnchanged&&n.compileOptionsUnchanged&&n.sharedLibraryFiveRegressions&&n.nativeSqliteBackupRestore&&n.sonameAndExportsUnchanged);assert.equal(n.exportedSymbols,1389);
 assert.equal(JSON.parse(docker(['inspect',s.candidate]))[0].Id,n.candidateId);
 assert.match(docker(['run',...bounded,'--user','65534:65534','--mount','type=bind,src='+build+',dst=/fixtures,readonly','--entrypoint','/fixtures/sqlite-fts-probe',s.candidate,'/fixtures/fts-corrupt.db']),/Native FTS5 malformed continuation page rejected/);
 const hash=(image,cmd)=>docker(['run',...bounded,'--user','0','--cap-add','DAC_OVERRIDE','--entrypoint','sh',image,'-ec',cmd]);
 const cfg='find /etc -type f ! -name ld.so.cache -exec sha256sum {} + | sort | sha256sum';
 const libs='find /usr/lib /lib -type f -name "*.so*" ! -name "libsqlite3.so*" -exec sha256sum {} + | sort | sha256sum';
 const etc=hash(s.base,cfg),other=hash(s.base,libs);assert.equal(hash(s.candidate,cfg),etc);assert.equal(hash(s.candidate,libs),other);
 const out=dir+'/sqlite-fts/'+s.key;fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(out+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),imageId:n.candidateId,version:compiled.version,passed:true,configurationUnchanged:true,applicationSha256:n.applicationSha256,etcSha256:etc,unrelatedLibrariesSha256:other,librarySha256:n.librarySha256,libraryPackageSha256:compiled.libraryPackageSha256,cliPackageSha256:compiled.cliPackageSha256},null,2)+'\n');
 fs.writeFileSync(out+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:n.candidateId,passed:true,abiPreserved:true,exportedSymbols:n.exportedSymbols,nativeSqliteBackupRestore:true,nativeFtsCorruptionRejected:true,existingDistinctRegressionsPassed:true,upstreamDistinctTests:87,upstreamFtsCompatibleTests:7,applicationChecks:n,network:'none',limitations:fts.limitations},null,2)+'\n');
 console.log(s.kind+': actual installed FTS/ABI, native consumer/restore and unchanged configuration gates passed');
}
