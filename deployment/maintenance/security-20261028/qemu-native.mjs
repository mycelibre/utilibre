// Official binary preparation and existing native fixture. Never installs host
// packages or connects to its guest-agent channel; no production activation mode.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert.equal(process.argv[2], 'prepare');
const spec=JSON.parse(fs.readFileSync(new URL('./qemu-inputs.json',import.meta.url)));
const dir='/var/lib/utilibre-maintenance/security-20261028/qemu-native';
fs.mkdirSync(dir,{recursive:true});
assert(!fs.existsSync(dir+'/native.json'),'Preserve completed evidence');
assert(fs.statfsSync(dir).bavail*fs.statfsSync(dir).bsize>=8*1024**3);
const sha=b=>createHash('sha256').update(b).digest('hex');
function run(command,args,options={}) {
  try{return cp.execFileSync(command,args,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...options}).trim();}
  catch(e){fs.writeFileSync(dir+'/error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Native preparation failed; private diagnostics retained');}
}
const docker=(...args)=>run('docker',args);
const before=Object.fromEntries(Object.keys(spec.packages).map(p=>[p,run('dpkg-query',['-W','-f=${Version}',p])]));
assert.deepEqual(before,Object.fromEntries(Object.entries(spec.packages).map(([p,s])=>[p,s.before])));
const services=()=>run('systemctl',['show','qemu-guest-agent.service','ssh.service','docker.service','-p','MainPID','-p','ActiveState']);
const hostState=services(), baseline=fs.readFileSync('/usr/sbin/qemu-ga');
fs.writeFileSync(dir+'/baseline-qemu-ga',baseline,{mode:0o700});
for(const [name,p] of Object.entries(spec.packages)) {
  const index=run('apt-cache',['show',name+'='+spec.version])+'\n';
  assert(index.includes('\nSHA256: '+p.sha256+'\n'));
  assert(index.includes('\nFilename: pool/main/q/qemu/'+p.file+'\n'));
  fs.writeFileSync(dir+'/'+name+'-index.txt',index+'\n');
  const file=dir+'/'+p.file;
  if(!fs.existsSync(file)){
    const r=await fetch('https://deb.debian.org/debian/pool/main/q/qemu/'+p.file,{signal:AbortSignal.timeout(30000)});
    assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert(bytes.length<4*1024**2);assert.equal(sha(bytes),p.sha256);fs.writeFileSync(file,bytes,{flag:'wx'});
  }
  assert.equal(sha(fs.readFileSync(file)),p.sha256);
}
const simulation=run('apt-get',['--simulate','--no-install-recommends','install',...Object.keys(spec.packages).map(p=>p+'='+spec.version)]);
const changed=[...simulation.matchAll(/^Inst ([^ ]+)/gm)].map(m=>m[1]).sort();
assert.deepEqual(changed,Object.keys(spec.packages).sort());assert(!/^Remv /m.test(simulation));
fs.writeFileSync(dir+'/host-simulation.txt',simulation+'\n');
const name='maintenance-qemu-native-20261028',recipe=new URL('../qga-native-followup/rpc-check.py',import.meta.url).pathname;
assert.equal(docker('ps','-aq','--filter','name=^/'+name+'$'),'');
docker('image','inspect',spec.base,'--format','{{.Id}}');
let created=false;
try {
  docker('run','-d','--name',name,'--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','128','--log-driver','none','--security-opt','no-new-privileges',
    '--mount','type=bind,src='+dir+',dst=/proof', '--mount','type=bind,src='+recipe+',dst=/rpc-check.py,readonly',
    '--entrypoint','sleep',spec.base,'infinity');created=true;
  const setup='set -eu; export DEBIAN_FRONTEND=noninteractive; printf "#!/bin/sh\\nexit 101\\n" > /usr/sbin/policy-rc.d; chmod 755 /usr/sbin/policy-rc.d; apt-get update -qq; apt-get install -y --no-install-recommends python3 passwd /proof/qemu-guest-agent_11.1.2+ds-3~bpo13+4_amd64.deb /proof/qemu-utils_11.1.2+ds-3~bpo13+4_amd64.deb; dpkg-query -W > /proof/runtime-packages.txt; test -z "$(dpkg --audit)"';
  fs.writeFileSync(dir+'/acquisition.log',docker('exec',name,'sh','-c',setup)+'\n');
  docker('network','disconnect','bridge',name);
  assert.equal(docker('inspect','--format','{{len .NetworkSettings.Networks}}',name),'0');
  fs.writeFileSync(dir+'/rpc.log',docker('exec',name,'python3','/rpc-check.py','/proof/baseline-qemu-ga','/usr/sbin/qemu-ga','/proof/rpc.json')+'\n');
  // Native block-tool path: fictional empty disk only, no host disks/devices.
  fs.writeFileSync(dir+'/block.log',docker('exec',name,'sh','-c','set -eu; qemu-img create -f raw /tmp/fictional.raw 1M; qemu-img convert -f raw -O qcow2 /tmp/fictional.raw /tmp/fictional.qcow2; qemu-img check /tmp/fictional.qcow2; qemu-img compare -f raw -F qcow2 /tmp/fictional.raw /tmp/fictional.qcow2; qemu-io -r -f qcow2 -c "read -P 0 0 512" /tmp/fictional.qcow2; qemu-nbd --version; qemu-storage-daemon --version')+'\n');
  const rpc=JSON.parse(fs.readFileSync(dir+'/rpc.json'));assert(rpc.passed&&rpc.nativeCapabilitiesPreserved&&rpc.defaultConfigurationPreserved);
  assert.equal(services(),hostState);assert.equal(sha(fs.readFileSync('/usr/sbin/qemu-ga')),sha(baseline));
  for(const [p,v] of Object.entries(before))assert.equal(run('dpkg-query',['-W','-f=${Version}',p]),v);
  fs.writeFileSync(dir+'/native.json',JSON.stringify({date:new Date().toISOString(),passed:true,version:spec.version,packages:spec.packages,baselineSha256:sha(baseline),hostSimulationChanges:changed,nativeCapabilitiesPreserved:true,commandCapabilityCount:rpc.commandCapabilityCount,syntheticKeyWorkflow:true,nativeBlockConversionAndZeroRead:true,network:'none after acquisition',productionUnchanged:true,activation:'Not performed: requires a new Proxmox backup/freeze/management pause and verified local console.',limitations:['No real VM freeze, backup, Proxmox transport or disk migration tested.','Native behavior is not an exploit regression or proof every QEMU source advisory affects these binary packages.']},null,2)+'\n');
  console.log('Official QEMU candidates pass isolated native RPC/block checks; host unchanged.');
} finally {if(created)docker('rm','-f','-v',name);}
