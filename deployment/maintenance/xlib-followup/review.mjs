// Draft only: six exact upstream fixes, actual live bytes and completed ancestry.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';import {additionalOverlayReceipts} from '../followup-overlays.mjs';import {validateDecision} from '../triage.mjs';import {eligible} from './review-policy.mjs';import {packageGate} from './policy.mjs';
process.umask(0o077);const root='/var/lib/utilibre-maintenance',dir=root+'/xlib-followup-20261012',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const release=read(dir+'/release.json'),host=read(dir+'/host/release.json'),source=read(dir+'/source-checks.json'),specs=read(here+'specs.json');assert.equal(release.status,'passed');assert.equal(host.status,'passed');assert(source.passed);assert.equal(sha(dir+'/source-checks.json'),host.sourceProofSha256);
assert(Date.parse(host.completedAt)<=Date.parse(scan.date));assert(Date.parse(release.completedAt)<=Date.parse(scan.date));
for(const s of source.sources){
 for(const a of s.archives)assert.equal(sha(dir+'/sources/'+s.suite+'/'+s.package+'/'+a.file),a.sha256);
 const native=specs.sources.find(n=>n.suite===s.suite&&n.package===s.package);assert(native);assert.equal(s.version,native.version+'+utilibre1');
 for(const fix of s.fixes){assert(specs.patches.some(p=>p.cve===fix.cve&&p.sha256===fix.sha256&&p.commit===fix.commit));assert.equal(sha(dir+'/patches/'+fix.cve+'.patch'),fix.sha256);cp.execFileSync('git',['apply','--reverse','--check',dir+'/patches/'+fix.cve+'.patch'],{cwd:fs.existsSync(dir+'/work/'+s.suite+'/'+s.package)?dir+'/work/'+s.suite+'/'+s.package:root+'/security-20261028/review-sources/xlib/'+s.suite+'/'+s.package,stdio:'pipe',timeout:30000});}
 const build=dir+'/build/'+(s.suite==='dhi'?'trixie':s.suite);assert.equal(sha(build+'/'+s.suite+'-'+s.package+'-build.log'),s.buildLogSha256);assert.equal(sha(build+'/'+s.suite+'-'+s.package+'-patches.log'),s.patchLogSha256);
}
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim(),docker=(...a)=>run('docker',a);
const rows=overlayRows(release);for(const receipt of additionalOverlayReceipts){const p=root+'/'+receipt;if(!fs.existsSync(p)||p===dir+'/release.json')continue;for(const r of overlayRows(read(p)))if(rows.some(a=>a.name===r.name&&a.newImage===r.oldImage))rows.push(r);}
const decisions=[],checked=new Set;
for(const item of queue.items.filter(eligible)){
 const nativePackage=item.package.startsWith('libx11')?'libx11':item.package==='libxrender1'?'libxrender':'libxtst';const fix=specs.patches.find(p=>p.repo===nativePackage&&p.cve===item.id);assert(fix);
 if(item.scope==='host-os'){
  if(!checked.has('host')){
   assert.equal(sha(dir+'/host/checks.json'),host.checksSha256);assert(host.native.passed&&host.native.nativeDisplay&&host.native.renderExtension&&host.noServiceRestart);
   for(const f of host.newFiles){const stat=fs.lstatSync(f.file);assert.equal(stat.mode&0o7777,f.mode);if(f.link!==undefined){assert(stat.isSymbolicLink());assert.equal(fs.readlinkSync(f.file),f.link);}else{assert(stat.isFile());assert.equal(sha(f.file),f.sha256);}}
   checked.add('host');
  }assert.equal(run('dpkg-query',['-W','-f=${Version}',item.package]),item.installed);
 }else{
  const name=item.containers[0],end=rows.find(r=>r.name===name&&r.newImage===item.artifact);assert(end,'No exact completed same-role ancestry');assert(Date.parse(end.completedAt)<=Date.parse(scan.date));
  const g=release.groups.find(g=>g.rows.some(r=>r.name===name)),row=g.rows.find(r=>r.name===name),build=read(dir+'/images/'+row.key+'/build.json');assert.equal(row.newImage,build.imageId);
  if(!checked.has(name)){
   for(const [p,h]of Object.entries(g.proofs))assert.equal(sha(p),h);packageGate(build.suite,build.packages,build.packages.map(p=>p.name));assert.equal(docker('inspect',name,'--format','{{.Image}}'),item.artifact);
   for(const a of build.abi)assert.equal(docker('exec',name,'sha256sum',a.path).split(/\s+/)[0],a.newSha256,'Actual live native/private payload');
   checked.add(name);
  }assert.equal(docker('exec',name,'dpkg-query','-W','-f=${Version}',item.package),item.installed);
 }
 decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact ${nativePackage} upstream commit ${fix.commit} backported to the native signed-source baseline; source/patch/build archive hashes and zero-fuzz reverse check verified. Actual live native library payloads, ABI and exact completed release ancestry match the tested artifacts, including Penpot private copies. Native/app compatibility passed; malicious-X-server wire behavior was NOT newly reproduced, and this does not exempt other CVEs or packages. https://security-tracker.debian.org/tracker/${item.id} ; https://gitlab.freedesktop.org/xorg/lib/${nativePackage}/-/commit/${fix.commit} . Evidence: deployment/maintenance/xlib-followup/README.md and private exact release receipts.`}));
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt);assert.equal(read(root+'/security-queue.json').scanDate,scan.completedAt);
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
