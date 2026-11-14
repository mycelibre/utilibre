// Finite installed-payload review after the complete fleet scan. Raw findings
// stay intact; executable repairs and passive sibling packages are separate.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {inventory,command} from '../component-followup/inventory.mjs';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',r=root+'/security-20261114',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scan=read(root+'/security.json'),q=read(root+'/security-queue.json');freshScan(q,scan);assert.equal(scan.status,'checked');
assert.equal(scan.database.updatedAt,read(r+'/before-security.json').database.updatedAt);
const expiresAt=new Date(Date.now()+7*86400000).toISOString(),decisions=[],proofs=[];
const wanted=i=>i.status==='needs-review'&&['HIGH','CRITICAL'].includes(i.severity);
const decide=(i,status,reason)=>decisions.push(validateDecision({key:i.key,status,expiresAt,reason}));
const gitIds=['CVE-2026-105437','CVE-2026-111760','CVE-2026-114466'];
const gitInputs=read(new URL('./git-inputs.json',import.meta.url));
const gitBuild=read(r+'/git/build.json');assert(gitBuild.passed&&gitBuild.network==='none');
assert.equal(gitBuild.sourceSha256,'ca988eb9af7d8770339df7cdc38106fec8244664ff886840767cb9be3ef0e16c');
const gitPackage=read(r+'/git/package.json');assert(gitPackage.passed&&gitPackage.allNativeExecutablesUpdated);
for(const [container,folder] of [[null,'host'],...gitInputs.rows.map(s=>[s.containers[0],s.key])]){
 const receipt=read(r+'/git/'+(container?folder+'/release-'+(folder==='rsshub'?'utilibre-services':folder==='priviblur'?'utilibre-priviblur':'utilibre-expanded')+'.json':'host-release.json'));assert.equal(receipt.status,'passed');
 const id=container?command('docker',['inspect','--format','{{.Image}}',container]):'host-dpkg';
 if(container){const b=read(r+'/git/'+folder+'/build.json');assert.equal(id,b.imageId);assert(read(r+'/git/'+folder+'/application.json').passed);}
 const native=inventory('git',container);assert.equal(native.installed,'1:2.54.1+utilibre1');
 // Compare every shipped native executable with the packaged upstream build.
 for(const p of native.records.filter(p=>p.magic==='7f454c46'))assert.equal(p.sha256,sha(r+'/git/package'+p.path));
 proofs.push({kind:'git',container,artifact:id,inventory:native});
 for(const i of q.items.filter(i=>wanted(i)&&i.artifact===id&&i.package==='git'&&gitIds.includes(i.id)))
  decide(i,'mitigated',`Installed upstream Git 2.54.1 security maintenance release, SHA256 ${gitBuild.sourceSha256}; every installed Git ELF matches the native candidate and dpkg reports 1:2.54.1+utilibre1. All 13 selected upstream regression scripts passed, including legitimate clone/merge/import workflows; application compatibility and exact release gates passed. The Nov 10 upstream announcement explicitly includes 2.54.1 fixes for this advisory. Debian/DHI version-only metadata still reports it; raw records retained, including the stale DHI status fragment. Evidence: security-20261114/git/{build,package,${container?folder+'/application':'host-release'}}.json. https://github.blog/open-source/git/git-security-vulnerabilities-announced-7/`);
 if(folder==='penpot-exporter')continue; // DHI does not install git-man.
 const man=inventory('git-man',container);assert(man.records.every(p=>p.type==='directory'||p.path.startsWith('/usr/share/')));assert(!man.records.some(p=>p.magic==='7f454c46'));proofs.push({kind:'git-man',container,inventory:man});
 for(const i of q.items.filter(i=>wanted(i)&&i.artifact===id&&i.package==='git-man'&&gitIds.includes(i.id)))
  decide(i,'not-affected',`Exact git-man ${man.installed} payload is documentation under /usr/share, with no executable ELF; this advisory affects Git clone, merge or fast-import implementation, not the manual files. The actual Git executables were separately rebuilt from security release 2.54.1 and checked against the installed package. Evidence: security-20261114/native-review.json; no claim that old manuals are newly rewritten. https://github.blog/open-source/git/git-security-vulnerabilities-announced-7/`);
}
const xs=read(r+'/xserver/packages.json');assert(xs.passed);const xInputs=read(new URL('./xserver-inputs.json',import.meta.url));
const xIds=[...new Set(xInputs.patches.map(p=>p.advisory))],oldXIds=['CVE-2023-5574','CVE-2026-88812','CVE-2026-93516','CVE-2026-93521','CVE-2026-93523'];
for(const s of xs.records){
 const container=s.role==='host'?null:'utilibre-expanded-penpot-exporter-1',id=container?command('docker',['inspect','--format','{{.Image}}',container]):'host-dpkg';
 const b=read(r+'/xserver/'+s.role+'/build.json'),native=read(r+'/xserver/'+s.role+'-native.json');assert(b.passed&&b.nativeUpstreamCheckPassed&&b.oneScreenBuildPreserved&&native.passed);
 assert.equal(read(r+'/xserver/release-'+(container?'exporter':'host')+'.json').status,'passed');
 const inv=inventory('xvfb',container);assert.equal(inv.installed,s.newVersion);assert.equal(inv.records.find(x=>x.path==='/usr/bin/Xvfb').sha256,s.binarySha256);assert.equal(b.binarySha256,s.binarySha256);
 proofs.push({kind:'xvfb',container,inventory:inv,buildSha256:sha(r+'/xserver/'+s.role+'/build.json')});
 for(const i of q.items.filter(i=>wanted(i)&&i.artifact===id&&i.package==='xvfb'&&[...xIds,...oldXIds].includes(i.id)))
  decide(i,'mitigated',`Exact installed Xvfb ${inv.installed} executable matches the tested native rebuild (${s.binarySha256}). All seven pinned upstream patches for six new CVEs are applied on the authenticated native vendor source; the DHI glamor context adaptation is checksum-pinned. Previous vendor fixes and MAXSCREENS=1 remain present. Upstream make check and authenticated X11 pixel/modifier/reset tests passed; Penpot two-account PNG/PDF exports passed. Kernel/Proxmox and other X servers are outside this review. Evidence: security-20261114/xserver/{${s.role}/build,${s.role}-native,packages}.json and xserver-inputs.json. https://security-tracker.debian.org/tracker/${i.id}`);
 const common=inventory('xserver-common',container);assert(!common.records.some(x=>x.magic==='7f454c46'));assert(common.records.every(x=>x.type==='directory'||x.path.startsWith('/usr/share/')||['/usr/lib/xorg/protocol.txt','/var/lib/xkb/README.compiled'].includes(x.path)));proofs.push({kind:'xserver-common',container,inventory:common});
 for(const i of q.items.filter(i=>wanted(i)&&i.artifact===id&&i.package==='xserver-common'&&xIds.includes(i.id)))
  decide(i,'not-affected',`Complete installed xserver-common ${common.installed} inventory contains documentation/protocol/cache notes, no X server executable or library. ${i.id} affects the X server implementation, not those sibling data files. The actual Xvfb binary is separately repaired and tested. Exact inventory and executable proof: security-20261114/native-review.json; raw source-package matching retained. https://security-tracker.debian.org/tracker/${i.id}`);
}
const qp=read(r+'/qemu/native/package.json'),qb=read(r+'/qemu/native/build.json'),qr=read(r+'/qemu/native/release.json');assert(qp.passed&&qb.passed&&qr.status==='passed');assert.equal(qr.packageSha256,qp.packageSha256);
const qpatches=read(r+'/qemu/patches.json');for(const p of qpatches)assert.equal(sha(r+'/qemu/'+p.commit+'.patch'),p.sha256);
const compile=read(r+'/qemu/native/compile_commands.json');assert(compile.length>100);for(const p of qpatches.filter(p=>p.id!=='CVE-2026-101291'))for(const f of p.files)assert(!compile.some(c=>c.file.endsWith('/'+f)),'Emulated-device source compiled into candidate');
const source=root+'/security-20261103/remaining/qemu-components/source';const qga=fs.readFileSync(source+'/qga/meson.build','utf8');assert(!/system_ss|hw_arch|io_ss|chardev_ss/.test(qga));
const beforeQueue=read(r+'/before-security-queue.json');
for(const name of ['qemu-utils','qemu-guest-agent']){
 const inv=inventory(name);assert.equal(inv.installed,name==='qemu-utils'?qp.newVersion:qp.oldVersion);
 const elf=inv.records.filter(p=>p.magic==='7f454c46');
 assert.deepEqual(elf.map(p=>p.path).sort(),name==='qemu-utils'?['/usr/bin/qemu-img','/usr/bin/qemu-io','/usr/bin/qemu-nbd','/usr/bin/qemu-storage-daemon']:['/usr/sbin/qemu-ga']);
 for(const p of elf)assert.equal(p.sha256,name==='qemu-utils'?qb.binaries[p.path.split('/').at(-1)]:qr.guestAgentSha256);
 proofs.push({kind:name,inventory:inv});
 for(const i of q.items.filter(i=>wanted(i)&&i.scope==='host-os'&&i.package===name)){
  const p=qpatches.find(p=>p.id===i.id);
  if(p){const repaired=name==='qemu-utils'&&i.id==='CVE-2026-101291';
   decide(i,repaired?'mitigated':'not-affected',repaired?`Installed qemu-utils ${inv.installed}: all four block-tool executables match the native tools-only rebuild with upstream websocket bounds patch ${p.commit}. Upstream test-io-channel-websock and synthetic raw/qcow2 write/read/conversion, format-list and QMP-command compatibility passed. Guest agent and services unchanged; no reboot. Evidence: security-20261114/qemu/native/{build,package,native,release}.json. ${p.url}`:`Exact ${name} ${inv.installed} executable inventory and native build graph exclude ${p.files.join(', ')}. This advisory concerns ${i.id==='CVE-2026-101291'?'the websocket I/O channel, absent from qemu-ga':'system-emulator devices, absent from the installed guest-agent/block-tool packages'}. Complete ELF payload identity, source graph and candidate compile commands are recorded in security-20261114/native-review.json. This is not a clearance of the separate Proxmox QEMU hypervisor. ${p.url}`);
  }else if(name==='qemu-utils'){
   const old=beforeQueue.items.find(x=>x.scope===i.scope&&x.package===name&&x.id===i.id&&x.status==='not-affected');
   if(old?.decision&&Date.parse(old.decision.expiresAt)>Date.now()){
    const component=['CVE-2022-3872','CVE-2023-1386'].includes(i.id);
    if(component)assert(!compile.some(c=>/\/hw\/(?:sd|9pfs)\//.test(c.file)));
    else {const v=read(new URL('../security-20261103/qemu-vendor-fixed.json',import.meta.url));assert.equal(v.version,qp.oldVersion);assert(v.records[i.id]);assert.equal(v.records[i.id].releases.sid.status,'resolved');}
    decisions.push(validateDecision({key:i.key,status:'not-affected',expiresAt:old.decision.expiresAt,reason:`Retained exact QEMU review ${old.key}: ${component?'the SDHCI/9p system-emulator sources remain absent from the tools-only compilation':'the same authenticated 11.1.2 Debian backport source retains its previously verified upstream fix; the only new source patch is the websocket bounds repair'}. All installed binaries and supported formats/QMP command surfaces verified. Original advisory-specific rationale remains in SHA-bound security-20261114/before-security-queue.json; expiry unchanged. Evidence: security-20261114/qemu/native/{compile_commands,build,release}.json and native-review.json. Separate Proxmox hypervisor is not assessed.`}));
   }
  }
 }
}
fs.writeFileSync(r+'/native-review.json',JSON.stringify({schemaVersion:1,scanDate:scan.completedAt,decisions,proofs},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
