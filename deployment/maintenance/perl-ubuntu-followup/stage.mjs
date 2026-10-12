import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {unrelatedPackages,packages,version} from './policy.mjs';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,dir='/var/lib/utilibre-maintenance/perl-ubuntu-followup-20261012',spec=JSON.parse(fs.readFileSync(here+'spec.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const docker=(...a)=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:32*1024**2,env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(dir+'/stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Isolated Perl stage failed; private diagnostics retained');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0];
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);assert.equal(inspect(spec.baseRef).Id,spec.base);assert.equal(inspect(spec.container).Image,spec.base);
cp.execFileSync(process.execPath,[here+'verify-input.mjs'],{stdio:'pipe'});const inputs=JSON.parse(fs.readFileSync(dir+'/inputs.json'));assert(inputs.passed);
fs.mkdirSync(dir+'/context/packages',{recursive:true});for(const p of inputs.packages)fs.copyFileSync(dir+'/input/'+p.file,dir+'/context/packages/'+p.file);
const before=inspect(spec.base);docker('build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+spec.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',spec.candidate,dir+'/context');
const after=inspect(spec.candidate),normalize=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(normalize(after.Config),normalize(before.Config));
const limits=['--rm','--hostname','utilibre-perl-fixture','--network','none','--read-only','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges:true','--memory','256m','--cpus','1','--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777'];
const run=(image,command)=>docker('run',...limits,'--mount','type=bind,src='+here+'preserve.sh,dst=/preserve.sh,readonly','--entrypoint','sh',image,'-ec',command);
const inventory=image=>run(image,'dpkg-query -W -f=\'${binary:Package}=${Version}\\n\'');unrelatedPackages(inventory(spec.base),inventory(after.Id));
assert.equal(run(after.Id,'dpkg --audit'),'');
const omittedDocs=run(after.Id,'dpkg -V '+packages.join(' '));assert.equal(omittedDocs,run(spec.base,'dpkg -V '+packages.join(' ')),'Changed dpkg verification omissions');
assert(omittedDocs.split('\n').every(l=>/^missing +\/usr\/share\/(?:man|doc)\//.test(l)),'Only original image documentation omissions are permitted');
const preservation=sha(run(spec.base,'sh /preserve.sh'));assert.equal(sha(run(after.Id,'sh /preserve.sh')),preservation);
const runtimeConfig=image=>run(image,"perl -MConfig -e 'print join(qq(\\n),map {qq($_=$Config{$_})} qw(version archname api_versionstring useithreads use64bitint use64bitall ptrsize ivsize byteorder));'");assert.equal(runtimeConfig(after.Id),runtimeConfig(spec.base));
const files=['/usr/bin/perl','/usr/lib/x86_64-linux-gnu/libperl.so.5.38.2','/usr/share/perl/5.38.2/Archive/Tar.pm'];const payloads={};for(const image of [spec.base,after.Id])payloads[image]=Object.fromEntries(files.map(p=>[p,run(image,'sha256sum '+p).split(/\s+/)[0]]));
const abi={};for(const [key,image]of [['old',spec.base],['new',after.Id]]){
 const name='maintenance-perl-abi-'+key;docker('create','--name',name,image);try{docker('cp',name+':/usr/lib/x86_64-linux-gnu/libperl.so.5.38.2',dir+'/'+key+'-libperl.so');}finally{docker('rm','-v',name);}
 const binary=dir+'/'+key+'-libperl.so';const symbols=cp.execFileSync('nm',['-D','--defined-only',binary],{encoding:'utf8'}).trim().split('\n').map(l=>l.trim().split(/\s+/).at(-1)).sort();const needed=cp.execFileSync('readelf',['-d',binary],{encoding:'utf8'}).split('\n').filter(l=>l.includes('(NEEDED)')||l.includes('(SONAME)')).map(l=>l.match(/\[([^\]]+)\]/)?.[1]).sort();abi[key]={symbols,needed};
}assert(abi.old.symbols.length>100);assert(abi.old.symbols.every(s=>abi.new.symbols.includes(s)));assert.deepEqual(abi.old.needed,abi.new.needed);
const report={...spec,date:new Date().toISOString(),passed:true,imageId:after.Id,addedImageBytes:after.Size-before.Size,configurationUnchanged:true,unrelatedPackageAndPayloadsUnchanged:true,preservationSha256:preservation,nativeVersion:version,packages:inputs.packages,inputProofSha256:sha(fs.readFileSync(dir+'/inputs.json')),payloads,abi:{symbolsPreserved:abi.old.symbols.length,sameSonameAndNeeded:true,needed:abi.new.needed},perlConfiguration:runtimeConfig(after.Id)};
fs.writeFileSync(dir+'/build.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({imageId:after.Id,addedImageBytes:report.addedImageBytes,passed:true}));
