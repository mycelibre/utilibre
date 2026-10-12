import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
export const root='/var/lib/utilibre-maintenance/gdal-avif-followup-20261012',geo='/var/lib/utilibre-maintenance/geospatial-followup-20261012';
export const version='3.6.2+dfsg-1+utilibre2',oldVersion='3.6.2+dfsg-1+utilibre1';
export const packageName=`libgdal32_${version}_amd64.deb`,packageSha256='baf316c3f5b458399082e88c281daeb8a76874defae76fe5be152b25ce7eca8a';
export const target='utilibre-gathio-postgres-1',candidate='utilibre-gathio-documentdb:gdal-avif-20261012',baseRef='utilibre-gathio-documentdb:heif-security-20261012',base='sha256:425207d99ef6ed8b442d8fafe7ed021d78a2e00b92de39fd4e7080fa7701adbb';
export const library='/usr/lib/x86_64-linux-gnu/libgdal.so.32.3.6.2';
export const commit='154b1cbbfbbe0a0b19c5b64e99d2e9493db9a016',patchSha256='9df21f4676d1c763782c73e1a9b1a6ae78e148267c6de59c3301199541bc9862';
export const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
export function run(cmd,args,input){try{return cp.execFileSync(cmd,args,{input,encoding:'utf8',timeout:180000,maxBuffer:64e6,stdio:['pipe','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0',APP_BIND_IP:'10.10.1.43'}}).trim();}catch(e){fs.writeFileSync(root+'/command-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Bounded GDAL AVIF gate failed; private diagnostics retained.');}}
export const docker=(...args)=>run('docker',args),inspect=name=>JSON.parse(docker('inspect',name))[0];
export const limits=['--rm','--network','none','--hostname','utilibre-gdal-avif-fixture','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=64m,mode=1777'];
