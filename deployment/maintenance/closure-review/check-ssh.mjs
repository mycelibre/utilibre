// Real loopback SSH rekeys using fresh fixture keys, a fixed cat-only command,
// and no authentication against the actual SSH daemon or existing identities.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/ssh-closure-20261012';
const dir=fs.mkdtempSync(root+'/fixture-'),extract=dir+'/packages';fs.mkdirSync(extract);
const version='10.0p1-7+deb13u4+utilibre1';
const run=(c,a)=>{try{return cp.execFileSync(c,a,{encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/failure.log',String(e.stderr||e.message));throw Error('SSH fixture failed; private receipt '+dir);}};
for(const pkg of ['openssh-client','openssh-server','openssh-sftp-server'])run('dpkg-deb',['-x',`${root}/${pkg}_${version}_amd64.deb`,extract]);
const client=extract+'/usr/bin/ssh';
assert.match(run(client,['-V']),/^$/); // Version goes to stderr; subprocess exit validates linkage.
for(const key of ['host','client'])run('/usr/bin/ssh-keygen',['-q','-t','ed25519','-N','','-f',dir+'/'+key]);
const config=`ListenAddress 127.0.0.1\nPort 3439\nHostKey ${dir}/host\nPidFile ${dir}/pid\nAuthorizedKeysFile ${dir}/client.pub\nAuthenticationMethods publickey\nPubkeyAuthentication yes\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nUsePAM no\nPermitRootLogin prohibit-password\nAllowUsers root\nStrictModes yes\nAllowAgentForwarding no\nAllowTcpForwarding no\nPermitTunnel no\nX11Forwarding no\nPermitTTY no\nForceCommand /bin/cat\nRekeyLimit 16K\nLogLevel ERROR\n`;
fs.writeFileSync(dir+'/sshd_config',config);
fs.writeFileSync(dir+'/known_hosts','[127.0.0.1]:3439 '+fs.readFileSync(dir+'/host.pub','utf8'));
run('/usr/sbin/sshd',['-t','-f',dir+'/sshd_config']);
const results=[];
for(const server of ['/usr/sbin/sshd',extract+'/usr/sbin/sshd']){
 const log=fs.openSync(dir+'/server.log','a'),proc=cp.spawn(server,['-D','-e','-f',dir+'/sshd_config'],{stdio:['ignore',log,log]});
 try{
  await new Promise(r=>setTimeout(r,500));assert.equal(proc.exitCode,null,'Fixture listener failed');
  const data=randomBytes(512*1024),args=['-F','/dev/null','-p','3439','-i',dir+'/client','-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+dir+'/known_hosts','-o','GlobalKnownHostsFile=/dev/null','-o','RekeyLimit=16K','-o','ConnectTimeout=5','root@127.0.0.1','ignored-by-force-command'];
  const output=cp.execFileSync(client,args,{input:data,timeout:45000,maxBuffer:2*1024**2,stdio:['pipe','pipe','pipe']});assert.deepEqual(output,data);
  const wrong=dir+'/wrong-host';fs.writeFileSync(wrong,'[127.0.0.1]:3439 '+fs.readFileSync(dir+'/client.pub','utf8'));
  const refused=cp.spawnSync(client,args.map(a=>a==='UserKnownHostsFile='+dir+'/known_hosts'?'UserKnownHostsFile='+wrong:a),{input:'fictional',timeout:10000,stdio:['pipe','pipe','pipe']});assert.notEqual(refused.status,0);assert.match(refused.stderr.toString(),/HOST IDENTIFICATION HAS CHANGED|Host key verification failed/);
  results.push({server:server==='/usr/sbin/sshd'?'existing server':'candidate server',bytes:data.length,rekeyLimitBytes:16384,exactEcho:true,changedHostKeyRejected:true});
 }finally{proc.kill('SIGTERM');await new Promise(r=>proc.once('exit',r));fs.closeSync(log);}
}
const result={date:new Date().toISOString(),passed:true,packageVersion:'1:'+version,clientSha256:createHash('sha256').update(fs.readFileSync(client)).digest('hex'),checks:results,productionChanged:false,limitation:'Normal repeated rekeys and hostile host-key mismatch rejection; not an exploit reproduction of the upstream use-after-free.'};
fs.writeFileSync(root+'/native.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
