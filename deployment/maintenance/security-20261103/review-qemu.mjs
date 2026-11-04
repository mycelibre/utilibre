// Exact installed official packages; primary fixed-version evidence, not a
// version-wide exemption for QEMU or the Proxmox hypervisor.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {inventory} from '../component-followup/inventory.mjs';import {validateDecision} from '../triage.mjs';import {freshScan} from '../review-native-backports.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261028/qemu-native',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const vendor=read(new URL('./qemu-vendor-fixed.json',import.meta.url)),spec=read(new URL('../security-20261028/qemu-inputs.json',import.meta.url)),release=read(dir+'/release.json');
assert.equal(release.status,'passed');assert.equal(release.version,vendor.version);assert.equal(release.version,spec.version);assert(Date.parse(release.completedAt)<Date.parse(scan.date));
assert(release.proxmoxPostcheck.operatorConfirmed&&release.proxmoxPostcheck.ping==='passed'&&release.proxmoxPostcheck.freezeStatus==='thawed');
assert.equal(sha(dir+'/native.json'),release.nativeSha256);const native=read(dir+'/native.json');assert(native.passed&&native.nativeCapabilitiesPreserved&&native.nativeBlockConversionAndZeroRead);
const primary=read(root+'/closure-followup-20261012/debian-primary.json');assert(Date.now()-Date.parse(primary.date)<86400000,'Refresh primary assessment deliberately');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:15000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const proofs=[];
for(const [name,p]of Object.entries(spec.packages)){
 assert.equal(sha(dir+'/'+p.file),p.sha256);assert.equal(run('dpkg-query',['-W','-f=${Version}',name]),spec.version);
 const actual=inventory(name).records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));
 const prepared=release.proofs.find(x=>x.name===name);assert(prepared);assert.deepEqual(actual,prepared.payload);
 proofs.push({name,archiveSha256:p.sha256,payload:actual});
}
const pid=run('systemctl',['show','qemu-guest-agent.service','-p','MainPID','--value']);assert.equal(sha('/proc/'+pid+'/exe'),sha('/usr/sbin/qemu-ga'));
const decisions=[];
for(const i of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='host-os'&&i.artifact==='host-dpkg'&&i.type==='debian'&&Object.hasOwn(spec.packages,i.package)&&i.installed===spec.version&&Object.hasOwn(vendor.records,i.id))){
 assert.deepEqual(primary.sources.qemu[i.id],vendor.records[i.id],'Changed primary advisory needs review');
 const fixed=vendor.records[i.id].releases.sid;assert.equal(fixed.status,'resolved');assert.equal(fixed.fixed_version,'1:11.1.2+ds-1');run('dpkg',['--compare-versions',spec.version,'ge',fixed.fixed_version]);
 decisions.push(validateDecision({key:i.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Debian primary tracker marks ${i.id} fixed in ${fixed.fixed_version}; the installed official backport ${spec.version} includes that release. Complete package payload matches its authenticated archive and completed two-package release; active qemu-ga matches the new executable. Isolated native guest-agent RPC/key lifecycle and block conversion checks passed; operator confirmed Proxmox ping and thawed after activation. This is fixed-artifact evidence, not a separate exploit reproduction or assessment of the Proxmox hypervisor. Other QEMU advisories remain open. https://security-tracker.debian.org/tracker/${i.id} . Evidence: security-20261028/qemu-native/{native,release}.json and security-20261103/qemu-review.json.`}));
}
fs.writeFileSync(root+'/security-20261103/qemu-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,proofs,decisions},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
