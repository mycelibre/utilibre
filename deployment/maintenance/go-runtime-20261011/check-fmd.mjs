// Isolated native API/control binary tests. Never contact a real device.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile,mkdtemp,rm,chmod,statfs} from 'node:fs/promises';
const text=process.argv[2]==='--text';const oct28=process.argv[2]==='--oct28';assert(!process.argv[2]||oct28||text);
const output=text?'/var/lib/utilibre-maintenance/security-20261028/text':oct28?'/var/lib/utilibre-maintenance/security-20261028/go-runtime':'/var/lib/utilibre-maintenance/go-runtime-20261011';
const image=text?'utilibre-fmd:text-security-20261028':oct28?'utilibre-fmd:go-security-20261028':'utilibre-fmd:0.17.0-go-security-20261011';
const source=text?'utilibre-fmd:go-security-20261028':oct28?'utilibre-fmd:0.17.0-go-security-20261011':'registry.gitlab.com/fmd-foss/fmd-server:0.17.0-alpine@sha256:e4a7f5538aa3febe938159ee2db337ccdb50d340d7009784c5a851f152df48e0';
const name='maintenance-fmd-'+randomBytes(4).toString('hex');
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:60000,maxBuffer:2*1024**2,stdio:['pipe','pipe','pipe']});
const [old,next]=JSON.parse(docker(['image','inspect',source,image]));
for(const k of ['Cmd','Entrypoint','User','Env','WorkingDir','ExposedPorts','Volumes'])assert.deepEqual(next.Config[k],old.Config[k],k);
const disk=await statfs(output);assert(disk.bavail*disk.bsize>8*1024**3);
const temp=await mkdtemp('/dev/shm/maintenance-fmd-');await chmod(temp,0o755);
const token=randomBytes(32).toString('hex');
await writeFile(temp+'/config.yml',`DatabaseDir: /var/lib/fmd-server/db\nPortInsecure: '8080'\nPortSecure: ''\nMaxSavedLoc: 300\nMaxSavedPic: 5\nRegistrationToken: ${token}\nMetricsAddrPort: '127.0.0.1:9100'\nRemoteIpHeader: X-Real-IP\n`,{mode:0o644});
let network=false,container=false;const accounts=[];
try{
 docker(['network','create','--internal',name]);network=true;
 docker(['run','-d','--name',name,'--network',name,'--cpus','1','--memory','384m','--pids-limit','128','--read-only','--log-driver','none','--security-opt','no-new-privileges:true','--tmpfs','/var/lib/fmd-server/db:rw,size=64m,uid=1000,gid=1000,mode=770','--tmpfs','/tmp:rw,size=32m,mode=1777','-v',temp+'/config.yml:/etc/fmd-server/config.yml:ro','-v','/opt/utilibre/community-data/fmd-web-v0.17.0-p3:/opt/utilibre-web:ro',image,'--config','/etc/fmd-server/config.yml','--web-dir','/opt/utilibre-web']);container=true;
 const ip=docker(['inspect',name,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}']).trim();assert.match(ip,/^(?:172\.(?:1[6-9]|2[0-9]|3[01])|192\.168|10\.\d+)\.\d+\.\d+$/);const origin='http://'+ip+':8080';
 let ready=false;for(let n=0;n<60;n++){try{if((await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}assert(ready,'FMD ready');
 const api=async(path,method='GET',body,access)=>fetch(origin+'/api/v2'+path,{method,headers:{'content-type':'application/json',...(access?{authorization:'Bearer '+access}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const data=()=>({username:'fictional'+randomBytes(6).toString('hex'),salt64:randomBytes(16).toString('base64'),passwordHash64:randomBytes(32).toString('base64'),encMasterKey64:randomBytes(64).toString('base64'),protoVersion:2,registrationToken:token});
 assert.equal((await api('/account/register','POST',{...data(),registrationToken:'invalid'})).status,401);
 for(let i=0;i<2;i++){const a=data(),r=await api('/account/register','POST',a);assert.equal(r.status,200);const v=await r.json();assert(v.accessToken);accounts.push({name:a.username,token:v.accessToken});}
 const item={clientItemIdHex:randomBytes(16).toString('hex'),unixMillis:Date.now(),ciphertext64:randomBytes(48).toString('base64')};
 assert.equal((await api('/data/location','POST',{items:[item]},accounts[0].token)).status,200);
 const own=await(await api('/data/location','GET',undefined,accounts[0].token)).json();assert.equal(own.items[0].ciphertext64,item.ciphertext64);
 const other=await(await api('/data/location','GET',undefined,accounts[1].token)).json();assert.equal(other.items?.length||0,0);
 assert([400,401,403].includes((await api('/data/location')).status));
 assert(docker(['exec',name,'/opt/fmd-server-ctl','version']).includes('0.17.0'));
 // Native listusers filters strictly before its second-resolution cutoff.
 await new Promise(r=>setTimeout(r,1100));
 const list=docker(['exec','-e','FMD_DATABASEDIR=/var/lib/fmd-server/db',name,'/opt/fmd-server-ctl','listusers']);for(const a of accounts)assert(list.includes(a.name));
 for(const a of accounts){assert.equal((await api('/account','DELETE',undefined,a.token)).status,200);assert.equal((await api('/account/'+a.name+'/salt')).status,404);}
 const report={status:'passed',date:new Date().toISOString(),deployed:false,image,imageId:next.Id,nativeConfigUnchanged:true,registrationProtected:true,twoSyntheticAccounts:true,opaqueRecordRoundtrip:true,crossAccountAndAnonymousDenial:true,controlBinaryVersionAndList:true,accountDeletion:true,webOverride:'unchanged existing0.17.0-p3 mount',limits:'No real device, push, geolocation or encryption protocol test; isolated opaque fixtures only.'};
 await mkdir(output,{recursive:true,mode:0o700});await writeFile(output+'/fmd-native.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
}finally{if(container)docker(['rm','-f',name]);if(network)docker(['network','rm',name]);assert(temp.startsWith('/dev/shm/maintenance-fmd-'));await rm(temp,{recursive:true});await writeFile(output+'/fmd-cleanup.json',JSON.stringify({date:new Date().toISOString(),containerRemoved:true,syntheticRamRemoved:true}));}
