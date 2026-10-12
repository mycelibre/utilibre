// Prepare by default. Actual install can restart qemu-ga via its native package
// scripts; it requires an explicit, fresh operator Proxmox coordination receipt.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {previous,current,simulationGate,windowGate} from './policy.mjs';
process.umask(0o077);
const args=process.argv.slice(2);assert(args.length===0||(args.length===2&&args[0]==='--apply'));const apply=args[0]==='--apply';
const root='/var/lib/utilibre-maintenance/qga-native-followup-20261012',here=new URL('.',import.meta.url).pathname;
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:16*1024**2,...o}).trim(),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const old=root+'/inputs/qemu-guest-agent_10.0.13+ds-0+deb13u1_amd64.deb',candidate=root+'/build/qemu-guest-agent_10.0.13+ds-0+deb13u1+utilibre1_amd64.deb';
const service=()=>Object.fromEntries(run('systemctl',['show','qemu-guest-agent.service','-p','MainPID','-p','ActiveState','-p','SubState']).split('\n').map(l=>l.split('=')));
const others=()=>run('systemctl',['show','docker.service','ssh.service','-p','Id','-p','MainPID']);
const inventory=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']).split('\n').filter(l=>!l.startsWith('qemu-guest-agent=')).sort();
const exact=(manifest,base='')=>{for(const [file,record]of Object.entries(manifest)){const p=base+'/'+file,s=fs.lstatSync(p);assert.equal(s.mode&0o7777,record.mode,file);if(record.link!==undefined){assert(s.isSymbolicLink());assert.equal(fs.readlinkSync(p),record.link);}else{assert(s.isFile());assert.equal(sha(p),record.sha256,file);}}};
const config=()=>{const roots=['/etc/qemu','/etc/default/qemu-guest-agent','/etc/systemd/system/qemu-guest-agent.service.d'];const result={};for(const base of roots){if(!fs.existsSync(base))continue;const files=fs.statSync(base).isDirectory()?fs.readdirSync(base,{recursive:true}).map(f=>base+'/'+f):[base];for(const file of files){const s=fs.lstatSync(file);if(s.isFile())result[file]={sha256:sha(file),mode:s.mode&0o7777};else if(s.isSymbolicLink())result[file]={link:fs.readlinkSync(file),mode:s.mode&0o7777};}}return result;};
assert.equal(run('dpkg',['--audit']),'');assert.equal(run('dpkg-query',['-W','-f=${Version}','qemu-guest-agent']),previous);assert(!fs.existsSync(root+'/release.json'),'Existing release requires operator review, never overwrite it');
assert(Number(run('df',['-B1','--output=avail','/']).split('\n').at(-1))>=8589934592);
const start=service();assert.equal(start.ActiveState,'active');assert.equal(start.SubState,'running');assert(Number(start.MainPID)>1);
// The running service uses the unchanged native defaults. Reject overrides that
// would require a separate path/permission/restart review.
assert.deepEqual(fs.readFileSync('/proc/'+start.MainPID+'/cmdline').toString().split('\0').filter(Boolean),['/usr/sbin/qemu-ga']);
assert(!fs.existsSync('/var/run/qga.state.isfrozen'),'Native frozen-state marker present; do not restart');
if(apply){assert.equal(path.resolve(args[1]),root+'/coordination.json');const stat=fs.statSync(args[1]);assert.equal(stat.uid,0);assert.equal(stat.mode&0o077,0);windowGate(read(args[1]),Number(start.MainPID));}
run(process.execPath,[here+'verify-source.mjs']);
const proof=read(root+'/build/package-proof.json'),rpc=read(root+'/build/rpc.json');assert(proof.passed&&rpc.passed&&rpc.nativeCapabilitiesPreserved&&rpc.defaultConfigurationPreserved);assert.equal(proof.version,current);assert.equal(sha(candidate),proof.archiveSha256);assert.equal(sha(old),'7d7d6be6a52d6ea21eabdb78f686e4bb886f933171d33f5f3cf3cf2390343abd');exact(proof.nativePayload);
const units=fs.readFileSync(root+'/build/unit-tests.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));assert.equal(units.length,86);assert(units.every(t=>t.result==='OK'||(t.result==='SKIP'&&t.name==='qemu:unit / test-crypto-pbkdf')));assert(units.some(t=>t.name.endsWith('qga-ssh-test')&&t.result==='OK')&&units.some(t=>t.name.endsWith('test-qga')&&t.result==='OK'));
const simulation=run('apt-get',['--simulate','install',candidate]);simulationGate(simulation);
const beforePackages=inventory(),beforeOthers=others(),beforeConfig=config();
const common={version:current,previous,archiveSha256:sha(candidate),oldArchiveSha256:sha(old),nativePayload:proof.nativePayload,candidatePayload:proof.candidatePayload,proofSha256:sha(root+'/build/package-proof.json'),rpcSha256:sha(root+'/build/rpc.json'),unitsSha256:sha(root+'/build/unit-tests.jsonl'),unitSuites:units.length,recipeSha256:sha(here+'release-host.mjs'),config:beforeConfig,packagesSha256:createHash('sha256').update(JSON.stringify(beforePackages)).digest('hex'),otherServicePids:beforeOthers,agentPid:Number(start.MainPID),simulation};
const preserved=()=>{assert.deepEqual(inventory(),beforePackages);assert.equal(others(),beforeOthers);assert.deepEqual(config(),beforeConfig);assert.equal(run('dpkg',['--audit']),'');};
if(!apply){preserved();assert.deepEqual(service(),start);fs.writeFileSync(root+'/prepared.json',JSON.stringify({date:new Date().toISOString(),status:'prepared-not-deployed',...common,activationDependency:'Fresh Proxmox backup/freeze/other-agent-operation coordination and explicit restart approval are required.',productionChanged:false},null,2)+'\n');console.log(JSON.stringify({status:'prepared-not-deployed',version:current,unitSuites:units.length,rpcCommands:rpc.commandCapabilityCount,changedPayloadFiles:proof.changedPayloadFiles,productionChanged:false}));}
else{
 const prepared=read(root+'/prepared.json');assert.equal(prepared.status,'prepared-not-deployed');assert(Date.now()-Date.parse(prepared.date)<1800000);for(const [k,v]of Object.entries(common))assert.deepEqual(prepared[k],v,'Stale preparation: '+k);
 const source=read(root+'/source-offer.json');assert(source.published);assert.equal(sha('/opt/utilibre/toolbox-public/'+source.filename),source.sha256);
 const report={startedAt:new Date().toISOString(),status:'approved',...common,coordinationSha256:sha(args[1]),sourceOffer:source};const save=()=>fs.writeFileSync(root+'/release.json',JSON.stringify(report,null,2)+'\n');save();
 try{
  // Recheck immediately before the maintainer script's restart. This cannot
  // replace the operator's promise to keep control-plane tasks paused.
  windowGate(read(args[1]),Number(service().MainPID));assert(!fs.existsSync('/var/run/qga.state.isfrozen'));
  run('dpkg',['--install',candidate]);assert.equal(run('dpkg-query',['-W','-f=${Version}','qemu-guest-agent']),current);exact(proof.candidatePayload);
  const live=service();assert.equal(live.ActiveState,'active');assert.equal(live.SubState,'running');assert(Number(live.MainPID)>1&&live.MainPID!==start.MainPID,'Native package restart was not completed');assert.equal(sha('/proc/'+live.MainPID+'/exe'),proof.candidatePayload['usr/sbin/qemu-ga'].sha256);
  assert(!fs.existsSync('/var/run/qga.state.isfrozen'));preserved();
  run('/usr/bin/python3',[new URL('../../../scripts/maintenance-update-policy.py',import.meta.url).pathname,'--write-unattended-blacklist']);assert(fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages','utf8').includes('qemu[-]guest[-]agent'));
  report.status='native-passed-control-plane-pending';report.agentPidAfter=Number(live.MainPID);report.nativeCompletedAt=new Date().toISOString();report.controlPlanePostcheck='Owner must run qm agent 144 ping and qm agent 144 fsfreeze-status on Proxmox; host script never writes the live virtio channel.';save();
 }catch(error){report.status='failed';report.error=String(error.message).slice(0,1500);try{assert(!fs.existsSync('/var/run/qga.state.isfrozen'),'Cannot rollback/restart while frozen');run('dpkg',['--install',old]);exact(proof.nativePayload);assert.equal(run('dpkg-query',['-W','-f=${Version}','qemu-guest-agent']),previous);const live=service();assert.equal(live.ActiveState,'active');assert.equal(sha('/proc/'+live.MainPID+'/exe'),proof.nativePayload['usr/sbin/qemu-ga'].sha256);preserved();report.rollback='Exact old native archive and running binary restored';}catch{report.rollback='NOT VERIFIED; stop for control-plane inspection';}save();throw Error('Guest-agent release failed; inspect private receipt and control plane');}
 console.log(JSON.stringify({status:report.status,version:current,agentPidAfter:report.agentPidAfter,otherServicesUnchanged:true,proxmoxPostcheckRequired:true}));
}
