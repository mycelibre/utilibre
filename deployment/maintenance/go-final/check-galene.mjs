import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
process.umask(0o077);
const oct28=process.argv.includes('--oct28'),root=oct28?'/var/lib/utilibre-maintenance/security-20261028/go':'/var/lib/utilibre-maintenance/go-final-20261011',lab=root+'/galene-stage';
const s=oct28?JSON.parse(fs.readFileSync(root+'/galene/build.json')):JSON.parse(fs.readFileSync(root+'/build.json')).rows.find(x=>x.key==='galene');
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:90000}).trim();
const name='maintenance-galene-go-native',network=name+'-net';let bridge;
for(const d of [lab,lab+'/data',lab+'/groups']){fs.mkdirSync(d,{recursive:true,mode:0o755});fs.chownSync(d,4003,4003);}
fs.writeFileSync(lab+'/data/ice-servers.json','[]\n',{mode:0o644});
fs.writeFileSync(lab+'/data/config.json','{}\n',{mode:0o644});
try{
 docker('network','create','--internal','--subnet','172.29.241.0/28',network);
 docker('run','-d','--name',name,'--network',network,'--read-only','--memory','512m','--cpus','2','--pids-limit','128','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=16m,mode=1777','-v',lab+'/data:/data','-v',lab+'/groups:/groups:ro',s.candidate,'-http','0.0.0.0:8080','-insecure','-data','/data','-groups','/groups','-recordings','/disabled-recordings','-turn','');
 const ip=docker('inspect',name,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}');
 bridge=cp.spawn('socat',['TCP4-LISTEN:3349,bind=127.0.0.1,reuseaddr,fork','TCP4:'+ip+':8080'],{detached:true,stdio:'ignore'});
 let ready=false;for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:3349/');await r.body?.cancel();if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
 const log=fs.openSync(root+'/galene-native.log','w');try{cp.execFileSync(process.execPath,['deployment/pack/check-galene-lifecycle.mjs'],{env:{...process.env,GALENE_LIFECYCLE_LAB:'1',GALENE_LIFECYCLE_LAB_ROOT:lab,GALENE_SOAK_SECONDS:'30'},stdio:['ignore',log,log],timeout:150000});}finally{fs.closeSync(log);}
 fs.writeFileSync(root+'/galene-native.json',JSON.stringify({date:new Date().toISOString(),status:'passed',imageId:s.imageId,isolatedTwoClientMedia:true,nativeScreenShareAndStop:true,guestRejoin:true,soakSeconds:30,network:'internal; no external ICE servers',productionChanged:false,limitations:'Linux Chromium fake media and same-host network only; existing public relay was not reconfigured.'},null,2)+'\n');console.log('Galene isolated two-client lifecycle passed.');
}finally{if(bridge?.pid)try{process.kill(-bridge.pid,'SIGTERM');}catch{}try{docker('rm','-f',name);}catch{}try{docker('network','rm',network);}catch{}}
