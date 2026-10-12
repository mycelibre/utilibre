// Offline native-library overlay only. Root owns the separately gated release.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,spec,here,sha,read,run,docker,inspect,limits} from './common.mjs';
process.umask(0o077);
assert(!fs.existsSync(root+'/stage.json'));const n=read(root+'/native-build.json');assert.equal(n.status,'passed');
assert.equal(n.buildLogSha256,sha(fs.readFileSync(root+'/build.log')));assert(n.serialFullBuildAndTests&&n.nativeCompiledAgainstOriginalHeaders);
assert.equal(inspect(spec.baseRef).Id,spec.base);assert.equal(inspect(spec.container).Image,spec.base,'Rebase rather than overwrite intervening live fixes');
assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>=8*1024**3);
const context=root+'/overlay';fs.mkdirSync(context+'/packages',{recursive:true});
for(const pkg of spec.packages){const file=pkg+'_'+spec.version+'_amd64.deb',bytes=fs.readFileSync(root+'/output/'+file);assert.equal(sha(bytes),n.files[file].sha256);assert.equal(run('dpkg-deb',['-f',root+'/output/'+file,'Package']),pkg);assert.equal(run('dpkg-deb',['-f',root+'/output/'+file,'Version']),spec.version);fs.writeFileSync(context+'/packages/'+file,bytes);}
const before=inspect(spec.base);
fs.writeFileSync(root+'/stage.log',docker('build','--pull=false','--network=none','--memory','384m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+spec.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',spec.candidate,context));
const after=inspect(spec.candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
const shell=(id,cmd)=>docker('run',...limits,'--user','0','--entrypoint','sh',id,'-ec',cmd);
const inventory=id=>shell(id,"dpkg-query -W -f='${Package} ${Version}\\n'").split('\n').filter(l=>!spec.packages.some(p=>l.startsWith(p+' '))).sort();
assert.deepEqual(inventory(after.Id),inventory(spec.base));assert.equal(shell(after.Id,'dpkg --audit'),'');
for(const pkg of spec.packages){assert.equal(shell(spec.base,"dpkg-query -W -f='${Version}' "+pkg),'1.10.8+repack1-1');assert.equal(shell(after.Id,"dpkg-query -W -f='${Version}' "+pkg),spec.version);}
const commands={runtime:'find /usr/local /usr/lib /usr/share/postgresql -type f ! -name "libhdf5_serial.so*" ! -name "libhdf5_serial_hl.so*" -exec sha256sum {} + | sort | sha256sum',config:'find /etc -type f ! -path /etc/ld.so.cache ! -path /etc/hosts ! -path /etc/hostname ! -path /etc/resolv.conf -exec sha256sum {} + | sort | sha256sum'};
const hashes={};for(const[key,cmd]of Object.entries(commands)){hashes[key]=shell(spec.base,cmd);assert.equal(shell(after.Id,cmd),hashes[key],key+' changed');}
function abi(image,label){
 const out=root+'/abi/'+label;fs.mkdirSync(out,{recursive:true});const cid=docker('create','--network','none','--entrypoint','true',image);
 try{for(const f of spec.libraries)docker('cp',cid+':/usr/lib/x86_64-linux-gnu/'+f,out+'/'+f);}finally{docker('rm','-v',cid);}
 return Object.fromEntries(spec.libraries.map(f=>{const path=out+'/'+f,dynamic=run('readelf',['-d',path]),symbols=run('nm',['-D','--defined-only','--format=posix',path]).split('\n').map(l=>l.split(/\s+/).slice(0,2).join(' ')).sort();assert(!/\((?:RPATH|RUNPATH)\)/.test(dynamic));return[f,{sha256:sha(fs.readFileSync(path)),symbols,soname:dynamic.match(/SONAME.*\[([^\]]+)\]/)[1],needed:[...dynamic.matchAll(/NEEDED.*\[([^\]]+)\]/g)].map(m=>m[1]).sort()}];}));
}
const oldAbi=abi(spec.base,'old'),newAbi=abi(after.Id,'new');for(const f of spec.libraries)for(const key of ['symbols','soname','needed'])assert.deepEqual(newAbi[f][key],oldAbi[f][key],f+' '+key+' drift');
const native=id=>docker('run',...limits,'--user','0','--mount','type=bind,src='+root+'/output/native,dst=/check,readonly','--entrypoint','/check',id);
for(const id of [spec.base,after.Id])assert.equal(native(id),'HDF5_OLD_HEADER_CHUNK_DEFLATE_HL_EXTEND_NETCDF_GDAL_PASSED');
const record={schema:1,date:new Date().toISOString(),status:'passed',candidate:spec.candidate,image:after.Id,base:spec.base,baseRef:spec.baseRef,version:spec.version,nativeSha256:sha(fs.readFileSync(root+'/native-build.json')),configurationUnchanged:true,unrelatedPackagesUnchanged:true,priorRuntimeBytesUnchanged:true,oldHeaderNativeRoundtrips:true,oldAbi,newAbi,hashes,productionChanged:false};
fs.writeFileSync(root+'/stage.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:'passed',image:after.Id,version:spec.version,exports:spec.libraries.map(f=>newAbi[f].symbols.length),productionChanged:false}));
