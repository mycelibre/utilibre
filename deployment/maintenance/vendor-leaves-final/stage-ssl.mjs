import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const recipe=fileURLToPath(new URL('.',import.meta.url)),dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011';
const sha=b=>createHash('sha256').update(b).digest('hex');
const docker=(args,timeout=120000)=>{try{return execFileSync('docker',args,{encoding:'utf8',timeout,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],env:args[0]==='build'?{...process.env,DOCKER_BUILDKIT:'0'}:process.env});}catch(e){fs.writeFileSync(dir+'/ssl-stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('SSL stage failed; private diagnostic retained');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0],floor=()=>{const x=fs.statfsSync(dir);assert(x.bavail*x.bsize>=8*1024**3,'8 GiB floor');};
const native=(image,script)=>docker(['run','--rm','--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','48','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--entrypoint','sh',image,'-ec',script]);
const specs=[['mumble','utilibre-mumble-mumble-1','/usr/bin/mumble-server /entrypoint.sh /mumble','libssl3t64 openssl'],['redlib','public-utility-redlib-1','/usr/local/bin/redlib','libssl3t64']];
const report={status:'staging',date:new Date().toISOString(),rows:[],deployed:false};
for(const[kind,name,roots,packages]of specs){
 floor();const live=inspect(name),old=inspect(live.Image),context=dir+'/ssl-'+kind;fs.mkdirSync(context+'/packages',{recursive:true});
 const fetch=packages.split(' ').map(p=>p+'=3.0.13-0ubuntu3.16').join(' ');
 docker(['run','--rm','--name','maintenance-ssl-fetch-'+kind,'--user','0','--cpus','1','--memory','256m','--pids-limit','48','--log-driver','none','--mount','type=bind,src='+context+',dst=/out','--entrypoint','sh',live.Image,'-ec',`apt-get update > /out/apt-index.log 2>&1; cd /out/packages; apt-get download ${fetch} >> /out/apt-index.log 2>&1; for p in ${packages}; do apt-cache show "$p=3.0.13-0ubuntu3.16"; done > /out/package-index.txt`],180000);
 const index=fs.readFileSync(context+'/package-index.txt','utf8'),archives=fs.readdirSync(context+'/packages').map(file=>({file,sha256:sha(fs.readFileSync(context+'/packages/'+file))}));assert.equal(archives.length,packages.split(' ').length);for(const a of archives)assert(index.includes('SHA256: '+a.sha256));
 fs.copyFileSync(recipe+'Dockerfile.openssl',context+'/Dockerfile');const candidate='utilibre-'+kind+':openssl-vendor-security-20261011';
 docker(['build','--network','none','--pull=false','--memory','256m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE_IMAGE='+live.Image,'--build-arg','RUNTIME_USER='+(old.Config.User||'root'),'-t',candidate,context],180000);
 const after=inspect(candidate);for(const k of ['Env','Entrypoint','Cmd','WorkingDir','Healthcheck','Volumes','ExposedPorts','Labels'])assert.deepEqual(after.Config[k],old.Config[k],k);
 assert.equal(after.Config.User||'root',old.Config.User||'root','Native user semantics unchanged (empty USER means root)');
 const hashScript=`find ${roots} -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`;
 const appHash=native(live.Image,hashScript).split(/\s/)[0];assert.equal(native(candidate,hashScript).split(/\s/)[0],appHash);
 assert.equal(native(candidate,"dpkg-query -W -f='${Version}' libssl3t64").trim(),'3.0.13-0ubuntu3.16');
 report.rows.push({kind,name,base:old.Id,baseRef:live.Config.Image,candidate,candidateId:after.Id,packages,archives,applicationSha256:appHash,roots,nativeConfigurationUnchanged:true,status:'passed'});
 fs.writeFileSync(dir+'/ssl-stage.json',JSON.stringify(report,null,2)+'\n');console.log(kind+': genuine Ubuntu OpenSSL payload staged, native config/application hashes unchanged');
}
report.status='passed';report.completedAt=new Date().toISOString();fs.writeFileSync(dir+'/ssl-stage.json',JSON.stringify(report,null,2)+'\n');floor();
