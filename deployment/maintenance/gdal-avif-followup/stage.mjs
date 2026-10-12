import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,version,oldVersion,packageName,packageSha256,sha,read,run,docker,limits,inspect,candidate,base,baseRef,library} from './common.mjs';
import {verifyGdalAbi} from '../geospatial-followup/gdal-policy.mjs';
process.umask(0o077);assert(!fs.existsSync(root+'/stage.json'));assert.equal(inspect(baseRef).Id,base);
const source=read(root+'/source.json');assert.equal(source.status,'passed');assert(source.completeAppliedSourceComparison&&source.originalHeadersUnchanged);assert.equal(source.priorSecurityFiles.length,6);
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
const context=root+'/overlay';fs.mkdirSync(context+'/packages',{recursive:true});
const deb=fs.readFileSync(root+'/output/'+packageName);assert.equal(sha(deb),packageSha256);fs.writeFileSync(context+'/packages/'+packageName,deb);
const before=inspect(base),here=new URL('.',import.meta.url).pathname;
docker('build','--pull=false','--network=none','--memory','384m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',candidate,context);
const after=inspect(candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
const shell=(id,cmd)=>docker('run',...limits,'--user','0','--entrypoint','sh',id,'-ec',cmd);
const inventory=id=>shell(id,"dpkg-query -W -f='${binary:Package} ${Version}\\n'").split('\n').filter(line=>!line.startsWith('libgdal32 '));
assert.deepEqual(inventory(after.Id),inventory(base));assert.equal(shell(base,"dpkg-query -W -f='${Version}' libgdal32"),oldVersion);assert.equal(shell(after.Id,"dpkg-query -W -f='${Version}' libgdal32"),version);assert.equal(shell(after.Id,'dpkg --audit'),'');
const commands={runtime:'find /usr/local /usr/lib /usr/share/postgresql -type f ! -name "libgdal.so.32*" -exec sha256sum {} + | sort | sha256sum',config:'find /etc -type f ! -path /etc/ld.so.cache ! -path /etc/hosts ! -path /etc/hostname ! -path /etc/resolv.conf -exec sha256sum {} + | sort | sha256sum'};
const hashes={};for(const [key,cmd]of Object.entries(commands)){hashes[key]=shell(base,cmd);assert.equal(shell(after.Id,cmd),hashes[key],key+' changed');}
const abi=[];for(const [label,id]of [['old',base],['new',after.Id]]){
 const name='maintenance-gdal-avif-elf-'+label,file=root+'/gdal-'+label+'.so';docker('create','--name',name,'--entrypoint','true',id);
 try{docker('cp',name+':'+library,file);}finally{docker('rm',name);}
 const h=run('readelf',['-h',file]),d=run('readelf',['-d',file]),symbols=run('readelf',['--dyn-syms','--wide',file]);
 abi.push({sha256:sha(fs.readFileSync(file)),class:h.match(/Class:\s+(\S+)/)[1],machine:h.match(/Machine:\s+(.+)/)[1],soname:d.match(/SONAME.*\[([^\]]+)\]/)[1],needed:[...d.matchAll(/NEEDED.*\[([^\]]+)\]/g)].map(x=>x[1]).sort(),exports:symbols.split('\n').filter(l=>/\bGLOBAL\s+DEFAULT\s+\d+\s+/.test(l)).map(l=>l.trim().split(/\s+/).at(-1)).sort()});
}
verifyGdalAbi(abi[0],abi[1]);assert(abi[1].needed.includes('libcurl-gnutls.so.4'));assert.equal(abi[1].exports.length,5935);
const record={schema:1,date:new Date().toISOString(),status:'passed',candidate,image:after.Id,baseRef,base,version,packageSha256,sourceSha256:sha(fs.readFileSync(root+'/source.json')),configurationUnchanged:true,unrelatedPackagesUnchanged:true,priorRuntimeBytesUnchanged:true,hashes,library:{path:library,oldSha256:abi[0].sha256,sha256:abi[1].sha256,exports:abi[1].exports.length,needed:abi[1].needed,nativeAbiUnchanged:true},productionChanged:false};
fs.writeFileSync(root+'/stage.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:'passed',candidate,image:after.Id,base,version,library:record.library,productionChanged:false}));
