// Complete the receipt only after the operator's independent Proxmox postcheck.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {current} from './policy.mjs';
process.umask(0o077);assert.deepEqual(process.argv.slice(2),['--confirm']);
const root='/var/lib/utilibre-maintenance/qga-native-followup-20261012',read=p=>JSON.parse(fs.readFileSync(root+'/'+p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report=read('release.json');assert.equal(report.status,'native-passed-control-plane-pending');
const p=root+'/control-plane-postcheck.json',s=fs.statSync(p);assert.equal(s.uid,0);assert.equal(s.mode&0o077,0);
const proof=read('control-plane-postcheck.json');assert.equal(proof.vmid,144);assert.equal(proof.operatorConfirmed,true);assert.equal(proof.pingSucceeded,true);assert.equal(proof.freezeStatus,'thawed');assert.equal(proof.agentPid,report.agentPidAfter);const age=Date.now()-Date.parse(proof.checkedAt);assert(age>=0&&age<300000);
assert.equal(cp.execFileSync('dpkg-query',['-W','-f=${Version}','qemu-guest-agent'],{encoding:'utf8'}),current);
assert.equal(cp.execFileSync('systemctl',['show','qemu-guest-agent.service','-p','MainPID','--value'],{encoding:'utf8'}).trim(),String(report.agentPidAfter));assert.equal(cp.execFileSync('systemctl',['is-active','qemu-guest-agent.service'],{encoding:'utf8'}).trim(),'active');
assert.equal(sha('/usr/sbin/qemu-ga'),report.candidatePayload['usr/sbin/qemu-ga'].sha256);assert.equal(sha('/proc/'+report.agentPidAfter+'/exe'),report.candidatePayload['usr/sbin/qemu-ga'].sha256);assert(!fs.existsSync('/var/run/qga.state.isfrozen'));
report.controlPlanePostcheckSha256=sha(p);report.controlPlaneVerifiedAt=proof.checkedAt;report.completedAt=new Date().toISOString();report.status='passed';fs.writeFileSync(root+'/release.json.tmp',JSON.stringify(report,null,2)+'\n');fs.renameSync(root+'/release.json.tmp',root+'/release.json');console.log(JSON.stringify({status:report.status,version:current,controlPlaneCheck:'Operator confirmed Proxmox ping and thawed status',noFurtherRestart:true}));
