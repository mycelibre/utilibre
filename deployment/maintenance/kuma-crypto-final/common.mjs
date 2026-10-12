import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
export const root='/var/lib/utilibre-maintenance/kuma-crypto-final-20261012';
export const base='sha256:2dc3cf1bd674d73a818774d4bd83121d2ae239dc75d8f65da62e30a232f6c7a4';
export const baseRef='utilibre-kuma:openldap-security-20261012',candidate='utilibre-kuma:crypto-security-20261012',target='utilibre-community-uptime-kuma-1';
export const versions={'python3-cryptography':'50.0.2+utilibre1','python3-cffi-backend':'2.1.1+utilibre1','python3-cffi':'2.1.1+utilibre1','python3-pycparser':'3.11+utilibre1'};
export const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
export function run(cmd,args,input){try{return cp.execFileSync(cmd,args,{input,encoding:'utf8',timeout:180000,maxBuffer:32e6,stdio:['pipe','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(root+'/command-error.log',String(e.stdout||'')+String(e.stderr||''),{mode:0o600});throw Error('Kuma cryptography gate failed; restricted diagnostics retained.');}}
export const docker=(...args)=>run('docker',args),inspect=name=>JSON.parse(docker('inspect',name))[0];
export const limits=['--rm','--network','none','--hostname','utilibre-crypto-fixture','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=64m,mode=1777'];
