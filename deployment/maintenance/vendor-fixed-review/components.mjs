// Rebind only existing runtime-header/MiniZip component reviews after images
// changed. Host kernel and every Go finding are explicitly outside this task.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/';
const queue=JSON.parse(fs.readFileSync(root+'security-queue.json'));
const scan=JSON.parse(fs.readFileSync(root+'security.json'));freshScan(queue,scan);
const run=(program,args)=>execFileSync(program,args,{encoding:'utf8',timeout:60000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const proposed=JSON.parse(run(process.execPath,['deployment/maintenance/review-specific-findings.mjs']));
const decisions=[],proofs=[];
for(const decision of proposed){
 const item=queue.items.find(i=>i.key===decision.key);
 if(!item||item.status!=='needs-review'||item.scope!=='runtime-image'||!['linux-libc-dev','zlib1g'].includes(item.package))continue;
 const observed=[];
 for(const name of item.containers){
  assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact);
  assert.equal(run('docker',['exec',name,'dpkg-query','-W','-f=${Version}',item.package]),item.installed);
  const files=run('docker',['exec',name,'dpkg-query','-L',item.package]);
  if(item.package==='zlib1g'){assert.equal(item.id,'CVE-2023-45853');assert(files.includes('libz.so'));assert(!/minizip/i.test(files));}
  else {
   assert(['CVE-2026-43185','CVE-2024-50286','CVE-2025-37777','CVE-2026-63940'].includes(item.id));
   assert(files.includes('/usr/include/linux/'));assert(!/\/(boot|modules)\//.test(files));
  }
  observed.push({container:name,packageFileListSha256:createHash('sha256').update(files).digest('hex')});
 }
 decisions.push(decision);proofs.push({key:item.key,artifact:item.artifact,package:item.package,installed:item.installed,id:item.id,observed});
}
const report={date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs};
fs.writeFileSync(root+'component-review.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({prepared:decisions.length,applied:false,report:root+'component-review.json'}));
