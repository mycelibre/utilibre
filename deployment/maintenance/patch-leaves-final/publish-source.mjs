// Small additive source offer. Existing application archives are not overwritten.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {specs,packages,output} from './specs.mjs';
process.umask(0o077);
const publish=process.argv[2]==='--publish';assert(!process.argv[2]||publish);
const sha=b=>createHash('sha256').update(b).digest('hex');
const stage=fs.mkdtempSync('/dev/shm/utilibre-patch-source-');
const filename='runtime-patch-leaves-20261012-source.tar.gz';
try{
 const sources=[];
 for(const s of specs){
  const build=JSON.parse(fs.readFileSync(output+'/'+s.key+'/build.json')),native=JSON.parse(fs.readFileSync(output+'/'+s.key+'/native.json'));
  assert(build.passed&&native.passed&&native.imageId===build.imageId);
  if(publish)assert.equal(cp.execFileSync('docker',['inspect','--format','{{.Image}}',s.container],{encoding:'utf8'}).trim(),build.imageId,'Source offer must match released image');
  sources.push({application:s.key,baseImage:s.base,imageId:build.imageId,packages:build.packages});
  const noticeCode=`const fs=require('fs'),paths=JSON.parse(process.argv[1]),out={};for(const [name,path]of Object.entries(paths)){out[name]={};for(const file of fs.readdirSync(path)){if(/^(LICENSE|COPYING|NOTICE|README)(\\.|$)/i.test(file)&&fs.statSync(path+'/'+file).isFile())out[name][file]=fs.readFileSync(path+'/'+file,'utf8');}}console.log(JSON.stringify(out));`;
  const notices=JSON.parse(cp.execFileSync('docker',['run','--rm','--network','none','--read-only','--cpus','1','--memory','128m','--pids-limit','64','--log-driver','none','--entrypoint',s.runtime,build.imageId,'-e',noticeCode,JSON.stringify(s.paths)],{encoding:'utf8',timeout:30000,maxBuffer:2*1024**2}));
  fs.writeFileSync(stage+'/'+s.key+'-PACKAGE-NOTICES.json',JSON.stringify(notices,null,2)+'\n');
 }
 for(const file of ['README.md','specs.mjs','build.mjs','check-libraries.mjs','libraries.cjs','check-app.mjs','candlr-native.cjs'])fs.copyFileSync(new URL('./'+file,import.meta.url),stage+'/'+file);
 fs.writeFileSync(stage+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),repository:'https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/patch-leaves-final',kind:'Addendum to unchanged upstream application/privacy source offers; dependency overlay only',applications:sources,packagePins:packages,upstreams:{'js-yaml':'https://github.com/nodeca/js-yaml/tree/4.3.2','source-map-js':'https://github.com/7rulnik/source-map-js/tree/1.2.2',sharp:'https://github.com/lovell/sharp/tree/v0.35.5','sharp-libvips':'https://github.com/lovell/sharp-libvips/tree/v1.3.4',DeGoog:'https://github.com/degoog-org/degoog',Candlr:'https://github.com/ellite/candlr',Penpot:'https://github.com/penpot/penpot/tree/2.18.3'},rebuild:'Fetch the existing upstream application source/privacy packaging first. This addendum documents the exact predecessor runtime and replaces only the pinned dependency archives; build.mjs validates integrity and configuration/application parity. Preserve package licenses. Each build receipt includes the registry tarball URL and exact archive hash. The operational build script refuses an unreviewed/new live predecessor: on another build machine review and adapt only those environment-specific path/container guards, retaining package pins and parity gates.',limits:'No user records, credentials, operator environment files, production reports or proprietary application source are included.'},null,2)+'\n');
 const archive=output+'/'+filename;cp.execFileSync('tar',['-czf',archive,'-C',stage,'.']);cp.execFileSync('tar',['-tzf',archive],{stdio:['ignore','ignore','pipe']});
 const receipt={date:new Date().toISOString(),filename,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};
 if(publish){for(const directory of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){assert(fs.statSync(directory).isDirectory());const destination=directory+'/'+filename;assert(!fs.existsSync(destination)||sha(fs.readFileSync(destination))===receipt.sha256,'Existing distinct offer must not be overwritten');fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);}receipt.published=true;}
 fs.writeFileSync(output+'/source-offer.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{fs.rmSync(stage,{recursive:true});}
