// Bounded 2026-10-11 nginx security rollout. Not a moving-tag auto-updater.
// Stage native configurations against an exact upstream image; never touch app data.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,copyFile,chmod} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const exec=promisify(execFile);
const old='sha256:7377697a821c131a924a7105fafbe7414db4e9fcc77a6f08f776f33f141ec3f8';
const image='nginxinc/nginx-unprivileged:1.30.5-alpine@sha256:15c994d10d6d78658721c3bcafff14cb281fba2a4bdf9d5ba92c416a472516e3';
const directory='/var/lib/utilibre-maintenance/nginx-20261011';
const oldRef=/nginxinc\/nginx-unprivileged(?::1\.28-alpine)?@sha256:7377697a821c131a924a7105fafbe7414db4e9fcc77a6f08f776f33f141ec3f8/g;
const hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(directory,{recursive:true,mode:0o700});
async function command(args,timeout=120000){
 try{return (await exec('docker',args,{timeout,maxBuffer:16*1024**2})).stdout;}
 catch(error){await writeFile(directory+'/last-error.log',String(error.stderr||error.message),{mode:0o600});throw Error('Docker check failed; private diagnostic: '+directory+'/last-error.log');}
}
const compose=row=>['compose','--profile','*','--project-directory',row.cwd,...(row.project==='utilibre-trip'?['--env-file','/opt/utilibre/trip/private/runtime.env']:[]),'-p',row.project,...row.files.flatMap(x=>['-f',x])];
async function endpoints(ports){
 const results=[];
 for(const port of ports){
  const response=await fetch(`http://${port.host}:${port.port}/`,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  await response.body?.cancel();results.push(response.status);
 }
 return results;
}
if(process.argv[2]==='stage'){
 const ids=(await command(['ps','-q'])).trim().split(/\s+/).filter(Boolean);
 const inventory=JSON.parse(await command(['inspect',...ids])).filter(x=>x.Image===old&&x.Name.startsWith('/utilibre-'));
 if(!inventory.length)throw Error('No exact old image targets; refusing empty stage');
 const rows=[],files={};
 for(const x of inventory){
  const labels=x.Config.Labels;
  const row={name:x.Name.slice(1),oldImage:old,newImage:image,user:x.Config.User,project:labels['com.docker.compose.project'],service:labels['com.docker.compose.service'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),ports:[]};
  if(!row.files.every(x=>x.startsWith('/home/ubuntu/freetools/deployment/'))||!row.cwd.startsWith('/home/ubuntu/freetools/deployment/'))throw Error('Unexpected project path');
  for(const [key,values]of Object.entries(x.NetworkSettings.Ports||{}))if(key.endsWith('/tcp'))for(const p of values||[]){
   if(p.HostIp.includes(':'))continue;
   row.ports.push({host:p.HostIp==='0.0.0.0'?'127.0.0.1':p.HostIp,port:Number(p.HostPort)});
  }
  // LAN listeners can intentionally refuse the host itself. Prefer the existing
  // loopback binding for a published port, without changing the firewall.
  row.ports=row.ports.filter(p=>p.host==='127.0.0.1'||!row.ports.some(q=>q.port===p.port&&q.host==='127.0.0.1'));
  for(const file of row.files)if(!files[file]){
   const bytes=await readFile(file);const backup=directory+'/compose-'+Object.keys(files).length+'.yaml';
   await copyFile(file,backup);await chmod(backup,0o600);
   files[file]={backup,sha256:hash(bytes),expectedNewSha256:hash(bytes.toString().replace(oldRef,image))};
  }
  // Resolve Compose without outputting secrets; all services remain untouched.
  const config=JSON.parse(await command([...compose(row),'config','--format','json']));
  if(!config.services[row.service]?.image.includes(old))throw Error('Runtime/config image drift');
  row.before=await endpoints(row.ports);
  await command(['run','--rm','--network','container:'+row.name,'--volumes-from',row.name+':ro','--read-only','--tmpfs','/tmp','--tmpfs','/var/cache/nginx','--tmpfs','/var/run','--user',row.user||'101','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.5','--entrypoint','nginx',image,'-t']);
  row.nativeConfiguration='passed';rows.push(row);console.log(`${rows.length}/${inventory.length} staged: ${row.name}`);
 }
 await writeFile(directory+'/stage.json',JSON.stringify({date:new Date().toISOString(),image,old,files,rows},null,2)+'\n',{mode:0o600});
}else if(process.argv[2]==='apply'){
 const stage=JSON.parse(await readFile(directory+'/stage.json','utf8'));
 if(stage.image!==image||Date.now()-Date.parse(stage.date)>86400000)throw Error('Restage before deployment');
 for(const [file,record]of Object.entries(stage.files))if(hash(await readFile(file))!==record.expectedNewSha256)throw Error('Unexpected configuration edit: '+file);
 try{await copyFile(directory+'/release.json',directory+'/release-before-'+Date.now()+'.json');}catch(error){if(error.code!=='ENOENT')throw error;}
 const report={date:new Date().toISOString(),rows:[]};
 for(const row of stage.rows){
  const current=JSON.parse(await command(['inspect',row.name]))[0];
  if(![old,image.split('@')[1]].includes(current.Image))throw Error('Unexpected image drift: '+row.name);
  if(current.Image===old){
   // These existing supervisors couple the gateway to namespace firewall setup.
   // Use their native boundary-preserving release path, never an isolated restart.
   if(['utilibre-trip','utilibre-unfurl','utilibre-13ft'].includes(row.project))await exec('systemctl',['restart',row.project+'.service'],{timeout:180000,maxBuffer:1024**2});
   else await command([...compose(row),'up','-d','--no-deps','--no-build','--pull','never',row.service]);
  }
  let after,error;
  for(let i=0;i<5;i++){
   try{after=await endpoints(row.ports);if(JSON.stringify(after)===JSON.stringify(row.before)){error=null;break;}error='Endpoint status changed';}catch{error='Endpoint unavailable';}
   await new Promise(r=>setTimeout(r,1500));
  }
  const live=JSON.parse(await command(['inspect',row.name]))[0];
  if(live.Image!==image.split('@')[1]||!live.State.Running)error='Runtime image/state mismatch';
  report.rows.push({name:row.name,before:row.before,after,status:error?'failed':'passed'});
  await writeFile(directory+'/release.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
  if(error){
   if(['utilibre-trip','utilibre-unfurl','utilibre-13ft'].includes(row.project))throw Error(`${row.name}: ${error}; use the native systemd boundary runbook for rollback, not a standalone container restart.`);
   const rollback=directory+'/rollback-'+row.service+'.yaml';
   await writeFile(rollback,JSON.stringify({services:{[row.service]:{image:'nginxinc/nginx-unprivileged@'+old}}}),{mode:0o600});
   await command([...compose(row),'-f',rollback,'up','-d','--no-deps','--no-build','--pull','never',row.service]);
   throw Error(`${row.name}: ${error}; previous image restored; reconcile its source pin before continuing.`);
  }
  console.log(`${report.rows.length}/${stage.rows.length} deployed: ${row.name}`);
 }
}else throw Error('Use stage, review the candidate and update exact Compose pins, then apply.');
