import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,version,oldVersion,names,sha,read,docker,limits,inspect,candidate,base,baseRef} from './common.mjs';
process.umask(0o077);
assert(!fs.existsSync(root+'/stage.json'));assert.equal(inspect(baseRef).Id,base);
const native=read(root+'/native.json');assert.equal(native.status,'passed');assert.equal(native.version,version);
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
const context=root+'/overlay';fs.mkdirSync(context+'/packages',{recursive:true});
for(const name of names){const file=name+'_'+version+'_amd64.deb',deb=fs.readFileSync(root+'/output/'+file);assert.equal(sha(deb),native.packages[file]);fs.writeFileSync(context+'/packages/'+file,deb);}
const before=inspect(base),here=new URL('.',import.meta.url).pathname;
docker('build','--pull=false','--network=none','--memory','256m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',candidate,context);
const after=inspect(candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
const shell=(id,cmd)=>docker('run',...limits,'--user','0','--entrypoint','sh',id,'-ec',cmd);
const inventory=id=>shell(id,"dpkg-query -W -f='${binary:Package} ${Version}\\n'").split('\n').filter(line=>!names.includes(line.split(' ')[0].split(':')[0]));
assert.deepEqual(inventory(after.Id),inventory(base));for(const name of names){assert.equal(shell(base,"dpkg-query -W -f='${Version}' "+name),oldVersion);assert.equal(shell(after.Id,"dpkg-query -W -f='${Version}' "+name),version);}assert.equal(shell(after.Id,'dpkg --audit'),'');
const commands={runtime:'find /usr /lib -type f ! -path "/usr/lib/x86_64-linux-gnu/libbson-1.0.so.*" ! -path "/usr/lib/x86_64-linux-gnu/libmongoc-1.0.so.*" ! -path "/usr/share/doc/libbson-1.0-0t64/*" ! -path "/usr/share/doc/libmongoc-1.0-0t64/*" -exec sha256sum {} + | sort | sha256sum',config:'find /etc -type f ! -path /etc/ld.so.cache ! -path /etc/hosts ! -path /etc/hostname ! -path /etc/resolv.conf -exec sha256sum {} + | sort | sha256sum',coturn:'sha256sum /usr/bin/turnserver'};
const hashes={};for(const [key,cmd]of Object.entries(commands)){hashes[key]=shell(base,cmd);assert.equal(shell(after.Id,cmd),hashes[key],key+' changed');}
for(const row of native.libraries)assert.equal(shell(after.Id,'sha256sum '+row.path).split(/\s/)[0],row.sha256);
fs.writeFileSync(root+'/stage.json',JSON.stringify({schema:1,date:new Date().toISOString(),status:'passed',candidate,image:after.Id,baseRef,base,version,packages:native.packages,nativeSha256:sha(fs.readFileSync(root+'/native.json')),configurationUnchanged:true,unrelatedPackagesUnchanged:true,priorRuntimeBytesUnchanged:true,hashes,productionChanged:false},null,2)+'\n');
console.log(JSON.stringify({status:'passed',candidate,image:after.Id,base,version,productionChanged:false}));
