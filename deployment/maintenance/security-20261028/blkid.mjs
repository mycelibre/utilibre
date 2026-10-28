// Exact single-library overlay; no mounts, device access or version-only waiver.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/blkid';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const specs=read(here+'blkid-inputs.json'),proof=read(root+'/native.json'),source=read(here+'blkid-source.json');
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.rows.some(s=>s.key===k)));
const library=root+'/output-verified/libblkid-after.so',fixture=root+'/output-verified/blkid-native';
assert(proof.nativePassed&&proof.nativeCases===14&&proof.upstreamSummary===225&&proof.upstreamSkippedLines===213);
assert.equal(sha(fs.readFileSync(library)),proof.librarySha256);assert.equal(sha(fs.readFileSync(fixture)),proof.fixtureSha256);
assert.equal(sha(fs.readFileSync(here+'blkid-ebr.patch')),source.patchSha256);assert.equal(proof.patchSha256,source.patchSha256);
for(const key of keys){
 const s=specs.rows.find(s=>s.key===key),dir=root+'/'+key;fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'));
 const run=(p,a,opts={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...opts}).trim();}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': bounded candidate check failed; evidence retained');}};
 const docker=(...a)=>run('docker',a),config=id=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',id));
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 assert.equal(docker('image','inspect','--format','{{.Id}}',s.oldRef),s.base);for(const name of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',name),s.base);
 const context=dir+'/context';fs.mkdirSync(context,{recursive:true});fs.copyFileSync(library,context+'/libblkid.so.1.1.0');
 const old=docker('create','--entrypoint','/bin/true',s.base);try{docker('cp',old+':'+s.library,dir+'/before.so');}finally{docker('rm',old);}
 const symbols=p=>run('readelf',['--dyn-syms','--wide',p]).split('\n').map(l=>l.trim().split(/\s+/)).filter(v=>['GLOBAL','WEAK'].includes(v[4])&&v[5]==='DEFAULT'&&v[6]!=='UND').map(v=>v[3]+':'+v[7].replace('@@','@')).sort();
 const before=symbols(dir+'/before.so'),after=symbols(library);assert(before.length>0);assert.deepEqual(after,before,'Public ABI drift');
 const needed=p=>run('readelf',['-d',p]).split('\n').filter(l=>/SONAME|NEEDED/.test(l)).map(l=>l.slice(l.indexOf('(')));
 assert.deepEqual(needed(library),needed(dir+'/before.so'));assert(!/GLIBC_2\.(?:3[7-9]|[4-9][0-9])\b/.test(run('readelf',['--version-info',library])));
 fs.writeFileSync(context+'/Dockerfile','FROM '+s.oldRef+'\nCOPY --chmod=644 libblkid.so.1.1.0 '+s.library+'\n');
 docker('build','--network','none','--pull=false','-t',s.candidate,context);
 const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.deepEqual(config(imageId),config(s.base));
 const rows=[];
 for(const [id,state]of [[s.base,'before'],[imageId,'after']]){
  const output=docker('run','--rm','--network','none','--read-only','--user','65534:65534','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.5','--pids-limit','32','--log-driver','none','--tmpfs','/tmp:rw,size=8m','-v',fixture+':/fixture:ro','--entrypoint','/fixture',id,state);
  assert.equal(output,'BLKID_14_NATIVE_CASES_PASSED');rows.push({imageId:id,state,checks:14,passed:true});
 }
 const b={...s,date:new Date().toISOString(),imageId,passed:true,configurationUnchanged:true,changedFiles:[s.library],librarySha256:proof.librarySha256,originalLibrarySha256:sha(fs.readFileSync(dir+'/before.so')),abiSymbols:before.length,source,native:{passed:true,imageId,rows,regularFilesOnly:true,network:false},packageMetadataPreserved:true,deployed:false};
 fs.writeFileSync(dir+'/build.json',JSON.stringify(b,null,2)+'\n');console.log(key+': native regression fixed, legitimate parsing and ABI preserved');
}
