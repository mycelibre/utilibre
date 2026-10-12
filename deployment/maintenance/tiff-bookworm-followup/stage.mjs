import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,version,oldVersion,packageName,packageSha256,sha,read,docker,limits,inspect,candidate} from './common.mjs';
process.umask(0o077);
export const baseRef='utilibre-gathio-documentdb:openldap-security-20261012',base='sha256:b59cabd35be046ddfa87d078cfc7da45a25d7a9240bd65b4f0a517dcdbb8c3e2';
if(process.argv[1]===new URL(import.meta.url).pathname){
 assert(!fs.existsSync(root+'/stage.json'));assert.equal(inspect(baseRef).Id,base);
 const native=read(root+'/native.json');assert.equal(native.status,'passed');assert.equal(native.packageSha256,packageSha256);assert.equal(native.upstream.PASS,109);
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
 const context=root+'/overlay';fs.mkdirSync(context+'/packages',{recursive:true});
 const deb=fs.readFileSync(root+'/output/'+packageName);assert.equal(sha(deb),packageSha256);fs.writeFileSync(context+'/packages/'+packageName,deb);
 const before=inspect(base),here=new URL('.',import.meta.url).pathname;
 docker('build','--pull=false','--network=none','--memory','384m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',candidate,context);
 const after=inspect(candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
 const shell=(id,cmd)=>docker('run',...limits,'--user','0','--entrypoint','sh',id,'-ec',cmd);
 const inventory=id=>shell(id,"dpkg-query -W -f='${binary:Package} ${Version}\\n'").split('\n').filter(line=>!line.startsWith('libtiff6:amd64 '));
 assert.deepEqual(inventory(after.Id),inventory(base));assert.equal(shell(base,"dpkg-query -W -f='${Version}' libtiff6"),oldVersion);assert.equal(shell(after.Id,"dpkg-query -W -f='${Version}' libtiff6"),version);assert.equal(shell(after.Id,'dpkg --audit'),'');
 const commands={runtime:'find /usr/local /usr/lib /usr/share/postgresql -type f ! -name "libtiff.so.6*" -exec sha256sum {} + | sort | sha256sum',config:'find /etc -type f ! -path /etc/ld.so.cache ! -path /etc/hosts ! -path /etc/hostname ! -path /etc/resolv.conf -exec sha256sum {} + | sort | sha256sum'};
 const hashes={};for(const [key,cmd]of Object.entries(commands)){hashes[key]=shell(base,cmd);assert.equal(shell(after.Id,cmd),hashes[key],key+' changed');}
 assert.equal(shell(after.Id,'sha256sum '+native.libraryPath).split(/\s/)[0],native.librarySha256);
 shell(after.Id,'for tool in tiffcrop tiff2pdf tiff2ps tiffmedian thumbnail tiffdither; do if command -v "$tool"; then exit 1; fi; done');
 const record={schema:1,date:new Date().toISOString(),status:'passed',candidate,image:after.Id,baseRef,base,version,packageSha256,nativeSha256:sha(fs.readFileSync(root+'/native.json')),configurationUnchanged:true,unrelatedPackagesUnchanged:true,priorRuntimeBytesUnchanged:true,hashes,productionChanged:false};
 fs.writeFileSync(root+'/stage.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:'passed',candidate,image:after.Id,base,version,productionChanged:false}));
}
