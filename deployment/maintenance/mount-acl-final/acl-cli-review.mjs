// Evidence-gated proposal only: no runtime mutation, no ledger writes.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,read,sha,run,inspect,limits} from './common.mjs';
import {eligible} from './acl-cli-review-policy.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const main='/var/lib/utilibre-maintenance',scan=read(main+'/security.json'),queue=read(main+'/security-queue.json');
freshScan(queue,scan);assert.equal(scan.status,'checked');
const script=fs.readFileSync(new URL('./acl-cli-absence.sh',import.meta.url),'utf8');
const decisions=[],proofs=[];
for(const item of queue.items.filter(eligible)){
 const outputs=[];
 if(item.scope==='host-os')outputs.push({role:'host',output:run('sh',['-s','--','host'],{input:script,stdio:['pipe','pipe','pipe']})});
 else {for(const name of item.containers){
  const before=inspect(name);assert(before.State.Running);assert.equal(before.Image,item.artifact,'Fresh scan required after image release');
  const checked=run('docker',['exec','--user','0','-i',name,'sh','-s','--','live'],{input:script,stdio:['pipe','pipe','pipe']});
  assert.equal(inspect(name).Image,before.Image);outputs.push({role:name,output:checked});
 }
 const imageOutput=run('docker',['run',...limits,'--cap-add','DAC_OVERRIDE','--read-only','--user','0','-i','--entrypoint','sh',item.artifact,'-s'],{input:script,stdio:['pipe','pipe','pipe']});
 outputs.push({role:'isolated-image-without-user-mounts',output:imageOutput});
 }
 for(const entry of outputs){assert(entry.output.includes('version='+item.installed+'\n'));assert(entry.output.endsWith('acl-package-and-commands-absent'));assert(/^[a-f0-9]{64}\s+.*libacl\.so\./m.test(entry.output));}
 proofs.push({key:item.key,artifact:item.artifact,containers:item.containers,installed:item.installed,outputs});
 decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'CVE-2026-54370 concerns the native getfacl/setfacl/chacl command-line utilities, not every binary built from the acl source package. Exact live package inventory and command lookup plus read-only image filesystem checks confirm the acl CLI package and these commands are absent; installed libacl1 payload hashes and the fresh scan artifact are bound in the private proof. Host scope checks native executable roots. Image inspection has no user-data mounts and changes no production capabilities; apt partial download caches are excluded. This does not fix or waive CVE-2026-54369: legacy libacl pathname APIs remain, and actual GNU tar/rsync consumers still reach them. No files were removed and no runtime changed for this attribution. https://security-tracker.debian.org/tracker/CVE-2026-54370 https://www.openwall.com/lists/oss-security/2026/06/29/1'}));
}
assert(decisions.length>0);
fs.writeFileSync(root+'/acl-cli-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,scriptSha256:sha(script),proofs,decisions},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,applied:false,remainingLegacyApiCve:'CVE-2026-54369'}));
