// Exact native backport payload, primary fixed-version and release review.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
import {proveRsync} from '../security-20261109/rsync-policy.mjs';
process.umask(0o077);
const followup=process.argv.includes('--batch-20261109');assert.deepEqual(process.argv.slice(2),followup?['--batch-20261109']:[]);
const dir='/var/lib/utilibre-maintenance/'+(followup?'security-20261109':'closure-followup-20261012'),root='/var/lib/utilibre-maintenance/';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const q=read(root+'security-queue.json'),scan=read(root+'security.json');freshScan(q,scan);
const release=read(dir+(followup?'/rsync/release.json':'/rsync-release.json'));assert.equal(release.status,'passed');assert.equal(release.groups.length,1);
const group=release.groups[0];assert.equal(group.status,'passed');assert.equal(group.rows.length,1);
let row=group.rows[0];assert.equal(row.name,'utilibre-gathio-postgres-1');assert(Date.parse(group.completedAt)<=Date.parse(scan.date));
const native=read(dir+'/rsync/rsync-gathio-postgres/native.json');assert(native.passed&&native.nativeLocalIncrementalAndSafeLinks&&native.nativeLoopbackDaemonReadOnly);assert.equal(native.imageId,row.newImage);
const db=read(dir+'/rsync/rsync-gathio-postgres/database.json');assert(db.passed&&db.nativeDumpRestore&&db.documentdbTypedDataAndRoleIsolation);assert.equal(db.imageId,row.newImage);
const primary=read(root+'closure-followup-20261012/debian-primary.json');assert(Date.now()-Date.parse(primary.date)<86400000);
const inputs=followup?read(new URL('../security-20261109/rsync-followup-inputs.json',import.meta.url)):null;
const version=followup?inputs.package.version:'3.5.1+ds1-1~deb12u1+utilibre1',deb=dir+(followup?'/rsync/output/':'/rsync-bookworm/')+'rsync_'+version+'_amd64.deb',checksum=followup?inputs.package.sha256:'0af6a698f50dbc7ea7ca3fa436a5fd45e7c939b5de4bbf834c4a2a441a905258';
assert.equal(sha(fs.readFileSync(deb)),checksum);
if(followup){
 const b=read(dir+'/rsync/rsync-gathio-postgres/build.json');proveRsync(inputs,inputs.rows[0],b,native,db);
 for(const [file,hash] of Object.entries(inputs.evidence))assert.equal(sha(fs.readFileSync(dir+'/rsync/'+file)),hash);
 const source=read(new URL('../security-20261109/rsync-source.json',import.meta.url));for(const [file,hash] of Object.entries(source.files))assert.equal(sha(fs.readFileSync(dir+'/rsync/input/'+file)),hash);
}
for(const receipt of followup?[]:['gzip-release.json','sqlite-fts-release.json','urllib3-release.json'])if(fs.existsSync(dir+'/'+receipt)){
 const later=read(dir+'/'+receipt);assert.equal(later.status,'passed');
 const next=later.groups.flatMap(g=>{assert.equal(g.status,'passed');return g.rows.map(r=>({...r,completedAt:g.completedAt}));}).find(r=>r.name===row.name&&r.oldImage===row.newImage);
 assert(next&&Date.parse(next.completedAt)<=Date.parse(scan.date));row=next;
}
for(const receipt of additionalOverlayReceipts)if(fs.existsSync(root+receipt)){
 const next=overlayRows(read(root+receipt)).find(r=>r.name===row.name&&r.oldImage===row.newImage);
 if(next){assert(Date.parse(next.completedAt)<=Date.parse(scan.date));row=next;}
}
assert.equal(run('docker',['inspect',row.name,'--format','{{.Image}}']),row.newImage);
assert.equal(run('docker',['exec',row.name,'dpkg-query','-W','-f=${Version}','rsync']),version);
const temp=fs.mkdtempSync('/dev/shm/utilibre-rsync-proof-'),manifest=[];
try{
 run('dpkg-deb',['-x',deb,temp]);
 for(const path of ['/usr/bin/rsync','/usr/bin/rrsync','/usr/bin/rsync-ssl']){
  const hash=sha(fs.readFileSync(temp+path));assert.equal(run('docker',['exec',row.name,'sha256sum',path]).split(/\s+/)[0],hash);manifest.push({path,sha256:hash});
 }
}finally{fs.rmSync(temp,{recursive:true});}
const decisions=[],skipped=[];
for(const item of q.items.filter(i=>i.status==='needs-review'&&i.type==='debian'&&i.scope==='runtime-image'&&i.artifact===row.newImage&&i.package==='rsync'&&i.installed===version)){
 try{
  assert.deepEqual(item.containers,[row.name]);
  const fixed=primary.sources.rsync?.[item.id]?.releases?.sid;assert.equal(fixed?.status,'resolved');assert(fixed.fixed_version&&fixed.fixed_version!=='0');run('dpkg',['--compare-versions',version,'ge',fixed.fixed_version]);
  decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact installed native Bookworm rsync ${version}, built from authenticated Debian ${followup?'3.5.2+ds1-2':'3.5.1+ds1-1'} source without upstream code changes. Debian marks ${item.id} fixed in ${fixed.fixed_version}; installed version is newer. Binary/script payloads match package SHA256 ${checksum}; upstream suite ${followup?'286 passed/90 native skips; collision and duplicate-chain regressions failed on 3.5.1 for the intended reason and passed on 3.5.2':'306 passed/54 native skips'}, synthetic incremental/safe-links/read-only daemon and PostgreSQL permission/restore checks passed. No new production daemon, library ABI, user-data or retention change. https://security-tracker.debian.org/tracker/${item.id} . Native/release/payload evidence: ${followup?'security-20261109':'closure-followup-20261012'}/rsync-review.json. Only this exact finding; raw scanner output retained.`}));
 }catch(e){skipped.push({id:item.id,reason:e.message.slice(0,120)});}
}
fs.writeFileSync(dir+'/rsync-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,imageId:row.newImage,manifest,decisions,skipped},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
