// Exact live payload reviews, never package-name or version-only waivers.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';
import {run as rebuild} from '../build-queue.mjs';
import {overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
const simpleOnly=process.argv.includes('--simplelogin-oct28');assert(process.argv.slice(2).every(a=>['--apply','--simplelogin-oct28'].includes(a)));
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const q=read('security-queue.json'),scan=read('security.json');
assert.equal(q.scanDate,scan.completedAt);assert.equal(scan.status,'checked');
assert(Date.now()-Date.parse(scan.completedAt)<86400000);
const exec=(cmd,args,options={})=>{try{return cp.execFileSync(cmd,args,{encoding:'utf8',timeout:60000,stdio:['pipe','pipe','pipe'],...options}).trim();}catch{throw Error('Bounded payload evidence failed; no review applied.');}};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const release=read('closure-release-20261012.json'),decisions=[],proofs=[];
function group(key){const g=structuredClone(release.groups.find(x=>x.key===key));assert.equal(g?.status,'passed');g.originalImage=g.newImage;if(simpleOnly){assert.equal(key,'simplelogin');const chain=additionalOverlayReceipts.filter(f=>fs.existsSync(root+'/'+f)).flatMap(f=>overlayRows(read(f))).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));const images=g.rows.map(r=>{let id=g.newImage;for(const next of chain.filter(n=>n.name===r.name))if(next.oldImage===id&&next.oldImage!==next.newImage){assert(Date.parse(next.completedAt)<=Date.parse(scan.date));id=next.newImage;}return id;});assert.equal(new Set(images).size,1);g.newImage=images[0];}for(const r of g.rows)assert.equal(exec('docker',['inspect','--format','{{.Image}} {{.State.Running}}',r.name]),g.newImage+' true');return g;}
function decide(item,reason,status='mitigated'){decisions.push(validateDecision({key:item.key,status,reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));}

if(!simpleOnly){
const ssh=read('ssh-closure-20261012/release.json'),sshNative=read('ssh-closure-20261012/native.json');
assert.equal(ssh.status,'passed');assert(sshNative.passed);assert(ssh.configurationAndKeysUnchanged);
assert.equal(sha('/usr/bin/ssh'),sshNative.clientSha256);
for(const item of q.items.filter(x=>x.status==='needs-review'&&x.scope==='host-os'&&x.id==='CVE-2026-60002'&&x.package==='openssh-client')){
 assert.equal(item.installed,ssh.next);assert.equal(exec('dpkg-query',['-W','-f=${Version}',item.package]),ssh.next);
 decide(item,`Applied upstream OpenSSH client lifetime fix e8bdfb151a356d0171fea4194dd205fbb252be23 to signed Debian stable source, not a 10.4 version claim. Exact installed ${ssh.next}, client SHA256 ${sshNative.clientSha256}. Package build/unit tests, normal repeated 16 KiB rekeys with 512 KiB byte equality and mismatched host-key rejection passed against existing and candidate servers. Configuration/keys preserved. This was not an exploit reproduction. Source/release: deployment/maintenance/closure-review; private ssh-closure-20261012/native.json and release.json. Other SSH findings remain independent.`);
}
}

const simple=group('simplelogin');
const simpleNative=read('python-closure-20261012/simplelogin-parity.json');assert.equal(simpleNative.imageId,simple.originalImage);
const direct=JSON.parse(exec('docker',['run','--rm','-i','--network','none','--log-driver','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--cpus','1','--entrypoint','/code/.venv/bin/python',simple.newImage,'-'],{input:fs.readFileSync(new URL('../python-closure/check-backports.py',import.meta.url))}));assert(direct.passed);
const patches=read('python-closure-20261012/patches.json');
for(const p of patches)assert.equal(sha(root+'/python-closure-20261012/'+p.file),p.runtimeSha256);
// Reverse each signed-vendor hunk in order on disposable package copies. The
// two debugger patches overlap, so independent dry-runs would be incorrect.
exec('docker',['run','--rm','--user','0','--network','none','--read-only','--tmpfs','/tmp:rw,size=16m','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--cpus','1','-v',root+'/python-closure-20261012:/proof:ro','--entrypoint','/code/.venv/bin/python',simple.newImage,'-c',`import json,subprocess,shutil
for name in ['flask','werkzeug']:
 shutil.copytree('/code/.venv/lib/python3.12/site-packages/'+name,'/tmp/proof/'+name,ignore=shutil.ignore_patterns('__pycache__'))
for p in reversed(json.load(open('/proof/patches.json'))):
 subprocess.run(['patch','--batch','--reverse','--force','--fuzz=0','-p2','-d','/tmp/proof','-i','/proof/'+p['file']],check=True,capture_output=True)
print('passed')`]);
proofs.push({service:'simplelogin',image:simple.newImage,native:direct,patches});
for(const item of q.items.filter(x=>x.status==='needs-review'&&x.artifact===simple.newImage&&((x.package==='Flask'&&x.id==='CVE-2023-30861')||(x.package==='Werkzeug'&&['CVE-2023-25577','CVE-2024-34069','CVE-2023-23934'].includes(x.id))))){
 decide(item,`Signed Debian Flask 1.1.2 / Werkzeug 1.0.1 security backports applied to exact image ${simple.newImage}. Reverse application of every retained hunk on disposable copies and direct native regressions passed: session Vary: Cookie, multipart part limits, untrusted debugger host rejection and leading-equals cookie parsing. Application/interpreter hashes preserved; fresh native auth/CSRF/SMTP and fixture dump/restore passed. Stable package metadata intentionally unchanged. Evidence: python-closure-20261012/patches.json, simplelogin-parity.json; closure-review/review.mjs. Only the named backported defect is mitigated; legacy-framework/public-activation restrictions remain.`);
}

// Revalidate unchanged earlier native backports after the JS/FIPS overlays.
if(!simpleOnly){
for(const [key,id,pkg,path,hash,version] of [
 ['kuma','CVE-2025-7458','libsqlite3-0','/usr/lib/x86_64-linux-gnu/libsqlite3.so.0.8.6','f4b32d83fadc4787cabff8a115e4aca3ac808efe9d9521b9630f1d8815f129b5','3.40.1-2+deb12u2+utilibre1'],
 ['kuma','CVE-2025-7458','sqlite3','/usr/bin/sqlite3','78fbb4b1bc1fdcb0e3f321ffbcc3628ebff0a961d3c56d4d623f8daef59886c8','3.40.1-2+deb12u2+utilibre1'],
 ['authentik','CVE-2026-6653','libxml2','/usr/lib/x86_64-linux-gnu/libxml2.so.2.9.14','ac980c0afed237e5f14a6749a9e57af772d388d009a93caf633c20db40840947','2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1'],
]){
 if(!release.groups.some(g=>g.key===key))continue;
 const g=group(key),matches=q.items.filter(x=>x.status==='needs-review'&&x.artifact===g.newImage&&x.id===id&&x.package===pkg);if(!matches.length)continue;
 for(const r of g.rows){assert.equal(exec('docker',['exec',r.name,'dpkg-query','-W','-f=${Version}',pkg]),version);assert.equal(exec('docker',['exec',r.name,'sha256sum',path]).split(/\s+/)[0],hash);}
 const native=key==='kuma'?read('sqlite-final-20261011/checks.json'):read('xml-final-20261011/authentik/native.json');
 assert(key==='kuma'?native.status==='passed':native.passed===true);
 for(const item of matches){assert.equal(item.installed,version);decide(item,`Previously tested native ${id} source backport retained byte-for-byte through the closure overlay: ${path} SHA256 ${hash}, ${pkg} ${version}; verified in every live role of exact image ${g.newImage}. Original native regression receipt: ${key==='kuma'?'sqlite-final-20261011/checks.json':'xml-final-20261011/authentik/native.json'}. Fresh application checks and healthy exact-image closure-release-20261012.json verified. Raw upstream version finding retained; this exact payload only is mitigated, not an exemption for other defects.`);}
}

for(const item of q.items.filter(x=>x.status==='needs-review'&&x.scope==='host-os'&&x.package==='linux-libc-dev'&&['CVE-2026-43185','CVE-2024-50286','CVE-2025-37777','CVE-2026-63940'].includes(x.id))){
 assert.equal(exec('dpkg-query',['-W','-f=${Version}',item.package]),item.installed);
 const files=exec('dpkg-query',['-L',item.package]).split('\n');assert(files.some(p=>p.startsWith('/usr/include/linux/')&&p.endsWith('.h')));
 assert(files.every(p=>['/.','/usr','/usr/include','/usr/share','/usr/share/doc','/usr/lib','/usr/lib/linux','/usr/lib/linux/uapi'].includes(p)||p.startsWith('/usr/include/')||p.startsWith('/usr/share/doc/')||p.startsWith('/usr/lib/linux/uapi/')));
 assert.equal(exec('find',['/usr/lib/linux/uapi','-type','f','!','-name','*.h','-print']),'');
 decide(item,`Exact host linux-libc-dev ${item.installed} inventory contains userspace headers/documentation, not executable kernel modules. ${item.id} affects kernel code. This decision covers only the header package. The separately documented running-kernel ksmbd defect remains unfixed: module not in use and blacklist mitigation is not an absolute administrative load prohibition. See host-final/README.md and https://security-tracker.debian.org/tracker/${item.id}.`,'not-affected');
}
}
const report={date:new Date().toISOString(),scanDate:scan.completedAt,decisions,proofs,applied:false};
const reportFile=root+(simpleOnly?'/security-20261028/simplelogin-review.json':'/closure-payload-review-20261012.json');
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--apply')){
 const existing=read('security-decisions.json'),byKey=new Map(existing.map(x=>[x.key,x]));
 for(const d of decisions)byKey.set(d.key,d);
 fs.writeFileSync(root+'/security-decisions.json.tmp',JSON.stringify([...byKey.values()],null,2)+'\n');fs.renameSync(root+'/security-decisions.json.tmp',root+'/security-decisions.json');await rebuild();
 report.applied=true;fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({prepared:decisions.length,applied:report.applied}));
