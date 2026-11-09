// Exact signed vendor-package overlay. No application upgrade or live mutation.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,statfsSync} from 'node:fs';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261109';
const spec=[
 ['addy','utilibre-addy-app-1','sha256:79e9ee49b5fea032228016d584e677c209853be4fa14adc2894b4ad3c61470bf'],
 ['fourget','utilibre-reader-evaluation-fourget-1','sha256:80658cb1688f290ef13f2d45c67ac18cba881c2433dba67ef451b4b0a636bfe2']
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a)=>execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();
const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
const bounds=['--pull','never','--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:size=32m,mode=1777'];
const native=(image,command,args=[])=>docker('run','--rm',...bounds,'--mount','type=bind,src='+root+'/glib-native,dst=/fixture/glib-native,readonly','--entrypoint',command,image,...args);
const pkg=root+'/alpine323/glib-2.86.5-r0.apk';assert.equal(sha(readFileSync(pkg)),'9e9fa35d0e7f7e543155720e22e54c60e726722d02e00181e698ce8f8d803b3b');
const context=root+'/glib-context';mkdirSync(context,{recursive:true});copyFileSync(pkg,context+'/glib-2.86.5-r0.apk');copyFileSync(new URL('./Dockerfile.glib',import.meta.url),context+'/Dockerfile');
const repaired=root+'/glib-output/libgio-2.0.so.0.8600.5';
const repairedSha=sha(readFileSync(repaired));
assert(readFileSync(root+'/glib-output/glib-upstream-tests.log','utf8').includes('Fail:              0'));
copyFileSync(repaired,context+'/libgio-2.0.so.0.8600.5');
const rows=[];
for(const [key,name,base] of spec){
 const disk=statfsSync(root);assert(disk.bavail*disk.bsize>=8*1024**3);
 assert.equal(inspect(name).Image,base);const before=inspect(base),candidate='utilibre-'+key+':glib2865-20261109';
 docker('build','--pull=false','--network','none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE_IMAGE='+base,'--build-arg','RUNTIME_USER='+(before.Config.User||'root'),'-t',candidate,context);
 const after=inspect(candidate);
 for(const field of ['Env','Entrypoint','Cmd','WorkingDir','Healthcheck','Volumes','ExposedPorts','Labels'])assert.deepEqual(after.Config[field],before.Config[field],field+' changed');
 assert.equal(after.Config.User,before.Config.User||'root');
 const packages=image=>Object.fromEntries(native(image,'cat',['/lib/apk/db/installed']).split('\n\n').filter(Boolean).map(b=>[b.match(/^P:(.+)$/m)?.[1],b.match(/^V:(.+)$/m)?.[1]]));
 const a=packages(base),b=packages(candidate);assert.equal(a.glib,'2.86.3-r0');assert.equal(b.glib,'2.86.5-r0');
 const changed=Object.keys({...a,...b}).filter(k=>a[k]!==b[k]);assert.deepEqual(changed,['glib']);
 const app='find /var/www /usr/local /opt -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum';
 const appHash=native(base,'sh',['-ec',app]);assert.equal(native(candidate,'sh',['-ec',app]),appHash);
 const nativeResult=native(candidate,'/fixture/glib-native');assert(nativeResult.includes('seven malformed documents passed'));
 const php=native(candidate,'php',['-r','if(!class_exists("Imagick"))exit(1);$i=new Imagick();$i->newImage(8,8,"white");$i->setImageFormat("png");$p=$i->getImageBlob();if(substr($p,1,3)!=="PNG")exit(2);$j=new Imagick();$j->readImageBlob($p);if($j->getImageWidth()!==8)exit(3);echo "Native PHP image round-trip passed";']);
 assert(php.includes('round-trip passed'));
 rows.push({key,name,base,baseRef:inspect(name).Config.Image,candidate,imageId:after.Id,changedPackages:changed,packageVersion:b.glib,packageSha256:sha(readFileSync(pkg)),gioSha256:repairedSha,upstreamFix:'c9da977c178fbfc0e4caf99f9fdf5dc433d6fcc2',applicationSha256:appHash.split(/\s/)[0],nativeResult,php,configurationUnchanged:true,status:'passed'});
 writeFileSync(root+'/glib-stage.json',JSON.stringify({date:new Date().toISOString(),status:'passed',deployed:false,rows},null,2));console.log(key+': signed GLib overlay and native tests passed');
}
