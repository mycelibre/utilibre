// Bounded post-release checks: listener state only, never traffic/user content.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const dir='/var/lib/utilibre-maintenance/language-final-20261011';
const report=JSON.parse(fs.readFileSync(dir+'/release.json'));assert.equal(report.status,'passed');
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000,maxBuffer:1024**2});
const listeners=[];
for(const group of report.groups)for(const row of group.rows){
 const x=JSON.parse(docker('inspect',row.name))[0];assert.equal(x.Image,row.newImage);assert(x.State.Running);
 if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');
 if(row.key==='public-egress'){
  docker('exec',row.name,'python','-B','-c',"from pathlib import Path; rows=[line.split() for name in ['tcp','tcp6'] for line in Path('/proc/net/'+name).read_text().splitlines()[1:]]; assert any(r[3]=='0A' and r[1].split(':')[-1]=='0C38' for r in rows)");
  listeners.push({container:row.name,port:3128,nativeListener:true});
 }
 if(row.name==='utilibre-newsletters-smtp-1'){
  docker('exec',row.name,'node','-e',"const fs=require('fs'),rows=['tcp','tcp6'].flatMap(n=>fs.readFileSync('/proc/net/'+n,'utf8').trim().split('\\n').slice(1).map(r=>r.trim().split(/\\s+/)));require('assert')(rows.some(r=>r[3]==='0A'&&r[1].split(':').at(-1)==='0019'))");
  const rules=cp.execFileSync('nsenter',['-t',String(x.State.Pid),'-n','iptables','-S','UTILIBRE-SMTP-IN'],{encoding:'utf8'});
  assert(rules.includes('10.10.1.20/32 -j ACCEPT')&&rules.includes('-j REJECT'));
  const ipv6=cp.execFileSync('nsenter',['-t',String(x.State.Pid),'-n','ip6tables','-S','INPUT'],{encoding:'utf8'});assert(ipv6.includes('! -s ::1/128')&&ipv6.includes('--dport 25 -j REJECT'));
  docker('exec',row.name,'node','-e',"const socket=require('net').connect(25,'127.0.0.1');socket.setTimeout(3000,()=>process.exit(1));socket.once('error',()=>process.exit(1));socket.once('data',d=>{if(!d.toString().startsWith('220'))process.exit(1);socket.end('QUIT\\r\\n')});socket.on('data',()=>{});");
  listeners.push({container:row.name,port:25,nativeListener:true,nativeGreeting:true,ipv4andIpv6Boundary:true});
 }
 if(row.namespaceParent){const parent=JSON.parse(docker('inspect',row.namespaceParent))[0];assert.equal(x.HostConfig.NetworkMode,'container:'+parent.Id);}
}
const result={status:'passed',date:new Date().toISOString(),containers:report.groups.reduce((n,g)=>n+g.rows.length,0),listeners,namespaceCompanionsVerified:true,userDataInspected:false};
fs.writeFileSync(dir+'/live-check.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
