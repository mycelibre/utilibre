// Native checks for signed same-branch vendor layers; no production data.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:90000,stdio:['ignore','pipe','pipe']});
const rows=[
 ['privatebin','utilibre-privatebin:2.0.6-security-20261011-p2','utilibre-privatebin:2.0.6-php-security-20261011-p3','/srv'],
 ['ntfy','binwiederhier/ntfy:v2.28.0@sha256:6ef4b819f722fccdc036af611c4774cfdc2de821ab74fdd48bbf4c9d6f8973da','utilibre-ntfy:2.28.0-vendor-security-20261011','/usr/bin/ntfy'],
 ['valkey','valkey/valkey:9.1.1-alpine@sha256:de31910896150d5e754a07d57d227cfdde4e258ddd0d1aa4607f2d2f95843715','utilibre-valkey:9.1.1-vendor-security-20261011','/usr/local/bin'],
 ['kittygram','utilibre-kittygram:5931c21-p1','utilibre-kittygram:5931c21-vendor-security-20261011-p2','/app'],
 ['degoog','ghcr.io/degoog-org/degoog:1.0.0@sha256:e1ce8ee724a4514d269b74088424e579322bdfcf718256c1c5dd2cbb5aaf510c','utilibre-degoog:1.0.0-vendor-security-20261011','/app'],
];
const run=(image,cmd)=>docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--cpus','.5','--log-driver','none','--entrypoint','sh',image,'-c',cmd);
const receipt={date:new Date().toISOString(),rows:[]};
for(const [name,before,after,path] of rows){
 const command=`find ${path} -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`;
 const hash=run(before,command).trim();assert.equal(run(after,command).trim(),hash,name+' application content differs');
 const old=JSON.parse(docker('image','inspect',before))[0],next=JSON.parse(docker('image','inspect',after))[0];
 for(const key of ['Entrypoint','Cmd','WorkingDir','Env','ExposedPorts','Volumes','Healthcheck'])assert.deepEqual(next.Config[key],old.Config[key],name+' '+key);
 receipt.rows.push({name,before:old.Id,after:next.Id,hash,applicationUnchanged:true});
}
const baseArgs=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','192m','--cpus','.5','--pids-limit','96','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777'];
const names=[];
try{
 const n='utilibre-ntfy-vendor-check';names.push(n);
 docker('run','-d','--name',n,...baseArgs,'--user','1000:1000','-p','127.0.0.1:33125:8080','-v','/home/ubuntu/freetools/deployment/community/ntfy.yml:/etc/ntfy/server.yml:ro',rows[1][2],'serve');
 let ready=false;for(let t=0;t<30;t++){try{ready=(await fetch('http://127.0.0.1:33125/v1/health')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,300));}assert(ready);
 const base='http://127.0.0.1:33125/fictional-security-test';
 const pub=await fetch(base,{method:'POST',body:'Fictional vendor-library test; no personal information.'});assert.equal(pub.status,200);
 const message=await pub.json();assert.equal(message.message,'Fictional vendor-library test; no personal information.');
 const poll=await fetch(base+'/json?poll=1&since=all');assert.equal(poll.status,200);assert((await poll.text()).includes(message.id));
 assert.equal((await fetch('http://127.0.0.1:33125/v1/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'fictional',password:'fixture-only-never-used'})})).status,404);
 receipt.ntfy='Native anonymous publish + cached receive, registration disabled, RAM-only synthetic instance';
 const v='utilibre-valkey-vendor-check';names.push(v);
 docker('run','-d','--name',v,...baseArgs,'--network','none','--user','999:1000',rows[2][2],'valkey-server','--save','','--appendonly','no','--maxmemory','16mb','--maxmemory-policy','noeviction','--loglevel','warning');
 let pong=false;for(let t=0;t<30;t++){try{pong=docker('exec',v,'valkey-cli','ping').trim()==='PONG';}catch{}if(pong)break;await new Promise(r=>setTimeout(r,100));}assert(pong);
 assert.equal(docker('exec',v,'valkey-cli','SET','fictional','abc','EX','30').trim(),'OK');
 assert.equal(docker('exec',v,'valkey-cli','GET','fictional').trim(),'abc');
 assert(+docker('exec',v,'valkey-cli','TTL','fictional')>0);
 assert.equal(docker('exec',v,'valkey-cli','EVAL',"return redis.call('GET',KEYS[1])",'1','fictional').trim(),'abc');
 assert.equal(docker('exec',v,'valkey-cli','DEL','fictional').trim(),'1');
 receipt.valkey='Native SET/GET/TTL/Lua/DEL passed, original engine bytes unchanged';
 receipt.status='passed';
}finally{for(const name of names)try{docker('rm','-f',name);}catch{}}
await mkdir('/var/lib/utilibre-maintenance/alpine-final-20261011',{recursive:true,mode:0o700});
await writeFile('/var/lib/utilibre-maintenance/alpine-final-20261011/stage.json',JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(receipt));
