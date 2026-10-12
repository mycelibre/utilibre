import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {specs} from './expat-specs.mjs';
const root='/var/lib/utilibre-maintenance/closure-followup-20261012',here=fileURLToPath(new URL('.',import.meta.url));
process.umask(0o077);
const docker=(args,input)=>{try{return cp.execFileSync('docker',args,{input,encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(root+'/expat-stage-error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('Expat candidate check failed; private diagnostic retained');}};
const read=x=>JSON.parse(docker(['inspect',x]))[0];
const bound=['--rm','--network','none','--read-only','--cpus','1','--memory','512m','--pids-limit','96','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=64m,mode=1777'];
const run=(image,cmd,args=[],input)=>docker(['run','-i',...bound,'-v',root+'/expat-native:/expat-native:ro','--entrypoint',cmd,image,...args],input);
const archive=root+'/sources/libexpat1_2.9.0-1_amd64.deb';
assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),'190d7f5e45f070c42a12f708fe417d6636cb45fae71175203168bb5c3695081b');
fs.mkdirSync(root+'/expat-context',{recursive:true});
let report=fs.existsSync(root+'/expat-stage.json')?JSON.parse(fs.readFileSync(root+'/expat-stage.json')):{date:new Date().toISOString(),rows:[]};
for(const s of specs){
 if(report.rows.some(r=>r.key===s.key&&r.passed))continue;
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 const live=read(s.name);assert.equal(live.Image,s.base);const before=read(s.base);
 const baseReference=live.Config.Image;assert.equal(read(baseReference).Id,s.base);
 const context=root+'/expat-context/'+s.key;fs.mkdirSync(context+'/overlay',{recursive:true});fs.copyFileSync(archive,context+'/libexpat1.deb');
 let pythonExtension=null;
 if(['grist','kitchenowl','forms','priviblur','breezewiki'].includes(s.key)){
  const version=run(s.base,'python',['-c','import platform;print(platform.python_version())']);
  const built=JSON.parse(fs.readFileSync(root+'/pyexpat-build.json')).rows.find(r=>r.version===version);assert(built);
  assert.equal(createHash('sha256').update(fs.readFileSync(built.file)).digest('hex'),built.sha256);
  pythonExtension=run(s.base,'python',['-c','import pyexpat;print(pyexpat.__file__)']);
  const target=context+'/overlay'+pythonExtension;fs.mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});fs.copyFileSync(built.file,target);
 }
 docker(['build','--pull=false','--network=none','-f',here+'Dockerfile.expat','--build-arg','BASE='+baseReference,'--build-arg','RUNTIME_USER='+(before.Config.User||'root'),'-t',s.candidate,context]);
 const after=read(s.candidate);assert.deepEqual(after.Config,before.Config);
 assert(!pythonExtension||/^\/usr\/local\/lib\/python3\.\d+\/lib-dynload\/pyexpat\.cpython-\d+-x86_64-linux-gnu\.so$/.test(pythonExtension));
 const hashScript=`find ${s.roots} -type f ! -path '/opt/imagick/lib/deps/libexpat.so.1' ${pythonExtension?"! -path '"+pythonExtension+"'":''} -print0 | sort -z | xargs -0 sha256sum | sha256sum`;
 const appHash=run(s.base,'sh',['-ec',hashScript]);assert.equal(run(s.candidate,'sh',['-ec',hashScript]),appHash,'Application bytes changed');
 assert.equal(run(s.candidate,'dpkg-query',['-W','-f=${Version}','libexpat1']),'2.9.0-1');
 assert.equal(run(s.candidate,'/expat-native'),'EXPAT_NATIVE_PASSED');
 assert.equal(run(s.candidate,'sh',['-ec','env -u LD_LIBRARY_PATH /expat-native']),'EXPAT_NATIVE_PASSED');
 const checks=['XML buffer bounds, malformed UTF-16 and valid parsing','configuration and application file parity'];
 if(['grist','kitchenowl','forms','priviblur','breezewiki'].includes(s.key)){
  assert.equal(run(s.candidate,'python',['-c','import pyexpat,xml.etree.ElementTree as E; assert pyexpat.EXPAT_VERSION=="expat_2.9.0"; assert pyexpat.ParserCreate().Parse(b"<fictional/>",True)==1; assert E.fromstring(b"<fictional><value>12</value></fictional>").findtext("value")=="12"; print("passed")']),'passed');checks.push('actual Python XML binding and ElementTree capsule compatibility');
 }
 if(s.key==='forms'){
  run(s.candidate,'python',['-c','import cairosvg,io; from PIL import Image; p=cairosvg.svg2png(bytestring=b\'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="blue"/></svg>\'); im=Image.open(io.BytesIO(p)); im.load(); assert im.size==(32,24); assert cairosvg.svg2pdf(bytestring=b\'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"/>\').startswith(b"%PDF-")']);checks.push('CairoSVG PNG dimensions and PDF output');
 }
 if(s.key.startsWith('penpot-')){
  run(s.candidate,'sh',['-ec','cmp /usr/lib/x86_64-linux-gnu/libexpat.so.1 /opt/imagick/lib/deps/libexpat.so.1; magick -size 32x24 xc:blue /tmp/fictional.png; test "$(magick identify -format "%w %h" /tmp/fictional.png)" = "32 24"']);checks.push('private/system library equality and native image output');
 }
 const row={...s,imageId:after.Id,passed:true,date:new Date().toISOString(),applicationSha256:appHash.split(/\s/)[0],checks,network:'none',deployed:false};
 report.rows.push(row);fs.writeFileSync(root+'/expat-stage.json',JSON.stringify(report,null,2)+'\n');console.log(s.key+': Expat and unchanged-application gates passed');
}
report.status='passed';fs.writeFileSync(root+'/expat-stage.json',JSON.stringify(report,null,2)+'\n');
