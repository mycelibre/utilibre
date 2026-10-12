// Signed same-release PCRE2 package only; no source/application rebuild.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const root='/home/ubuntu/freetools',dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011';
const recipe=fileURLToPath(new URL('.',import.meta.url));
fs.mkdirSync(dir,{recursive:true,mode:0o700});
const selected=[
 ['public-egress','utilibre-13ft-proxy-1','2a20ac2cb0f4a3dbe7c0ddba90b3f077ff11e96eb2a03f7bc4242aa01fdeb8d2','/opt/squid /usr/local'],
 ['freshrss','utilibre-services-freshrss-1','6427b824cad55b156574dec0bab5b37db665f804269d06adf9f05375b955d0e8','/var/www/FreshRSS /usr/local'],
 ['trip','utilibre-trip-app-1','9be708747e3c36a8afd8646916d8fb7dae4b4c75ab7f27b9c7db19571b618366','/app /usr/local'],
 ['beaverhabits','utilibre-beaverhabits-app-1','a9185b1a3de2987d3d095b5c23922f6d0200a62a2846cccaca29a384f766376c','/app /usr/local'],
 ['unfurl','utilibre-unfurl-app-1','b54adc8da1086188ead2c5aa173ebabeed7f952ba09fb83e72857e5e82ee2016','/app /usr/local'],
 ['radicale','utilibre-calendar-radicale-1','b6885412ba8b1e4154af7e94a73513416ff074de34f25ae18f87a1d47928cd66','/usr/local'],
 ['priviblur','utilibre-priviblur-priviblur-1','c5fddde6e52dbdbe0b161e534bc44a2c9d11817aaba0107481a690513dac0acc','/priviblur /usr/local'],
 ['13ft','utilibre-13ft-app-1','f20fb9bd76b3661b123c786727835b55f2685662589dca5fc6c883190af948a4','/upstream /usr/local'],
 ['breezewiki','utilibre-expanded-breezewiki-1','f63472a7ba654638f67aad837afdbb4649ff67362b8bd0d3dfe572e1050c2910','/app /usr/local'],
 ['family-chess','utilibre-family-chess-app-1','fdb6b012772d111e905ab75c430dd2eb6344f439781b35346470d84e63115df8','/app /usr/local'],
];
const sha=b=>createHash('sha256').update(b).digest('hex');
function docker(args,timeout=120000){try{return execFileSync('docker',args,{encoding:'utf8',timeout,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:args[0]==='build'?{...process.env,DOCKER_BUILDKIT:'0'}:process.env});}catch(e){fs.writeFileSync(dir+'/last-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Vendor layer command failed; private diagnostic retained');}}
const inspect=name=>JSON.parse(docker(['inspect',name]))[0];
const bound=['--pull','never','--network','none','--read-only','--cpus','1','--memory','384m','--pids-limit','96','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--tmpfs','/tmp:rw,size=32m,mode=1777'];
const run=(image,cmd,args=[])=>docker(['run','--rm',...bound,'--mount','type=bind,src='+recipe+',dst=/fixture,readonly','--entrypoint',cmd,image,...args]);
const floor=()=>{let x=fs.statfsSync(dir);assert(x.bavail*x.bsize>=8*1024**3,'8 GiB recovery floor');};
const archive=dir+'/libpcre2-8-0_10.46-1~deb13u3_amd64.deb';
floor();
if(!fs.existsSync(archive)){
 docker(['run','--rm','--pull','never','--name','maintenance-pcre-vendor-fetch','--cpus','1','--memory','384m','--pids-limit','64','--log-driver','none','--mount','type=bind,src='+dir+',dst=/out','--entrypoint','sh','debian:13.7-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f','-ec','apt-get update > /out/vendor-index.log 2>&1; cd /out; apt-get download libpcre2-8-0=10.46-1~deb13u3 >> /out/vendor-index.log 2>&1; apt-cache show libpcre2-8-0=10.46-1~deb13u3 > /out/pcre-package-index.txt'],180000);
}
const packageSha=sha(fs.readFileSync(archive)),index=fs.readFileSync(dir+'/pcre-package-index.txt','utf8');assert(index.includes('SHA256: '+packageSha));
const context=dir+'/context';fs.mkdirSync(context,{recursive:true});fs.copyFileSync(archive,context+'/libpcre2-8-0.deb');fs.copyFileSync(recipe+'Dockerfile',context+'/Dockerfile');
const report={date:new Date().toISOString(),status:'staging',package:'libpcre2-8-0',version:'10.46-1~deb13u3',packageSha256:packageSha,deployed:false,rows:[]};
for(const [kind,name,id,roots] of selected){
 floor();const live=inspect(name);assert.equal(live.Image,'sha256:'+id,'Runtime drift requires review');const before=inspect(live.Image);
 const candidate='utilibre-'+kind+':pcre-vendor-security-20261011';
 docker(['build','--network','none','--pull=false','--memory','384m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE_IMAGE='+live.Image,'--build-arg','RUNTIME_USER='+(before.Config.User||'root'),'-t',candidate,context],180000);
 const after=inspect(candidate);
 for(const key of ['User','Env','Entrypoint','Cmd','WorkingDir','Healthcheck','Volumes','ExposedPorts','Labels'])assert.deepEqual(after.Config[key],before.Config[key],key+' changed');
 assert.equal(run(candidate,'dpkg-query',['-W','-f=${Version}','libpcre2-8-0']).trim(),report.version);
 const script=`find ${roots} -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`;
 const appHash=run(live.Image,'sh',['-ec',script]).trim().split(/\s/)[0];assert.equal(run(candidate,'sh',['-ec',script]).trim().split(/\s/)[0],appHash,'Application bytes changed');
 if(kind==='freshrss')assert.match(run(candidate,'php',['-r',`if(!ini_get('pcre.jit'))exit(1);foreach(['fictional-42','niño'] as $s){if(preg_match('/^(fictional-([0-9]+)|niño)$/u',$s,$m)!==1)exit(2);}if(preg_match('/^abc$/','xyz')!==0)exit(3);echo 'Native PHP PCRE JIT/Unicode checks passed';`]),/checks passed/);
 else assert.match(run(candidate,'python',['-B','/fixture/pcre-native.py']),/checks passed/);
 const row={kind,name,base:before.Id,baseRef:live.Config.Image,candidate,candidateId:after.Id,applicationSha256:appHash,roots,nativeConfigurationUnchanged:true,nativePcrePassed:true,status:'passed'};
 report.rows.push(row);fs.writeFileSync(dir+'/pcre-stage.json',JSON.stringify(report,null,2)+'\n');console.log(kind+': package, unchanged application and native PCRE/JIT passed');
}
report.status='passed';report.completedAt=new Date().toISOString();fs.writeFileSync(dir+'/pcre-stage.json',JSON.stringify(report,null,2)+'\n');floor();
