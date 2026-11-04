// Exact binary-subpackage attribution; never a Proxmox/hypervisor clearance.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{inventory}from'../component-followup/inventory.mjs';import{freshScan}from'../review-native-backports.mjs';import{validateDecision}from'../triage.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261103/remaining/qemu-components',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputs=read(new URL('./qemu-components.json',import.meta.url)),spec=read(new URL('../security-20261028/qemu-inputs.json',import.meta.url)),release=read(root+'/security-20261028/qemu-native/release.json');
const scan=read(root+'/security.json'),q=read(root+'/security-queue.json');freshScan(q,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');assert.equal(release.status,'passed');assert.equal(release.version,inputs.version);assert.equal(spec.version,inputs.version);assert(Date.parse(release.completedAt)<Date.parse(scan.date));assert(release.proxmoxPostcheck.operatorConfirmed&&release.proxmoxPostcheck.ping==='passed'&&release.proxmoxPostcheck.freezeStatus==='thawed');
assert.equal(sha(dir+'/InRelease'),inputs.signedReleaseSha256);assert.equal(sha(dir+'/Sources.xz'),inputs.sourceIndexSha256);
for(const f of inputs.files){assert.equal(sha(dir+'/'+f.file),f.sha256);assert.equal(fs.statSync(dir+'/'+f.file).size,f.bytes);}
for(const [p,h]of Object.entries(inputs.sourceFiles))assert.equal(sha(dir+'/source/'+p),h);
const text=p=>fs.readFileSync(dir+'/source/'+p,'utf8');
assert.match(text('hw/sd/meson.build'),/system_ss\.add\(when: 'CONFIG_SDHCI', if_true: files\('sdhci.c'\)\)/);
assert.match(text('hw/9pfs/meson.build'),/system_ss.add_all\(when: 'CONFIG_FSDEV_9P', if_true: fs_ss\)/);
assert(!/system_ss|hw_arch/.test(text('qga/meson.build')));assert(!/system_ss|hw_arch|qga_ss/.test(text('storage-daemon/meson.build')));
const main=text('meson.build'),start=main.indexOf("  qemu_img = executable('qemu-img'"),end=main.indexOf("  subdir('storage-daemon')",start);assert(start>0&&end>start);assert(!/system_ss|hw_arch/.test(main.slice(start,end)));
const proofs=[],decisions=[];
for(const [name,paths]of Object.entries(inputs.elfFiles)){
 const inv=inventory(name);assert.equal(inv.installed,inputs.version);assert.deepEqual(inv.records.filter(r=>r.magic==='7f454c46').map(r=>r.path),paths);
 const actual=inv.records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));
 const p=release.proofs.find(p=>p.name===name);assert(p);assert.deepEqual(actual,p.payload);assert.equal(sha(root+'/security-20261028/qemu-native/'+spec.packages[name].file),spec.packages[name].sha256);
 proofs.push({package:name,elfFiles:paths,payload:actual});
 for(const i of q.items.filter(i=>i.status==='needs-review'&&i.scope==='host-os'&&i.artifact==='host-dpkg'&&i.type==='debian'&&i.package===name&&i.installed===inputs.version&&inputs.advisories.includes(i.id))){
  assert.equal(i.containers.length,0);
  decisions.push(validateDecision({key:i.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact ${name} ${inputs.version} binary-subpackage attribution: ${i.id} affects ${i.id==='CVE-2022-3872'?'the SDHCI emulated device':'the emulated 9p passthrough filesystem'}, neither present in this package's complete installed executable set. Every package payload file matches the authenticated archive in the completed native release. Independently authenticated backports source, Debian install lists and pinned Meson graph place both components in system_ss; qga and block-tool/storage-daemon targets are separate. This is not a new patch, emulator exploit test, or assessment of the separate Proxmox host. Other QEMU findings remain separate. Evidence: security-20261103/remaining/qemu-components/{acquisition,review}.json; https://security-tracker.debian.org/tracker/${i.id}`}));
 }
}
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,proofs,decisions,sourceFiles:inputs.sourceFiles},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
