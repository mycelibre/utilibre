import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const here=new URL('.',import.meta.url).pathname,spec=JSON.parse(fs.readFileSync(here+'spec.json')),root=spec.work;
export const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f));
export function run(cmd,args,input){try{return execFileSync(cmd,args,{input,encoding:'utf8',timeout:300000,maxBuffer:32e6,stdio:['pipe','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0',APP_BIND_IP:'10.10.1.43'}}).trim();}catch(e){fs.writeFileSync(root+'/command-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('HDF5 bounded gate failed; private diagnostics retained.');}}
export const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
export const limits=['--rm','--network','none','--hostname','utilibre-hdf5-fixture','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=64m,mode=1777'];
