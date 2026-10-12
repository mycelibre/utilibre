// Run candidate or actual host CLI against a bounded, disconnected synthetic peer.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
export async function checkWget(binary,{oldControl=false}={}){
 const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:20000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
 const name='maintenance-wget-native',temp=fs.mkdtempSync('/dev/shm/utilibre-wget-check-'),checks=[];let active=false;
 try{
  run('docker',['run','-d','--name',name,'--network','none','--user','0','--read-only','--cpus','0.5','--memory','128m','--pids-limit','32','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--mount','type=bind,src='+dir+'/curl-fixture,dst=/fixture,readonly','--mount','type=bind,src='+here+'wget-fixture-server.py,dst=/server.py,readonly','--entrypoint','python3','sha256:b1156f8e150bd1c89b9f1c02de9461c317a4003f582cb5e5e5dcc236ab703469','/server.py']);active=true;
  run('docker',['exec',name,'python3','-c','import socket,time\nfor i in range(40):\n try:\n  socket.create_connection(("127.0.0.1",18443),.1).close();break\n except OSError:time.sleep(.1)\nelse:raise RuntimeError("fixture not ready")']);
  const pid=run('docker',['inspect',name,'--format','{{.State.Pid}}']);assert(/^[1-9]\d+$/.test(pid));
  const call=args=>cp.spawnSync('prlimit',['--as=268435456','--cpu=10','--core=0','--','nsenter','--net=/proc/'+pid+'/ns/net',binary,'--no-config','--no-proxy','--no-hsts','--timeout=4','--tries=1','--quiet',...args],{encoding:'utf8',cwd:temp,timeout:12000,maxBuffer:1024**2});
  for(const [label,url,args,expected,exit] of [
   ['HTTP','http://127.0.0.1:18080/',[],'fictional transfer\n',0],
   ['redirect','http://127.0.0.1:18080/redirect',[],'fictional transfer\n',0],
   ['gzip','http://127.0.0.1:18080/gzip',['--compression=auto'],'fictional transfer\n',0],
   ['POST','http://127.0.0.1:18080/',['--post-data=fictional=1'],'fictional=1',0],
   ['trusted TLS','https://localhost:18443/',['--ca-certificate='+dir+'/curl-fixture/cert.pem'],'fictional transfer\n',0],
   ['wrong-host rejection','https://127.0.0.1:18443/',['--ca-certificate='+dir+'/curl-fixture/cert.pem'],null,5],
   ['404 rejection','http://127.0.0.1:18080/missing',[],null,8],
  ]){const r=call([...args,'-O','-',url]);assert.equal(r.status,exit,label);if(expected!==null)assert.equal(r.stdout,expected,label);checks.push({label,passed:true});}
  const named=call(['--content-disposition','--remote-encoding=windows-1252','--local-encoding=UTF-8','--restrict-file-names=unix','http://127.0.0.1:18080/filename']);assert.equal(named.status,0,'filename conversion');
  const files=fs.readdirSync(temp);assert.equal(files.length,1);if(oldControl)assert.notDeepEqual(files,['€'.repeat(16)+'.txt']);else assert.deepEqual(files,['€'.repeat(16)+'.txt']);assert.equal(fs.readFileSync(temp+'/'+files[0],'utf8'),'fictional transfer\n');checks.push({label:oldControl?'Old filename truncation reproduced':'Windows-1252 filename expands to UTF-8',passed:true});
  return {date:new Date().toISOString(),passed:true,oldRegressionObserved:oldControl,binary,binarySha256:createHash('sha256').update(fs.readFileSync(binary)).digest('hex'),checks,network:'Only the test process enters the disconnected fixture namespace; host network unchanged',limits:'256 MiB address space, 10-second CPU limit, no core dump',limitations:'Synthetic transfers and filename conversion, not a multi-gigabyte adversarial HTML test, FTP test or throughput benchmark.'};
 }finally{if(active)run('docker',['rm','-f','-v',name]);fs.rmSync(temp,{recursive:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 process.umask(0o077);assert(process.argv.length===4||(process.argv.length===5&&process.argv[4]==='--old-control'));const proof=await checkWget(process.argv[2],{oldControl:process.argv[4]==='--old-control'});fs.writeFileSync(process.argv[3],JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({passed:proof.passed,oldRegressionObserved:proof.oldRegressionObserved,checks:proof.checks.length}));
}
