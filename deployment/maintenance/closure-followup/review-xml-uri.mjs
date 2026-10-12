// One CVE, one exact existing backport: never exempts other XML versions/issues.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012';
const version='2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1';
const library='/usr/lib/x86_64-linux-gnu/libxml2.so.2.9.14';
const hash='ac980c0afed237e5f14a6749a9e57af772d388d009a93caf633c20db40840947';
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
const queue=JSON.parse(fs.readFileSync(root+'/security-queue.json')),scan=JSON.parse(fs.readFileSync(root+'/security.json'));
assert.equal(queue.scanDate,scan.completedAt);assert.equal(scan.status,'checked');assert(Date.now()-Date.parse(scan.completedAt)<86400000);
const uri=fs.readFileSync(root+'/native-final/libxml2-review/uri.c');
assert.equal(sha(uri),'1c250c29f535023de9e6eb60ca8a7e7ddbf837b24a18f17ad85aec5d4c1f658e');
assert.match(uri.toString(),/len = xmlStrlen\(str\);\s+if \(!\(len > 0\)\) return\(NULL\);/);
assert.equal(sha(fs.readFileSync(library)),hash);
const disassembly=run('objdump',['-d','--disassemble=xmlURIEscapeStr',library]);
assert.match(disassembly,/call[^\n]+<xmlStrlen[^\n]+\n[^\n]+test\s+%eax,%eax\n[^\n]+jle\s+7af87/);
assert.match(disassembly,/7af87:[\s\S]{0,200}xor\s+%r14d,%r14d/);
const deb=root+'/native-final/libxml2-output/libxml2_'+version+'_amd64.deb';
assert.equal(sha(fs.readFileSync(deb)),'b2ff4643de60160f0d80fbe617ce2aa6b92b9fa22d3f52cf02ab8cad7eb841e4');
const url='https://github.com/GNOME/libxml2/commit/8edbbdb09f24d26a2f900141fddc2b9d014f53b0.patch';
const response=await fetch(url,{signal:AbortSignal.timeout(20000)});assert(response.ok);const patch=await response.text();assert(patch.length<20000);assert.match(patch,/\+    if \(len == 0\)/);assert.match(patch,/\+        return\(NULL\);/);
fs.writeFileSync(dir+'/xml-uri-primary.patch',patch);
const decisions=[],proofs=[],skipped=[];
for(const item of queue.items.filter(i=>i.id==='CVE-2026-86139'&&i.package==='libxml2'&&i.installed===version&&i.status==='needs-review')){
 try{
  const host=item.scope==='host-os';assert(host||item.scope==='runtime-image');
  if(host){
   for(const pid of fs.readdirSync('/proc').filter(x=>/^\d+$/.test(x))){let maps;try{maps=fs.readFileSync('/proc/'+pid+'/maps','utf8')}catch{continue;}assert(!maps.split('\n').some(l=>l.includes('libxml2.so.2')&&l.includes('(deleted)')),'Older resident XML mapping remains');}
  }
  for(const name of host?[null]:item.containers){
   const cmd=(p,a)=>host?run(p,a):run('docker',['exec',name,p,...a]);
   if(!host)assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact);
   assert.equal(cmd('dpkg-query',['-W','-f=${Version}','libxml2']),version);
   assert.equal(cmd('sha256sum',[library]).split(/\s/)[0],hash);
   if(name?.includes('penpot-'))assert.equal(cmd('sha256sum',['/opt/imagick/lib/deps/libxml2.so.2']).split(/\s/)[0],hash);
  }
  const reason=`CVE-2026-86139 is the missing xmlStrlen==0 guard fixed by GNOME commit 8edbbdb09f24d26a2f900141fddc2b9d014f53b0. This exact already-deployed 2.9.14 backport ${version} contains the stronger len<=0 return-NULL guard before allocation. Authenticated native package SHA256 b2ff4643de60160f0d80fbe617ce2aa6b92b9fa22d3f52cf02ab8cad7eb841e4; live system/private ELF ${hash} matches. Source and disassembly verify the guard, not merely the misleading 2.12.7 package prefix. Primary patch and proof: closure-followup-20261012/xml-uri-review.json; https://github.com/GNOME/libxml2/commit/8edbbdb09f24d26a2f900141fddc2b9d014f53b0 . No giant-input test or exemption for other XML findings.`;
  decisions.push(validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
  proofs.push({key:item.key,artifact:item.artifact,librarySha256:hash,sourceSha256:sha(uri),disassemblySha256:sha(disassembly),primaryPatchSha256:sha(patch)});
 }catch(e){skipped.push({key:item.key,reason:e.message.slice(0,150)});}
}
fs.writeFileSync(dir+'/xml-uri-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
