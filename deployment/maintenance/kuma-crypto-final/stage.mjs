import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,base,baseRef,candidate,target,versions,sha,read,docker,inspect,limits} from './common.mjs';
process.umask(0o077);
assert(!fs.existsSync(root+'/stage.json'));assert.equal(inspect(baseRef).Id,base);assert.equal(inspect(target).Image,base);assert.equal(read(root+'/provenance.json').status,'passed');
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
const packages=read(root+'/packages.json'),dir=root+'/overlay';fs.mkdirSync(dir+'/packages',{recursive:true});for(const p of packages.records){assert.equal(sha(fs.readFileSync(root+'/output/'+p.file)),p.sha256);fs.copyFileSync(root+'/output/'+p.file,dir+'/packages/'+p.file);}
const before=inspect(base),here=new URL('.',import.meta.url).pathname;
docker('build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',candidate,dir);
const after=inspect(candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
const shell=(id,cmd)=>docker('run',...limits,'--user','0','--entrypoint','sh',id,'-ec',cmd);
const inventory=id=>shell(id,"dpkg-query -W -f='${binary:Package} ${Version}\\n'").split('\n').filter(line=>!Object.hasOwn(versions,line.split(' ')[0].split(':')[0]));assert.deepEqual(inventory(base),inventory(after.Id));
for(const[name,v]of Object.entries(versions))assert.equal(shell(after.Id,"dpkg-query -W -f='${Version}' "+name),v);assert.equal(shell(after.Id,'dpkg --audit'),'');
// Scope exclusions are package payload paths, not all Python or native libraries.
const excluded=['/usr/lib/python3/dist-packages/cryptography*','/usr/lib/python3/dist-packages/cffi*','/usr/lib/python3/dist-packages/_cffi_backend*','/usr/lib/python3/dist-packages/pycparser*','/usr/share/python3/dist/python3-cryptography',...Object.keys(versions).map(n=>'/usr/share/doc/'+n+'/*')];
const filter=excluded.map(p=>'! -path "'+p+'"').join(' '),hashes={};
const commands={runtime:'find /app /usr/local /usr/lib /usr/bin /usr/sbin /usr/share -type f '+filter+' -exec sha256sum {} + | sort | sha256sum',config:'find /etc -type f ! -path /etc/ld.so.cache ! -path /etc/hosts ! -path /etc/hostname ! -path /etc/resolv.conf -exec sha256sum {} + | sort | sha256sum',openssl:'sha256sum /usr/lib/x86_64-linux-gnu/libcrypto.so.3 /usr/lib/x86_64-linux-gnu/libssl.so.3'};
for(const[k,cmd]of Object.entries(commands)){hashes[k]=shell(base,cmd);assert.equal(shell(after.Id,cmd),hashes[k],k+' changed outside exact dependency update');}
assert.equal(shell(after.Id,'find /usr/lib/python3/dist-packages -path "*/cryptography/hazmat/bindings/_openssl*.so" -print'),'');assert.equal(shell(after.Id,'find /usr/lib/python3/dist-packages -maxdepth 1 -name "cryptography-38*" -print'),'');
const native={};for(const[id,key]of [[base,'baseline'],[after.Id,'candidate']]){const result=JSON.parse(docker('run',...limits,'--user','1000:1000','--mount','type=bind,src='+here+'native.py,dst=/tmp/native.py,readonly','--entrypoint','/usr/bin/python3',id,'-B','/tmp/native.py',...(key==='candidate'?['--candidate']:[])));assert(result.passed);native[key]=result;}
fs.writeFileSync(root+'/stage.json',JSON.stringify({schema:1,date:new Date().toISOString(),status:'passed',base,baseRef,candidate,image:after.Id,versions,packagesSha256:sha(fs.readFileSync(root+'/packages.json')),provenanceSha256:sha(fs.readFileSync(root+'/provenance.json')),configurationUnchanged:true,unrelatedPackagesUnchanged:true,priorRuntimeBytesUnchanged:true,oldCryptographyNativeBindingRemoved:true,systemOpenSSLUnchanged:true,hashes,native,productionChanged:false},null,2)+'\n');console.log(JSON.stringify({status:'passed',image:after.Id,versions,native}));
