import assert from 'node:assert/strict';
export const previous='1:10.0.13+ds-0+deb13u1',current=previous+'+utilibre1';
export const reviewFile='qga-native-followup-20261012/review.json';
export function eligible(i){return i?.status==='needs-review'&&i.scope==='host-os'&&i.artifact==='host-dpkg'&&i.type==='debian'&&i.package==='qemu-guest-agent'&&i.installed===current&&i.id==='CVE-2026-12080'&&Array.isArray(i.containers)&&i.containers.length===0;}
export function simulationGate(text){assert(!/^Remv /m.test(text),'No removals');const changed=[...text.matchAll(/^Inst (\S+)/gm)].map(m=>m[1]);assert.deepEqual(changed,['qemu-guest-agent'],'Only the guest agent may change');assert(text.includes(current),'Exact repaired version');}
export function windowGate(value,pid,now=Date.now()){
 assert.equal(value.vmid,144);assert.equal(value.proxmoxBackupsIdle,true);assert.equal(value.otherAgentOperationsPaused,true);assert.equal(value.freezeStatus,'thawed');assert.equal(value.approvedGuestAgentRestart,true);assert.equal(value.agentPid,pid);assert.equal(value.operatorConfirmed,true);
 assert(typeof value.checkedAt==='string');const age=now-Date.parse(value.checkedAt);assert(Number.isFinite(age)&&age>=0&&age<300000,'Recheck Proxmox within five minutes');
}
