// Explicit native host CLI payload and three-commit source proof for two CVEs.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012',build=dir+'/wget-trixie';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const q=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(q,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const host=read(dir+'/wget-host.json'),version='1.25.0-2+utilibre1';assert.equal(host.status,'passed');assert(Date.parse(host.completedAt)<=Date.parse(scan.date));assert(host.librariesConfigurationServicePidsUnchanged&&host.native.passed&&!host.native.oldRegressionObserved&&host.native.checks.length===8);assert.equal(run('dpkg-query',['-W','-f=${Version}','wget']),version);
const deb=build+'/wget_'+version+'_amd64.deb';assert.equal(sha(fs.readFileSync(deb)),'ce7dce2cad1411baed2837cb16d4373622e6377c4c103e34b92057854e11b94d');assert.equal(host.packageSha256,sha(fs.readFileSync(deb)));assert.equal(sha(fs.readFileSync('/usr/bin/wget')),host.native.binarySha256);
const source=build+'/wget_'+version+'.debian.tar.xz';assert.equal(sha(fs.readFileSync(source)),'61b570fae998a75977f5d40aa5f10792505e6a03ee25f15e82f68972102b7751');
const patches={c2640fe:'1cf705d8020435be06fe8daca1ab3dfa8cd2bc93937b613dfb1c49d56135878e',dd692d9:'0162d60cfe9ad46e47bf1dca59a25b88f26d34546030c0380ae213cb982bf30c',f76978a:'4e6a2ed1ddc590a0cdd8e94f5b4f35ce49602ff9311689c57263276bb6223bf3'};
for(const [id,sum]of Object.entries(patches))assert.equal(sha(cp.execFileSync('tar',['-xOf',source,'debian/patches/utilibre-'+id+'.patch'])),sum);
const log=fs.readFileSync(build+'/build.log','utf8');assert(!/# (?:FAIL|ERROR):\s+[1-9]/.test(log));assert(log.includes('PASS: unit-tests'));
const temp=fs.mkdtempSync('/dev/shm/utilibre-wget-proof-');try{run('dpkg-deb',['-x',deb,temp]);assert.equal(sha(fs.readFileSync(temp+'/usr/bin/wget')),host.native.binarySha256);}finally{fs.rmSync(temp,{recursive:true});}
const decisions=[];for(const item of q.items.filter(i=>i.status==='needs-review'&&i.scope==='host-os'&&i.type==='debian'&&i.package==='wget'&&i.installed===version&&['CVE-2026-58471','CVE-2026-58472'].includes(i.id))){
 const reason=`Native Debian Wget ${version} backports upstream c2640fe filename-buffer fix and dd692d9 HTML arithmetic fix WITH the required f76978a regression correction and upstream unit tests. Exact source/package/executable hashes and completed host release checked. Native upstream suites completed with skips recorded separately; isolated old CLI reproduces filename truncation, candidate and actual installed CLI preserve full UTF-8 name and pass HTTP/redirect/gzip/POST/TLS trust/rejection/404 checks. Config, dependent libraries and Docker/SSH PIDs unchanged. https://security-tracker.debian.org/tracker/${item.id} . Exact evidence: closure-followup-20261012/wget-review.json. No multi-gigabyte overflow or ASan claim; only this CVE is mitigated, not the whole dependency stack.`;
 decisions.push(validateDecision({key:item.key,status:'mitigated',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
}
fs.writeFileSync(dir+'/wget-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,packageSha256:host.packageSha256,binarySha256:host.native.binarySha256,sourceSha256:sha(fs.readFileSync(source)),patches},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
