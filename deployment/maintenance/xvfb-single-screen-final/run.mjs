// One bounded private builder; a floor breach stops only this owned container.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
const mode=process.argv[2];assert(['deps','host','dhi'].includes(mode));const root='/var/lib/utilibre-maintenance/xvfb-single-screen-final-20261012',name='maintenance-xvfb-single-screen-20261012';
const size=()=>Number(cp.execFileSync('du',['-sb',root],{encoding:'utf8'}).split(/\s/)[0])+Number(cp.execFileSync('docker',['inspect','--size','--format','{{.SizeRw}}',name],{encoding:'utf8'}));
const check=()=>{const s=fs.statfsSync('/');assert(s.bavail*s.bsize>8*1024**3,'8 GiB floor');assert(size()<2*1024**3,'2 GiB scratch budget')};check();
const log=fs.openSync(root+'/'+mode+'-build.log','w'),p=cp.spawn('docker',['exec',name,'sh',mode==='deps'?'/recipes/deps.sh':'/recipes/inner.sh',...(mode==='deps'?[]:[mode])],{stdio:['ignore',log,log]});let violation;
const timer=setInterval(()=>{try{check()}catch(e){violation=e.message;cp.spawnSync('docker',['stop','--time','5',name],{stdio:'ignore'});p.kill('SIGTERM')}},5000);const status=await new Promise(r=>p.once('exit',r));clearInterval(timer);fs.closeSync(log);assert(!violation,violation);assert.equal(status,0,'See private '+mode+'-build.log');console.log(JSON.stringify({mode,passed:true,scratchBytes:size()}));
