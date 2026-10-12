import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=fileURLToPath(new URL('.',import.meta.url));
const name='utilibre-services-freshrss-1',base='sha256:84eb0f7f69ba811c8fcba93bcb67ab23706fd7a3078215cedfa538f1159eee2c',candidate='utilibre-freshrss:apache-2.4.69-20261012';
const packages={
 'apache2-bin_2.4.69-1_amd64.deb':'c12e6ddb209d5942b09001c1a04581092e4bf40fa51bf9d2605eb6ed5117b600',
 'apache2-data_2.4.69-1_all.deb':'d13853426e0142cf189f74560d75352c16d7237f7d63d033e723a39d5f7169ee',
 'apache2-utils_2.4.69-1_amd64.deb':'7ebea0fd9538107344fc6de6b612b5a6f1c3705db15255b1c9886d4ab388daa9',
 'apache2_2.4.69-1_amd64.deb':'5634fa84f75196b2dd59d6b6583c5af604c62aab5e60d9176ccc8823a2df96fb',
 'libpcre2-8-0_10.48-3.1_amd64.deb':'4f717024358d04c0b9ad7583f470fc639b1c4fd92d34b5ec4355c307cd5b37de',
 'libxml2-16_2.15.4+dfsg-1_amd64.deb':'36f043b5014adf26ff722f693361d1d677088d1eb384fe4522ad514b52053c88',
};
const docker=(args,input)=>{try{return cp.execFileSync('docker',args,{input,encoding:'utf8',timeout:240000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/apache-stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Apache stage failed; private diagnostic retained');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
const original=inspect(name);assert.equal(original.Image,base);assert.equal(inspect(original.Config.Image).Id,base);assert.equal(inspect(base).Config.User,'root');
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
const context=dir+'/apache-context';fs.mkdirSync(context+'/packages',{recursive:true});
for(const [file,sha] of Object.entries(packages)){const source=dir+'/sources/'+file;assert.equal(createHash('sha256').update(fs.readFileSync(source)).digest('hex'),sha);fs.copyFileSync(source,context+'/packages/'+file);}
docker(['build','--pull=false','--network=none','-f',here+'Dockerfile.apache','--build-arg','BASE='+original.Config.Image,'-t',candidate,context]);
const next=inspect(candidate);assert.deepEqual(next.Config,inspect(base).Config);
const run=(image,command,args=[])=>docker(['run','--rm','--network','none','--read-only','--cpus','1','--memory','512m','--pids-limit','128','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=32m,mode=1777','--entrypoint',command,image,...args]);
const manifest="find /var/www/FreshRSS /etc/apache2 /etc/php -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum";
const fingerprint=run(base,'sh',['-ec',manifest]);assert.equal(run(candidate,'sh',['-ec',manifest]),fingerprint,'Application or Apache/PHP configuration changed');
for(const packageName of ['apache2','apache2-bin','apache2-data','apache2-utils'])assert.equal(run(candidate,'dpkg-query',['-W','-f=${Version}',packageName]),'2.4.69-1');
run(candidate,'sh',['-ec','ldd -r /usr/sbin/apache2 > /tmp/ldd; ! grep -E "not found|undefined symbol" /tmp/ldd']);
assert.match(run(candidate,'apache2',['-v']),/2\.4\.69/);
run(candidate,'php',['-r',`if(preg_match('/^(?<name>[\\p{L}]+) ([0-9]+)$/u','café 123',$m)!==1||$m['name']!=='café')exit(1);$x=new DOMDocument();if(!$x->loadXML('<fictional><name>café</name></fictional>',LIBXML_NONET))exit(1);echo "PHP_NATIVE_PASSED";`]);
fs.writeFileSync(dir+'/apache-stage.json',JSON.stringify({date:new Date().toISOString(),name,base,candidate,imageId:next.Id,packages,applicationAndConfigSha256:fingerprint.split(/\s/)[0],configurationUnchanged:true,passed:true,deployed:false},null,2)+'\n');
console.log('Apache 2.4.69 candidate: unchanged FreshRSS/configuration, native PHP/XML/regex and ELF checks passed.');
