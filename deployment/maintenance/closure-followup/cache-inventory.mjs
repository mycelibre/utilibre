// Inspect immutable images, not live volumes or application secrets.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012';
const queue=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/security-queue.json'));
const rows=queue.items.filter(x=>x.package==='http-cache-semantics'&&x.status==='needs-review');
const code=`const fs=require('fs'),path=require('path');let out=[];function walk(d){for(const ent of fs.readdirSync(d,{withFileTypes:true})){if(!ent.isDirectory())continue;const p=path.join(d,ent.name);if(ent.name==='http-cache-semantics'&&fs.existsSync(p+'/package.json')){const m=JSON.parse(fs.readFileSync(p+'/package.json'));out.push({path:p,version:m.version,name:m.name});}walk(p);}}for(const d of JSON.parse(process.argv[2]))walk(d);console.log(JSON.stringify(out));`;
const docker=(args,input)=>cp.execFileSync('docker',args,{encoding:'utf8',input,timeout:120000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']});
const known=['/usr/local/lib/node_modules','/usr/share/nodejs','/app','/usr/app','/usr/src/app','/opt','/grist','/actual','/srv'];
const specs=[];
for(const row of rows){
 assert(row.scope==='runtime-image');
 const opts=['run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--user','0','--entrypoint','node',row.artifact,'-'];
 const roots=JSON.parse(docker([...opts,JSON.stringify(known)],`const fs=require('fs');console.log(JSON.stringify(JSON.parse(process.argv[2]).filter(p=>fs.existsSync(p))));`));
 const installed=JSON.parse(docker([...opts,JSON.stringify(roots)],code)).filter(p=>p.name==='http-cache-semantics');assert(installed.length,'No package found');assert(installed.every(p=>/^4\.[0123]\.\d+$/.test(p.version)),JSON.stringify(installed));
 const paths=installed.filter(p=>p.version!=='4.3.0');assert(paths.length);
 const key='cache-'+row.containers[0].replace(/^utilibre-/,'').replace(/-1$/,'');
 const spec={key,container:row.containers[0],containers:row.containers,base:row.artifact,candidate:'utilibre-'+key+':4.3.0-20261012',roots,paths:{'http-cache-semantics':paths.map(p=>p.path)},installed};
 specs.push(spec);console.log(JSON.stringify({key,paths:paths.map(p=>p.path)}));
}
fs.writeFileSync(dir+'/cache-inventory.json',JSON.stringify({date:new Date().toISOString(),specs},null,2)+'\n');
