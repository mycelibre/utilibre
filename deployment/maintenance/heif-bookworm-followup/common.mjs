import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
export const root='/var/lib/utilibre-maintenance/heif-bookworm-followup-20261012';
export const version='1.15.1-1+deb12u1+utilibre1',oldVersion='1.15.1-1+deb12u1';
export const packageName=`libheif1_${version}_amd64.deb`,packageSha256='160da5609c54233cba8930336ab48b9872625cb8eadd32fbc8b410fc144fe975';
export const target='utilibre-gathio-postgres-1',candidate='utilibre-gathio-documentdb:heif-security-20261012';
export const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
export function run(cmd,args,input){try{return cp.execFileSync(cmd,args,{input,encoding:'utf8',timeout:180000,maxBuffer:32e6,stdio:['pipe','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0',APP_BIND_IP:'10.10.1.43'}}).trim();}catch(e){fs.writeFileSync(root+'/command-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Bounded HEIF gate failed; private diagnostics retained.');}}
export const docker=(...args)=>run('docker',args),inspect=name=>JSON.parse(docker('inspect',name))[0];
export const limits=['--rm','--network','none','--hostname','utilibre-heif-fixture','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=64m,mode=1777'];
