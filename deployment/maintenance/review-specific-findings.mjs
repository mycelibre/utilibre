// Bounded evidence review, not a CVE ignore list. Each decision is tied to the
// exact current artifact/package/advisory key and expires after seven days.
// Rechecks primary package/binary evidence; never exempts an entire Go runtime.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateDecision} from './triage.mjs';
const dir='/var/lib/utilibre-maintenance',queue=JSON.parse(readFileSync(dir+'/security-queue.json'));
const scan=JSON.parse(readFileSync(dir+'/security.json'));assert.equal(scan.status,'checked');
const docker=args=>execFileSync('docker',args,{maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});
const decisions=[];
for(const item of queue.items){
 if(item.scope!=='runtime-image')continue;
 if(!((item.id==='CVE-2023-45853'&&item.package==='zlib1g'&&item.installed==='1:1.2.13.dfsg-1')||(item.id==='CVE-2025-68121'&&item.package==='stdlib'&&item.installed==='v1.24.6')))continue;
 const image=scan.images.find(x=>x.id===item.artifact),name=item.containers[0];
 if(!image||docker(['inspect','--format','{{.Image}}',name]).toString().trim()!==item.artifact)continue;
 let reason;
 if(item.id==='CVE-2023-45853'&&item.package==='zlib1g'&&item.installed==='1:1.2.13.dfsg-1'){
  const files=docker(['exec',name,'dpkg-query','-L','zlib1g']).toString();
  assert(files.includes('libz.so'));assert(!/minizip/i.test(files));
  reason='Debian explicitly excludes the bookworm zlib binary package: vulnerable contrib/minizip was not built in this version. Exact zlib1g file list contains libz, not minizip. https://security-tracker.debian.org/tracker/CVE-2023-45853 . Does not exempt libminizip, pyminizip, other CVEs or future versions.';
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
