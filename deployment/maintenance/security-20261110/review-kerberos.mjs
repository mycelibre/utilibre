// Read-only, finite payload review. Never alters a scanner result or a service.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
import {proveKerberos} from './kerberos-policy.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {expatDescendant} from '../security-20261103/expat-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261110';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const input=read(new URL('./kerberos-inputs.json',import.meta.url));
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');
freshScan(queue,scan);assert.equal(scan.status,'checked');
const release=read(dir+'/vendor-debian/release.json');assert.equal(release.status,'passed');
const deployed=overlayRows(release),proofs=[],decisions=[];
const descendants=additionalOverlayReceipts.filter(p=>fs.existsSync(root+'/'+p)).flatMap(p=>overlayRows(read(root+'/'+p)));
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
function payload(name,files,retained=[]){
 const execute=(p,a)=>name?run('docker',['exec',name,p,...a]):run(p,a);
 const entries=files.filter(f=>!retained.some(r=>r.path===f.path));
 const regular=entries.filter(f=>f.type==='file');assert(regular.length);
 const hashes=execute('sha256sum',['--',...regular.map(f=>f.path)]).split('\n');
 assert.deepEqual(hashes.map(l=>l.split(/\s+/)[0]),regular.map(f=>f.value));
 for(const f of entries.filter(f=>f.type==='symlink'))assert.equal(execute('readlink',['--',f.path]),f.value);
}
function decision(item,evidence,detail,status='mitigated'){
 decisions.push(validateDecision({key:item.key,status,expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Signed MIT Kerberos 1.22.3 fixes ${item.id}. ${detail} Exact source SHA256 ${input.source.sha256}; stable-suite native packaging, 15 ordinary API checks, isolated KDC tickets and GSS/SPNEGO exchange passed. Installed payload and completed release rechecked against this scan. No vulnerability reproduction. Raw Debian/version matches retained; no waiver for another artifact. Evidence: security-20261110/${evidence}. https://web.mit.edu/kerberos/krb5-1.22/krb5-1.22.3.html`}));
}
for(const s of input.rows){
 const d=dir+'/vendor-debian/'+s.key,b=read(d+'/build.json'),p=read(d+'/payload.json'),gate=read(d+'/scan-gate.json');
 proveKerberos(input,s,b,dir,{release:true,scan:gate});
 const currentArtifacts=[];
 for(const name of s.containers){
  const row=deployed.find(r=>r.name===name&&r.oldImage===s.base&&r.newImage===b.imageId);
  assert(row&&Date.parse(row.completedAt)<=Date.parse(scan.completedAt));
  const artifact=expatDescendant(name,b.imageId,row.completedAt,scan.completedAt,descendants);
  const live=JSON.parse(run('docker',['inspect',name]))[0];assert(live.State.Running&&live.Image===artifact);
  currentArtifacts.push(artifact);
  for(const r of p.rows){
   assert(!live.Mounts.some(m=>r.files.some(f=>f.path===m.Destination||f.path.startsWith(m.Destination+'/'))));
   assert.equal(run('docker',['exec',name,'dpkg-query','-W','-f=${Version}',r.package]),r.version);
   payload(name,r.files,r.retainedDocumentation);
   if(r.residual)assert.equal(run('docker',['exec',name,'sha256sum',r.residual.path]).split(/\s+/)[0],r.residual.sha256);
  }
 }
 assert.equal(new Set(currentArtifacts).size,1,'Split Kerberos service roles require separate review');
 const currentImage=currentArtifacts[0];
 proofs.push({key:s.key,imageId:currentImage,originalImage:b.imageId,payloadSha256:sha(fs.readFileSync(d+'/payload.json')),releaseRows:deployed.filter(r=>s.containers.includes(r.name))});
 for(const item of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&i.artifact===currentImage&&input.advisories.includes(i.id))){
  assert.deepEqual([...item.containers].sort(),[...s.containers].sort());
  const pRow=p.rows.find(r=>r.package===item.package);
  if(pRow){
   assert([pRow.version,pRow.residual?.version].includes(item.installed));
   decision(item,'vendor-debian/'+s.key+'/payload.json',`Actual ${item.package} ${pRow.version}; ${pRow.residual?'old DHI metadata remains unchanged alongside the verified replacement bytes.':'every runtime file matches the pinned native package.'}`);
  }else{
   assert.equal(s.key,'krb5-linkding-linkding');assert.equal(item.package,'krb5-locales');assert.equal(item.installed,s.unchangedDataPackages['krb5-locales']);
   const paths=run('docker',['exec',s.containers[0],'dpkg-query','-L','krb5-locales']).split('\n');
   assert(paths.every(p=>p==='/.'||p==='/usr'||p==='/usr/share'||p==='/usr/share/doc'||p.startsWith('/usr/share/doc/krb5-locales')||p.startsWith('/usr/share/locale')));
   const files=run('docker',['exec',s.containers[0],'find','/usr/share/doc/krb5-locales','/usr/share/locale','-type','f','-name','*krb5*']).split('\n').filter(Boolean);
   assert(files.length<=3&&files.every(p=>p.endsWith('/LC_MESSAGES/mit-krb5.mo')));
   if(files.length<3)assert(run('docker',['exec',s.containers[0],'cat','/etc/dpkg/dpkg.cfg.d/docker']).includes('path-exclude /usr/share/locale/*'));
   proofs.push({package:'krb5-locales',imageId:b.imageId,packagePaths:paths,translationFiles:files});
   decision(item,'kerberos/review.json','The unchanged krb5-locales package contains translation catalogs/documentation, no affected implementation. Its runtime libraries are separately payload-verified at 1.22.3.','not-affected');
  }
 }
}
const host=read(dir+'/kerberos/host/release.json');assert.equal(host.status,'passed');assert(host.noServiceRestart&&host.native.passed&&host.native.checks===15);
assert(Date.parse(host.completedAt)<=Date.parse(scan.completedAt));
for(const row of host.rows){
 assert.equal(run('dpkg-query',['-W','-f=${Version}',row.package]),row.new.version);
 assert.equal(sha(fs.readFileSync(row.new.path)),row.new.sha256);payload(null,row.newPayload);
 for(const item of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='host-os'&&i.artifact==='host-dpkg'&&i.type==='debian'&&i.package===row.package&&input.advisories.includes(i.id))){
  assert.equal(item.installed,row.new.version);decision(item,'kerberos/host/release.json',`Host ${row.package} ${row.new.version}; every installed file matches its archive. No service restart was needed.`);
 }
}
const report={schemaVersion:1,date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,hostReleaseSha256:sha(fs.readFileSync(dir+'/kerberos/host/release.json'))};
fs.writeFileSync(dir+'/kerberos/review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,images:proofs.filter(p=>p.key).length,applied:false}));
