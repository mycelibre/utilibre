// Bounded evidence review, not a CVE ignore list. Each decision is tied to the
// exact current artifact/package/advisory key and expires after seven days.
// Rechecks primary package/binary evidence; never exempts an entire Go runtime.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateDecision} from './triage.mjs';
const dir='/var/lib/utilibre-maintenance',queue=JSON.parse(readFileSync(dir+'/security-queue.json'));
const scan=JSON.parse(readFileSync(dir+'/security.json'));
assert(['checked','incomplete'].includes(scan.status));
assert(Date.now()-Date.parse(scan.completedAt)<86400000,'Fresh scan required');
const docker=args=>{try{return execFileSync('docker',args,{timeout:30000,maxBuffer:64*1024**2,stdio:['ignore','pipe','pipe']});}catch{throw Error('Bounded native evidence check failed; no decision issued.');}};
const decisions=[];
for(const item of queue.items){
 if(item.scope!=='runtime-image')continue;
 const headers=item.package==='linux-libc-dev'&&['CVE-2026-43185','CVE-2024-50286','CVE-2025-37777','CVE-2026-63940'].includes(item.id);
 const netip=item.id==='CVE-2024-24790'&&item.package==='stdlib'&&item.installed==='v1.17.6';
 if(!((item.id==='CVE-2023-45853'&&item.package==='zlib1g'&&item.installed==='1:1.2.13.dfsg-1')||(item.id==='CVE-2025-68121'&&item.package==='stdlib'&&item.installed==='v1.24.6')||headers||netip))continue;
 const image=scan.images.find(x=>x.id===item.artifact),name=item.containers[0];
 if(!image||image.status!=='checked'||docker(['inspect','--format','{{.Image}}',name]).toString().trim()!==item.artifact)continue;
 let reason;
 if(item.id==='CVE-2023-45853'&&item.package==='zlib1g'&&item.installed==='1:1.2.13.dfsg-1'){
  const files=docker(['exec',name,'dpkg-query','-L','zlib1g']).toString();
  assert(files.includes('libz.so'));assert(!/minizip/i.test(files));
  reason='Debian explicitly excludes the bookworm zlib binary package: vulnerable contrib/minizip was not built in this version. Exact zlib1g file list contains libz, not minizip. https://security-tracker.debian.org/tracker/CVE-2023-45853 . Does not exempt libminizip, pyminizip, other CVEs or future versions.';
 }
 if(headers){
  const files=docker(['exec',name,'dpkg-query','-L','linux-libc-dev']).toString().trim().split('\n');
  assert(files.some(p=>p.startsWith('/usr/include/linux/')&&p.endsWith('.h')));
  assert(files.every(p=>['/.','/usr','/usr/include','/usr/share','/usr/share/doc','/usr/lib','/usr/lib/linux','/usr/lib/linux/uapi'].includes(p)||p.startsWith('/usr/include/')||p.startsWith('/usr/share/doc/')||p.startsWith('/usr/lib/linux/uapi/')));
  if(files.includes('/usr/lib/linux/uapi'))assert.equal(docker(['exec',name,'find','/usr/lib/linux/uapi','-type','f','!','-name','*.h','-print']).toString().trim(),'');
  reason=`${item.id} concerns executable kernel ksmbd/KVM code, not userspace headers. The exact running container's linux-libc-dev file list contains only /usr/include and /usr/lib/linux/uapi headers and documentation; no kernel image/module. https://security-tracker.debian.org/tracker/${item.id} . This decision covers only this container-header finding, never the VM/Proxmox running kernel or linux-image packages; host kernel review remains separate.`;
 }
 if(netip){
  const paths=image.findings.filter(x=>x.id===item.id&&x.package===item.package&&x.installed===item.installed).map(x=>x.target);
  if(paths.length&&paths.every(p=>p==='usr/bin/runsc')){
   const bytes=docker(['exec',name,'cat','/usr/bin/runsc']);
   assert.equal(createHash('sha256').update(bytes).digest('hex'),'2aca288a1bd6b38f904defed9cbbd326d824323fe0b91cb12d808cde22d597d6');
   assert(!bytes.includes(Buffer.from('net/netip')));
   reason='GO-2024-2887 affects net/netip.Addr classification. net/netip was introduced in Go 1.18; this exact runsc hash identifies Go 1.17.6 and has no net/netip package path. https://go.dev/doc/go1.18#net/netip ; https://vuln.go.dev/ID/GO-2024-2887.json . Does not waive any other Go or gVisor vulnerability, or assert sandbox safety.';
  }
 }
 if(item.id==='CVE-2025-68121'&&item.package==='stdlib'&&item.installed==='v1.24.6'){
  const paths=image.findings.filter(x=>x.id===item.id&&x.package===item.package&&x.installed===item.installed).map(x=>x.target);
  if(paths.length&&paths.every(p=>p==='usr/local/bin/gosu')){
   const bytes=docker(['exec',name,'cat','/usr/local/bin/gosu']);
   assert.equal(createHash('sha256').update(bytes).digest('hex'),'52c8749d0142edd234e9d6bd5237dff2d81e71f43537e2f4f66f75dd4b243dd0');
   assert(!bytes.includes(Buffer.from('crypto/tls.')));
   reason='Only the exact gosu 1.19 binary is matched (SHA256 52c8749d0142edd234e9d6bd5237dff2d81e71f43537e2f4f66f75dd4b243dd0). It switches UID and execs a command; reviewed upstream source has no TLS transport, and binary contains no crypto/tls symbols. GO-2026-4337 affects TLS session resumption, not every program built with this Go version. https://pkg.go.dev/vuln/GO-2026-4337 ; https://github.com/tianon/gosu/tree/1.19 . No other Go finding is waived.';
  }
 }
 if(reason)decisions.push(validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
}
// Emits only review metadata. Apply this reviewed output to the private ledger
// with apply_patch; this checker does not silently clear the production queue.
console.log(JSON.stringify(decisions,null,2));
