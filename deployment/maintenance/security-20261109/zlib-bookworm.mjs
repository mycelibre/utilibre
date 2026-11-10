// Native same-branch repair; existing bounded package-overlay conventions.
// Preparation only. No Compose edits, live mounts, networking or queue changes.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{proveZlibBookworm}from'./zlib-bookworm-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261109/zlib-bookworm',read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=read(new URL('./zlib-bookworm-inputs.json',import.meta.url)),source=read(root+'/output/build.json');
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(r=>r.key===k)));
assert.equal(sha(fs.readFileSync(root+'/output/build.json')),inputs.sourceReceiptSha256);
const limits=['--rm','--hostname','utilibre-zlib-check','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--memory-swap','384m','--pids-limit','64','--log-driver','none','--ulimit','core=0'];
for(const key of keys){
 const s=inputs.rows.find(r=>r.key===key),dir=root+'/'+key;fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'));
 const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': isolated zlib preparation failed; evidence retained');}};
 const docker=(...a)=>run('docker',a),native=(im,exe,a=[])=>docker('run',...limits,'--entrypoint',exe,im,...a);
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 for(const name of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',name),s.base);
 const cfg=im=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',im)),old=cfg(s.base);
 const inv=im=>Object.fromEntries(native(im,'dpkg-query',['-W','-f=${Package}\t${Version}\n']).split('\n').map(l=>l.split('\t'))),before=inv(s.base);
 assert.deepEqual(s.packages,{'zlib1g':'1:1.2.13.dfsg-1'});assert.equal(before.zlib1g,s.installed);
 const scope='for d in /app /opt /usr/local /usr/src /priviblur /upstream /grist /var/www /etc /usr/lib /usr/bin /usr/sbin /lib; do if test -d "$d"; then find "$d" -type f ! -path /lib/x86_64-linux-gnu/libz.so.1.2.13 ! -path /usr/lib/x86_64-linux-gnu/libz.so.1.2.13 ! -path /etc/ld.so.cache -exec sha256sum {} +; fi; done | LC_ALL=C sort | sha256sum';
 const fingerprint=native(s.base,'sh',['-ec',scope]).split(' ')[0];
 const p=source.packages.zlib1g;assert.equal(sha(fs.readFileSync(root+'/output/'+p.file)),p.sha256);
 const context=dir+'/context';fs.mkdirSync(context);fs.copyFileSync(root+'/output/'+p.file,context+'/zlib.deb');fs.chmodSync(context+'/zlib.deb',0o644);
 assert(/^[A-Za-z0-9_:.-]*$/.test(old.User));const rootUser=['','root','0'].includes(old.User);
 fs.writeFileSync(context+'/Dockerfile',`FROM ${s.base}\n${rootUser?'':'USER 0\n'}COPY zlib.deb /tmp/utilibre-zlib.deb\nRUN dpkg --force-confold -i /tmp/utilibre-zlib.deb && test -z "$(dpkg --audit)" && rm /tmp/utilibre-zlib.deb\n${rootUser?'':'USER '+old.User+'\n'}`);
 run('docker',['build','--pull=false','--network','none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.deepEqual(cfg(imageId),old);const after=inv(imageId);assert.equal(after.zlib1g,s.version);assert.deepEqual({...after,zlib1g:before.zlib1g},before);
 assert.equal(native(imageId,'sh',['-ec',scope]).split(' ')[0],fingerprint,'Unrelated code/configuration changed');
 for(const[f,h]of Object.entries(source.fixtures))assert.equal(sha(fs.readFileSync(root+'/fixture/'+f)),h);
 const rows=[],abi=[];
 for(const im of [s.base,imageId]){
  const normal=docker('run',...limits,'--user','65534:65534','-v',root+'/fixture:/fixture:ro','--entrypoint','/fixture/normal',im);assert.equal(normal,'ZLIB_NATIVE_PASSED checks=7');
  const bytes=cp.execFileSync('docker',['run',...limits,'--entrypoint','cat',im,'/lib/x86_64-linux-gnu/libz.so.1'],{timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}),file=dir+'/'+(im===s.base?'before':'after')+'.so';fs.writeFileSync(file,bytes);
  const symbols=run('readelf',['--dyn-syms','--wide',file]).split('\n').map(l=>l.trim().split(/\s+/)).filter(f=>['GLOBAL','WEAK'].includes(f[4])&&f[6]!=='UND').map(f=>f[7]).sort();assert(symbols.length>80);
  const needed=run('readelf',['-d',file]).split('\n').filter(l=>/\((?:SONAME|NEEDED)\)/.test(l)).map(l=>l.slice(l.indexOf('('))).sort();abi.push({imageId:im,sha256:sha(bytes),symbols,needed});rows.push({imageId:im,normalChecks:7,passed:true});
 }
 assert.deepEqual(abi[0].symbols,abi[1].symbols);assert.deepEqual(abi[0].needed,abi[1].needed);
 const b={...s,date:new Date().toISOString(),imageId,passed:true,package:p,sourceReceiptSha256:inputs.sourceReceiptSha256,configurationUnchanged:true,unrelatedPackagesUnchanged:true,applicationSha256:fingerprint,librarySha256:abi[1].sha256,deployed:false};
 const n={date:b.date,base:s.base,imageId,passed:true,rows,abi,abiPreserved:true,neededPreserved:true,network:'none',fixtures:source.fixtures,sourceRegressionEvidence:'retained native build receipt; not rerun in each application'};
 fs.writeFileSync(dir+'/stage.json',JSON.stringify(b,null,2)+'\n');
 run('python3',[new URL('./zlib-bookworm-scope.py',import.meta.url).pathname,key],{timeout:600000});
 const scopeProof=read(dir+'/scope.json');assert(scopeProof.passed&&scopeProof.base===s.base&&scopeProof.imageId===imageId);b.scopeSha256=sha(fs.readFileSync(dir+'/scope.json'));b.fullImageScopeVerified=true;proveZlibBookworm(inputs,s,b,n,source);
 fs.writeFileSync(dir+'/build.json',JSON.stringify(b,null,2)+'\n');fs.writeFileSync(dir+'/native.json',JSON.stringify(n,null,2)+'\n');console.log(key+': ordinary gzip, ABI, exact package and full-image scope checks passed; native-source evidence retained separately');
}
