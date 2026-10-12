// Same-branch upstream security release; exact five findings and live payloads.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012',build=dir+'/python-system/build',read=p=>JSON.parse(fs.readFileSync(p));
const version='3.13.16-1~deb13u1+utilibre1',ids=['CVE-2026-15308','CVE-2026-19445','CVE-2026-19553','CVE-2026-7210','CVE-2026-82049'];
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:60000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const q=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(q,scan);assert.equal(scan.status,'checked');
const release=read(dir+'/python-system-release.json'),host=read(dir+'/python-system-host.json');assert.equal(release.status,'passed');assert.equal(host.status,'passed');assert(host.checks.native.passed&&host.checks.hostModules&&host.checks.http.passed);
const rows=overlayRows(release),b=read(dir+'/python-system/python-system-penpot-backend/build.json'),n=read(dir+'/python-system/python-system-penpot-backend/native.json');assert(b.passed&&n.passed&&n.application.woff2Roundtrip&&n.upstreamCases===5658&&n.upstreamSkipped===104);
for(const file of additionalOverlayReceipts)if(fs.existsSync(root+'/'+file))for(const next of overlayRows(read(root+'/'+file))){
 const previous=rows.find(r=>r.name===next.name&&r.newImage===next.oldImage);
 if(previous&&next.oldImage!==next.newImage)rows.push({...next,originalImage:previous.originalImage||previous.newImage});
}
assert.equal(sha(dir+'/sources/Python-3.13.16.tar.xz'),'f4b1bfb3c79b5bb11b8d228a12504163b4c0dab4d679828d8f5f26b6cb6ab35d');assert.equal(sha(build+'/security-tests.log'),b.upstreamSuiteSha256);
assert(fs.readFileSync(build+'/runner.log','utf8').includes('NATIVE_PYTHON_SYSTEM_BUILD_AND_FOCUSED_TESTS_PASSED'));
const sums=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[l.slice(66).split('/').at(-1),l.slice(0,64)]));
const packages=['libpython3.13','libpython3.13-minimal','libpython3.13-stdlib','python3.13','python3.13-minimal','python3.13-venv'];
const checked=new Map(),decisions=[],proofs=[];
function walk(d,p=''){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name,p+'/'+e.name):e.isFile()?[p+'/'+e.name]:[]);}
const resident=[];for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p)))try{if(fs.readFileSync('/proc/'+pid+'/cgroup','utf8').includes('docker'))continue;if(/python3\.13.*deleted/.test(fs.readlinkSync('/proc/'+pid+'/exe')))resident.push(pid);}catch{}
for(const item of q.items.filter(i=>i.status==='needs-review'&&i.type==='debian'&&['host-os','runtime-image'].includes(i.scope)&&i.installed===version&&packages.includes(i.package)&&ids.includes(i.id))){
 const isHost=item.scope==='host-os';
 if(isHost){assert.equal(resident.length,0,'Old interpreter process remains');assert(Date.parse(host.completedAt)<=Date.parse(scan.date));}
 else{assert.equal(n.imageId,b.imageId);assert.deepEqual(item.containers,['utilibre-expanded-penpot-backend-1']);for(const name of item.containers){const row=rows.find(r=>r.name===name&&r.newImage===item.artifact);assert(row&&Date.parse(row.completedAt)<=Date.parse(scan.date));assert.equal(row.originalImage||item.artifact,b.imageId);assert.equal(run('docker',['inspect',name,'--format','{{.Image}}']),item.artifact);}}
 const key=item.artifact+'|'+item.package;
 if(!checked.has(key)){
  const leaf=item.package+'_'+version+'_amd64.deb',deb=build+'/'+leaf;assert.equal(sha(deb),sums.get(leaf));const temp=fs.mkdtempSync('/dev/shm/utilibre-python-proof-');
  try{
   run('dpkg-deb',['-x',deb,temp]);const paths=walk(temp).filter(p=>/^\/usr\/(?:bin\/|lib\/)/.test(p)&&!p.endsWith('.pyc'));assert(paths.length);
   const manifest=paths.map(path=>({path,sha256:sha(temp+path)}));
   for(const name of isHost?[null]:item.containers){const cmd=(p,a)=>name?run('docker',['exec',name,p,...a]):run(p,a);assert.equal(cmd('dpkg-query',['-W','-f=${Version}',item.package]),version);assert.equal(cmd('dpkg-query',['-W','-f=${Version}','libexpat1']),'2.9.0-1');const output=cmd('sha256sum',paths).split('\n');assert.equal(output.length,manifest.length);output.forEach((line,index)=>assert.equal(line,manifest[index].sha256+'  '+manifest[index].path));}
   checked.set(key,{packageSha256:sha(deb),files:manifest.length,manifestSha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')});
  }finally{fs.rmSync(temp,{recursive:true});}
 }
 const reason=`Native CPython 3.13.16 maintenance release, not a cross-series ABI change, fixes this exact ${item.id} finding. Original upstream source SHA256 f4b1bfb3c79b5bb11b8d228a12504163b4c0dab4d679828d8f5f26b6cb6ab35d with Debian native packaging and system Expat 2.9.0; no custom security algorithm. Focused upstream run: 5658 cases, 104 skips, 42 modules including two platform skips, no failure. Actual installed runtime/stdlib payload matches retained packages; native host module/HTTP and Penpot image/font/venv checks passed. https://docs.python.org/3.13/whatsnew/changelog.html#python-3-13-16-final ; https://security-tracker.debian.org/tracker/${item.id} . Exact evidence: closure-followup-20261012/python-system-review.json. Other interpreters/dependencies and untested workflows are not waived.`;
 decisions.push(validateDecision({key:item.key,status:'mitigated',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));proofs.push({key:item.key,artifact:item.artifact,...checked.get(key)});
}
fs.writeFileSync(dir+'/python-system-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
