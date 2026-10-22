import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {output} from './specs.mjs';
process.umask(0o077);
const dir=output+'/fourget',b=JSON.parse(fs.readFileSync(dir+'/build.json')),name='utilibre-php-fourget-check';
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Private 4get test failed; diagnostic retained');}};
assert.equal(docker('image','inspect','--format','{{.Id}}',b.candidate),b.imageId);assert.equal(docker('ps','-aq','--filter','name=^/'+name+'$'),'');
try{
 docker('run','-d','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','.5','--memory','256m','--memory-swap','256m','--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/run:rw,size=16m,mode=1777','--tmpfs','/var/www/html/4get/icons:rw,size=16m,mode=1777',b.imageId);
 docker('exec',name,'httpd','-t');
 const pid=docker('inspect','--format','{{.State.Pid}}',name);assert(+pid>0);
 const code=`for(let n=0;n<15;n++){try{let r=await fetch('http://127.0.0.1:8080/',{signal:AbortSignal.timeout(1000)}),t=await r.text();if(r.status!==200||!t.includes('<form')||!t.toLowerCase().includes('4get'))throw Error('No usable search form');console.log('APACHE_PHP_SEARCH_FORM_PASSED');process.exit(0);}catch{await new Promise(r=>setTimeout(r,300));}}process.exit(1);`;
 const result=cp.execFileSync('nsenter',['-t',pid,'-n',process.execPath,'--input-type=module','-e',code],{encoding:'utf8',timeout:20000});assert(result.includes('APACHE_PHP_SEARCH_FORM_PASSED'));
 const imaging=docker('exec',name,'php','-r',`$i=new Imagick();$i->newImage(8,8,"red","png");$s=$i->getImageBlob();$j=new Imagick();$j->readImageBlob($s);if($j->getImageWidth()!==8||$j->getImageHeight()!==8)exit(1);echo "IMAGE_PASSED";`);assert.equal(imaging,'IMAGE_PASSED');
 fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),imageId:b.imageId,passed:true,checks:['Apache configuration','Native PHP search form HTTP 200','Imagick PNG create/reopen dimensions'],network:'none',limitations:['No third-party search engines queried','Not an exploit test','Public route is checked separately during release']},null,2)+'\n');console.log('4get: Apache/PHP homepage and image processing passed offline');
}finally{if(docker('ps','-aq','--filter','name=^/'+name+'$'))docker('rm','-f',name);}
