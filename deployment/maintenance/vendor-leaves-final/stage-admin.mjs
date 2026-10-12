// Preserve the distroless runtime: two genuine, coupled signed DHI packages only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011',context=dir+'/admin-ssl';fs.mkdirSync(context,{recursive:true});
const docker=(args,timeout=120000)=>{try{return execFileSync('docker',args,{encoding:'utf8',timeout,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],env:args[0]==='build'?{...process.env,DOCKER_BUILDKIT:'0'}:process.env});}catch(e){fs.writeFileSync(context+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Admin vendor stage failed; private diagnostic retained');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0],sha=b=>createHash('sha256').update(b).digest('hex');
const base='sha256:e907c2fd6febb2cefa046978c718e3e4e68cf3444201c574bdf2421c07123bc1';assert.equal(inspect('utilibre-expanded-penpot-admin-console-1').Image,base);
const x=fs.statfsSync(dir);assert(x.bavail*x.bsize>=8*1024**3);
docker(['run','--rm','--name','maintenance-admin-vendor-fetch','--user','0','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--mount','type=bind,src='+context+',dst=/out','--entrypoint','sh','sha256:ca4f4adc5367a40e1597bea7d6032de0d08266b6d65cdf083ae4c695d54d23a7','-ec',`
apt-get update > /out/apt-index.log 2>&1
cd /out
apt-get download libssl3t64=3.5.7-1~deb13u3+dhi0 openssl-provider-legacy=3.5.7-1~deb13u3+dhi0 >> /out/apt-index.log 2>&1
apt-cache show libssl3t64=3.5.7-1~deb13u3+dhi0 openssl-provider-legacy=3.5.7-1~deb13u3+dhi0 > package-index.txt
mkdir -p overlay/var/lib/dpkg/status.d
for p in libssl3t64 openssl-provider-legacy; do
 dpkg-deb --extract "$p"_3.5.7-1~deb13u3+dhi0_amd64.deb overlay
 dpkg-deb --control "$p"_3.5.7-1~deb13u3+dhi0_amd64.deb "control-$p"
 cp "control-$p/control" "overlay/var/lib/dpkg/status.d/$p"
 cp "control-$p/md5sums" "overlay/var/lib/dpkg/status.d/$p.md5sums"
 (cd overlay && md5sum --check "var/lib/dpkg/status.d/$p.md5sums") >> payload-check.log
done`],180000);
const index=fs.readFileSync(context+'/package-index.txt','utf8'),packages=fs.readdirSync(context).filter(n=>n.endsWith('.deb')).map(file=>({file,sha256:sha(fs.readFileSync(context+'/'+file))}));assert.equal(packages.length,2);for(const p of packages)assert(index.includes('SHA256: '+p.sha256));
fs.copyFileSync(new URL('./Dockerfile.admin',import.meta.url),context+'/Dockerfile');
const candidate='utilibre-penpot-admin:openssl-vendor-security-20261011';docker(['build','--network','none','--pull=false','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',candidate,context]);
const before=inspect(base),after=inspect(candidate);for(const k of ['User','Env','Entrypoint','Cmd','WorkingDir','Healthcheck','Volumes','ExposedPorts','Labels'])assert.deepEqual(after.Config[k],before.Config[k],k);
const node=(image,code)=>docker(['run','--rm','--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--entrypoint','node',image,'-e',code]);
const hashCode=`const fs=require('fs'),path=require('path'),crypto=require('crypto'),h=crypto.createHash('sha256');function walk(p){for(const n of fs.readdirSync(p).sort()){const q=path.join(p,n),s=fs.lstatSync(q);if(s.isDirectory())walk(q);else if(s.isFile()){h.update(q);h.update(fs.readFileSync(q));}}}walk('/nitrate');console.log(h.digest('hex'))`;
const appSha256=node(base,hashCode).trim();assert.equal(node(candidate,hashCode).trim(),appSha256);
const observed=JSON.parse(node(candidate,`const fs=require('fs'),c=require('crypto');let out={};for(const p of ['libssl3t64','openssl-provider-legacy']){const text=fs.readFileSync('/var/lib/dpkg/status.d/'+p,'utf8');if(!text.includes('Version: 3.5.7-1~deb13u3+dhi0'))throw Error('version');const sums=fs.readFileSync('/var/lib/dpkg/status.d/'+p+'.md5sums','utf8').trim().split('\\n');for(const line of sums){const [md5,...name]=line.trim().split(/\\s+/);if(c.createHash('md5').update(fs.readFileSync('/'+name.join(' '))).digest('hex')!==md5)throw Error('payload');}out[p]=sums.length;}const key=c.randomBytes(32),iv=c.randomBytes(12),e=c.createCipheriv('aes-256-gcm',key,iv),v=Buffer.concat([e.update('fictional'),e.final()]),d=c.createDecipheriv('aes-256-gcm',key,iv);d.setAuthTag(e.getAuthTag());if(Buffer.concat([d.update(v),d.final()]).toString()!=='fictional')throw Error('native crypto');console.log(JSON.stringify(out))`));
fs.writeFileSync(dir+'/admin-stage.json',JSON.stringify({status:'passed',date:new Date().toISOString(),deployed:false,name:'utilibre-expanded-penpot-admin-console-1',base,baseRef:inspect('utilibre-expanded-penpot-admin-console-1').Config.Image,candidate,candidateId:after.Id,packages,version:'3.5.7-1~deb13u3+dhi0',applicationSha256:appSha256,nativeConfigurationUnchanged:true,payloadFilesChecked:observed,nativeCrypto:true,limitation:'Native application HTTP/database gate required before rollout; Node uses its embedded OpenSSL separately.'},null,2)+'\n');console.log('Admin coupled signed DHI OpenSSL packages and complete payload/native crypto verified; app bytes unchanged.');
