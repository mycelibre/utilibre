// Explicit host-package reassessment, not a fleet scan or advisory refresh.
// prepare writes private evidence only; publish replaces only the host section.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {summarize} from './security-review.mjs';

const root='/var/lib/utilibre-maintenance',cache='/var/cache/utilibre-security';
const scanner='/opt/utilibre/maintenance/bin/trivy';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
async function largeSha(p){const h=createHash('sha256');for await(const b of fs.createReadStream(p))h.update(b);return h.digest('hex');}
export function overlayHost(before,host){
 assert.equal(before.status,'checked');assert.equal(host.status,'checked');
 assert(host.packages>0&&host.os?.inventory==='present');
 assert(Number.isFinite(Date.parse(host.scannedAt))&&Date.parse(host.scannedAt)>=Date.parse(before.completedAt));
 assert.equal(host.database.updatedAt,before.database.updatedAt,'Do not combine different advisory snapshots');
 // Never make old image/source scans look newly completed.
 return {...before,host,hostRefreshedAt:host.scannedAt};
}
export async function run([mode,out,...extra]=process.argv.slice(2)){
 process.umask(0o077);assert(['prepare','publish'].includes(mode)&&path.isAbsolute(out)&&!extra.length);
 const live=root+'/security.json',database=cache+'/db/trivy.db';
 if(mode==='prepare'){
  assert(!fs.existsSync(out));fs.mkdirSync(out,{mode:0o700});
  const before=read(live),beforeSha256=sha(live);assert.equal(before.status,'checked');
  fs.copyFileSync(live,out+'/security.before.json');
  const metadata=read(cache+'/db/metadata.json');assert.equal(metadata.UpdatedAt,before.database.updatedAt);
  assert(Date.now()-Date.parse(metadata.UpdatedAt)<48*3600000,'Cached advisory data too old');
  const databaseSha256=await largeSha(database),scannerSha256=sha(scanner);
  const input=out+'/input';fs.mkdirSync(input+'/etc',{recursive:true});fs.mkdirSync(input+'/var/lib/dpkg',{recursive:true});
  for(const f of ['etc/os-release','etc/debian_version','var/lib/dpkg/status'])fs.copyFileSync('/'+f,input+'/'+f);
  const inputSha256=sha(input+'/var/lib/dpkg/status');
  const args=['--cpu=240:240','--nofile=1024:1024','--','unshare','--net','--',scanner,'rootfs','--disable-telemetry','--cache-dir',cache,'--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','4m','--no-progress','--list-all-pkgs','--format','json','--pkg-types','os','--output',out+'/raw.json',input];
  try{cp.execFileSync('prlimit',args,{timeout:270000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe'],env:{PATH:'/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C.UTF-8',TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'2',GOMEMLIMIT:'1GiB'}});}
  catch(e){fs.writeFileSync(out+'/error.log',String(e.stderr||e.message).slice(0,64000));throw Error('Host scan failed; private evidence retained, live reports unchanged');}
  assert(fs.statSync(out+'/raw.json').size<64*1024**2);assert.equal(await largeSha(database),databaseSha256);assert.equal(sha(scanner),scannerSha256);
  assert.equal(sha('/var/lib/dpkg/status'),inputSha256,'Host packages changed during scan');assert.equal(sha(live),beforeSha256,'Concurrent fleet scan changed');
  const host={...summarize(read(out+'/raw.json')),status:'checked',scannedAt:new Date().toISOString(),inputSha256,database:{updatedAt:metadata.UpdatedAt,sha256:databaseSha256},scannerSha256,rawSha256:sha(out+'/raw.json'),network:'isolated network namespace'};
  overlayHost(before,host);
  fs.writeFileSync(out+'/host.json',JSON.stringify(host,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(out+'/receipt.json',JSON.stringify({beforeSha256,hostSha256:sha(out+'/host.json'),databaseSnapshotPreserved:false,note:'Advisory identity recorded; original cache must still match for exact replay. No database refresh, live requests, packages or services changed.'},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({prepared:true,hostPackages:host.packages,counts:host.counts,report:out+'/host.json',published:false}));
 }else{
  assert.equal(fs.lstatSync(out).mode&0o077,0);assert(!fs.existsSync(out+'/publication.json'));
  const receipt=read(out+'/receipt.json'),host=read(out+'/host.json');assert.equal(sha(out+'/host.json'),receipt.hostSha256);assert.equal(sha(out+'/raw.json'),host.rawSha256);
  assert.equal(sha(live),receipt.beforeSha256,'Concurrent scan: prepare again');assert.equal(sha('/var/lib/dpkg/status'),host.inputSha256);
  assert(Date.now()-Date.parse(host.scannedAt)<3600000);const next=overlayHost(read(live),host);
  fs.writeFileSync(live+'.tmp',JSON.stringify(next,null,2)+'\n',{mode:0o600});fs.renameSync(live+'.tmp',live);
  const {run:rebuild}=await import('./build-queue.mjs');await rebuild();
  fs.writeFileSync(out+'/publication.json',JSON.stringify({date:new Date().toISOString(),beforeSha256:receipt.beforeSha256,afterSha256:sha(live),fleetCompletedAtUnchanged:next.completedAt,hostScannedAt:host.scannedAt},null,2)+'\n',{flag:'wx'});
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
