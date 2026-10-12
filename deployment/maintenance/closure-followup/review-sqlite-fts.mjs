// Three explicit source repairs; never an exemption for the package as a whole.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012',build=dir+'/sqlite-fts-bookworm';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const release=read(dir+'/sqlite-fts-release.json');assert.equal(release.status,'passed');const rows=overlayRows(release);
const descendants=fs.existsSync(dir+'/urllib3-release.json')?overlayRows(read(dir+'/urllib3-release.json')):[];
const specs=read(new URL('./sqlite-fts-specs.json',import.meta.url)),version='3.40.1-2+deb12u2+utilibre2';
const sums={'libsqlite3-0':'070eab3c6f2613c686a5b593a0fd7f99a6fdaa8d6bdf1467a3aa32b85bc2ad6e',sqlite3:'692f5f10d7953afb9d5ec3ff24d3a79ad31b87e2b49e36c041920215fee2bb5f'};
const ids=['CVE-2025-7458','CVE-2026-11822','CVE-2026-11824'];
assert.equal(sha(fs.readFileSync(build+'/fts-upstream.patch')),'683a169fc6eaf31ddf41b0e106859c5cd3b2c95076367d9fdc6264c90eeca1c0');
assert.equal(sha(fs.readFileSync(dir+'/sources/sqlite3_3.46.1-7+deb13u2.debian.tar.xz')),'59d33bc436258603702bb051d645743ab03612b82f79e7c7d638c65127c21261');
const prior=cp.execFileSync('tar',['-xOf',build+'/sqlite3_'+version+'.debian.tar.xz','debian/patches/CVE-2025-7458.patch']);
assert.equal(sha(prior),'e1a48c50ad0129123a75d6a050561bd2a5c48c74c52aaa044eb3c7b15c229b87');
const patch=cp.execFileSync('tar',['-xOf',build+'/sqlite3_'+version+'.debian.tar.xz','debian/patches/utilibre-fts-corruption.patch']);assert.equal(sha(patch),sha(fs.readFileSync(build+'/fts-upstream.patch')));
const evidence=read(build+'/fts-native-proof.json');assert(evidence.passed&&evidence.corruptDatabaseRejected);assert.equal(evidence.upstreamDistinctTests,87);assert.equal(evidence.upstreamFtsCompatibleTests,7);
const decisions=[],proofs=[],skipped=[],cache=new Map;
for(const item of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&Object.hasOwn(sums,i.package)&&ids.includes(i.id)&&i.installed===version)){
 try{
  const spec=specs.find(s=>s.containers.includes(item.containers[0]));assert(spec);assert.deepEqual(item.containers,spec.containers);if(item.package==='sqlite3')assert(spec.cli);
  const b=read(dir+'/sqlite-fts/'+spec.key+'/build.json'),n=read(dir+'/sqlite-fts/'+spec.key+'/native.json');
  assert(b.passed&&b.configurationUnchanged&&n.passed&&n.abiPreserved&&n.nativeSqliteBackupRestore&&n.nativeFtsCorruptionRejected&&n.existingDistinctRegressionsPassed);assert.equal(n.applicationChecks.status,'passed');assert.equal(n.imageId,b.imageId);assert.equal(b.librarySha256,'632c2ab03779d4941088f6320863b3d21829c3c0263f524b4a8a08ac1c8dea81');
  for(const name of item.containers){let row=rows.find(r=>r.name===name&&r.oldImage===spec.base&&r.newImage===b.imageId);assert(row&&Date.parse(row.completedAt)<=Date.parse(scan.date));for(const next of descendants)if(next.name===name&&next.oldImage===row.newImage){assert(Date.parse(next.completedAt)<=Date.parse(scan.date));row=next;}assert.equal(row.newImage,item.artifact);assert.equal(run('docker',['inspect',name,'--format','{{.Image}}']),item.artifact);assert.equal(run('docker',['exec',name,'dpkg-query','-W','-f=${Version}',item.package]),version);assert.equal(run('docker',['exec',name,'sha256sum','/usr/lib/x86_64-linux-gnu/libsqlite3.so.0.8.6']).split(/\s+/)[0],b.librarySha256);}
  const key=item.artifact+item.package;
  if(!cache.has(key)){
   const file=build+'/'+item.package+'_'+version+'_amd64.deb';assert.equal(sha(fs.readFileSync(file)),sums[item.package]);const temp=fs.mkdtempSync('/dev/shm/utilibre-sqlite-proof-'),manifest=[];
   try{run('dpkg-deb',['-x',file,temp]);const paths=item.package==='sqlite3'?['/usr/bin/sqlite3']:['/usr/lib/x86_64-linux-gnu/libsqlite3.so.0.8.6','/usr/lib/x86_64-linux-gnu/libsqlite3.so.0'];for(const path of paths){const link=fs.lstatSync(temp+path).isSymbolicLink(),expected=link?fs.readlinkSync(temp+path):sha(fs.readFileSync(temp+path));for(const name of item.containers)assert.equal(run('docker',['exec',name,link?'readlink':'sha256sum',path]).split(/\s+/)[0],expected);manifest.push({path,...(link?{link:expected}:{sha256:expected})});}}finally{fs.rmSync(temp,{recursive:true});}cache.set(key,manifest);
  }
  const reason=`Exact live SQLite ${version} native library and package payload verified; source retains the previous DISTINCT repair and adds unchanged upstream FTS5 leaf bound from signed Debian 3.46.1-7+deb13u2 source (patch SHA256 683a169fc6eaf31ddf41b0e106859c5cd3b2c95076367d9fdc6264c90eeca1c0). 87 DISTINCT and seven FTS tests pass; test-only unhex/error-text adaptation for SQLite 3.40. Installed library rejects the synthetic corrupt FTS database. All 1389 exports, compile options, app/configuration and other libraries preserved; native consumer and backup/restore gates and completed release checked. https://security-tracker.debian.org/tracker/${item.id} . Exact evidence: closure-followup-20261012/sqlite-fts-review.json. This source backport mitigates only this finding; no claim of an ASan exploit reproduction or complete absence of SQLite vulnerabilities.`;
  decisions.push(validateDecision({key:item.key,status:'mitigated',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));proofs.push({key:item.key,image:item.artifact,packageSha256:sums[item.package],manifest:cache.get(key),librarySha256:b.librarySha256,consumer:n.applicationChecks});
 }catch(e){skipped.push({key:item.key,id:item.id,reason:e.message.slice(0,180)});}
}
fs.writeFileSync(dir+'/sqlite-fts-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
