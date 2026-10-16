// Native checks in disposable network namespaces, never the actual SSH service.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);const [candidate,out]=process.argv.slice(2);assert(process.argv.length===4&&path.isAbsolute(candidate)&&path.isAbsolute(out));assert(!fs.existsSync(out));fs.mkdirSync(out,{mode:0o700});
const image='sha256:f45539e1b2380da919ac34c184cb1a19b0c7a1037f993fd30ae37a1a1f8b8604',here=new URL('.',import.meta.url).pathname;
assert.equal(JSON.parse(fs.readFileSync(candidate+'/build-completed.json')).status,'built-not-deployed');
const mount=(src,dst)=>['--mount',`type=bind,src=${src},dst=${dst},readonly`];
function isolated(label,args,timeout){
 const cid=out+'/'+label+'.cid';try{return cp.execFileSync('docker',['run','--rm','--cidfile',cid,'--pull=never','--network=none','--log-driver=none','--cap-drop=ALL','--security-opt=no-new-privileges','--cpus=2','--memory=1g','--memory-swap=1g','--pids-limit=128','--ulimit','core=0','--tmpfs','/tmp:rw,exec,nosuid,nodev,size=128m,mode=1777',...args],{encoding:'utf8',timeout,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();}
 catch(e){fs.writeFileSync(out+'/'+label+'-error.log',String(e.stdout||'')+'\n'+String(e.stderr||e.message));throw Error(label+' native check failed; private error log retained');}
 finally{if(fs.existsSync(cid)){const own=fs.readFileSync(cid,'utf8').trim();assert(/^[a-f0-9]{64}$/.test(own));try{cp.execFileSync('docker',['rm','-f',own],{stdio:'pipe',timeout:15000});}catch(e){assert(String(e.stderr).includes('No such container'));}}}
}
const current='/var/lib/utilibre-maintenance/ssh-server-followup-20261012',old='/var/lib/utilibre-maintenance/ssh-closure-20261012';
const packageMounts=(base,dest,version)=>['openssh-client','openssh-server','openssh-sftp-server'].flatMap(p=>{const f=p+'_10.0p1-7+deb13u4+utilibre'+version+'_amd64.deb';return mount(base+'/'+f,dest+'/'+f)});
const username=JSON.parse(isolated('username',['--read-only','--user','65534:65534',...packageMounts(candidate,'/candidate','3'),...packageMounts(current,'/current','2'),...mount(here+'username-native.py','/check.py'),'--entrypoint','python3',image,'/check.py'],60000));assert(username.passed);fs.writeFileSync(out+'/username.json',JSON.stringify(username,null,2)+'\n');
const log=isolated('compatibility',['--cap-add=NET_ADMIN','--cap-add=SETUID','--cap-add=SETGID','--cap-add=SYS_CHROOT','--cap-add=CHOWN','--cap-add=DAC_OVERRIDE','--cap-add=FOWNER','--cap-add=KILL','--cap-add=AUDIT_WRITE','--device=/dev/net/tun','--tmpfs','/build:rw,exec,nosuid,nodev,size=128m,mode=700',...packageMounts(candidate,'/candidate','3'),...packageMounts(old,'/previous','1'),...mount(here+'native.py','/native.py'),'--entrypoint','sh',image,'-ec','cp /candidate/*.deb /build/; python3 /native.py --candidate-version 10.0p1-7+deb13u4+utilibre3; cat /build/native.json'],300000);
fs.writeFileSync(out+'/compatibility.log',log+'\n');
const marker=log.indexOf('\n{\n');assert(marker>=0);const native=JSON.parse(log.slice(marker+1));assert(native.passed&&native.checks.length===11);assert.equal(native.packageVersion,'1:10.0p1-7+deb13u4+utilibre3');fs.writeFileSync(out+'/native.json',JSON.stringify(native,null,2)+'\n');
console.log(JSON.stringify({passed:true,usernameBeforeAfter:username.rows.map(r=>({label:r.label,rejected:r.rejected,valid:r.legitimateUsers})),compatibilityChecks:native.checks.length,network:'isolated loopback only',productionChanged:false}));
