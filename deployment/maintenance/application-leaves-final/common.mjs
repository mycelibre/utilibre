import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
export const root='/var/lib/utilibre-maintenance/application-leaves-final-20261012';
export const here=new URL('.',import.meta.url).pathname;
process.umask(0o077);fs.mkdirSync(root,{recursive:true});
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const json=p=>JSON.parse(fs.readFileSync(p));
export const save=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
export function run(cmd,args,opt={}){return cp.execFileSync(cmd,args,{encoding:'utf8',timeout:180000,maxBuffer:64*1024**2,stdio:['pipe','pipe','pipe'],...opt});}
export const docker=(a,o)=>run('docker',a,o);
export function floor(){const s=fs.statfsSync('/');assert(s.bavail*s.bsize>8*1024**3,'8 GiB recovery floor');}
export const node=(id,code,args=[])=>docker(['run','--rm','-i','--network','none','--read-only','--user','0','--cpus','2','--memory','2g','--memory-swap','2g','--pids-limit','128','--log-driver','none','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--entrypoint','node',id,'-',...args],{input:code});
export const manifest=`const fs=require('fs'),path=require('path'),crypto=require('crypto'),out={};function walk(d){for(const n of fs.readdirSync(d).sort()){const p=path.join(d,n),s=fs.lstatSync(p);if(s.isDirectory())walk(p);else if(s.isFile())out[p]={sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),mode:s.mode&511,uid:s.uid,gid:s.gid};else if(s.isSymbolicLink())out[p]={link:fs.readlinkSync(p)};}}JSON.parse(process.argv[2]).forEach(walk);console.log(JSON.stringify(out));`;
export async function overlay(s,context,recipe,allowed){
 floor();assert.equal(docker(['inspect','--format','{{.Image}}',s.container]).trim(),s.base,'Live image changed');
 const old=JSON.parse(docker(['image','inspect',s.base]))[0],before=JSON.parse(node(s.base,manifest,[JSON.stringify(s.roots)]));
 fs.writeFileSync(context+'/Dockerfile','FROM '+s.base+'\nUSER 0\n'+recipe+'\nUSER '+JSON.stringify(old.Config.User||'0')+'\n');
 const log=fs.openSync(context+'/build.log','w'),p=cp.spawn('docker',['build','--network','none','--pull=false','--memory','512m','--cpu-period','100000','--cpu-quota','200000','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'},stdio:['ignore',log,log]});
 const watch=setInterval(()=>{try{floor()}catch{p.kill('SIGTERM')}},1000);const code=await new Promise(r=>p.once('exit',r));clearInterval(watch);fs.closeSync(log);assert.equal(code,0,'See isolated build log');
 const next=JSON.parse(docker(['image','inspect',s.candidate]))[0];for(const k of ['Env','Entrypoint','Cmd','WorkingDir','Healthcheck','Volumes','ExposedPorts','Labels'])assert.deepEqual(next.Config[k],old.Config[k],k);assert.equal(next.Config.User,old.Config.User||'0');
 const after=JSON.parse(node(next.Id,manifest,[JSON.stringify(s.roots)])),changed=[];
 for(const p of new Set([...Object.keys(before),...Object.keys(after)]))if(JSON.stringify(before[p])!==JSON.stringify(after[p])){assert(allowed(p),'Unrelated byte/ownership change '+p);changed.push(p)}assert(changed.length);
 const proof={...s,date:new Date().toISOString(),imageId:next.Id,configurationUnchanged:true,unchangedOtherFiles:Object.keys(before).filter(p=>!allowed(p)).length,changed,manifestBefore:hash(JSON.stringify(before)),manifestAfter:hash(JSON.stringify(after)),passed:true,deployed:false};
 save(context+'/build.json',proof);save(context+'/before.json',before);save(context+'/after.json',after);return proof;
}
