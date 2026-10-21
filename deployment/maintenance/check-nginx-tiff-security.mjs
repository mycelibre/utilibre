// Finite staging only. No Compose edits, production recreates or user-data writes.
// Optional artifact preparation reuses the previous release's exact image ledger.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,statfs,chmod} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const exec=promisify(execFile),root='/home/ubuntu/freetools';
const refresh=process.argv.includes('--library-refresh');
const old=refresh?'sha256:b374bb83a3bf4dbc64b4ed35013dc4276afbb5c601acce931ac989794548c68b':'sha256:15c994d10d6d78658721c3bcafff14cb281fba2a4bdf9d5ba92c416a472516e3';
const candidate=refresh?'utilibre-nginx:1.30.5-alpine-security-20261021':'utilibre-nginx:1.30.5-alpine-tiff-security-20261011';
const directory='/var/lib/utilibre-maintenance/'+(refresh?'nginx-libraries-20261021':'nginx-tiff-20261011');
const artifactCount=refresh?27:26;
const dockerfile='deployment/maintenance/Dockerfile.nginx-'+(refresh?'expat-x11':'tiff')+'-security';
const artifactsOnly=process.argv[2]==='stage-artifacts';
const artifacts=artifactsOnly||process.argv.includes('--artifacts');
const verifyOnly=process.argv.includes('--verify-only');
assert(['stage','stage-artifacts'].includes(process.argv[2]),'Only staging is implemented; no deployment');
assert(process.argv.slice(3).every(x=>['--artifacts','--verify-only','--library-refresh'].includes(x)),'Unexpected option');
assert(!verifyOnly||artifactsOnly,'Verify-only is limited to prepared artifacts');
process.umask(0o077);await mkdir(directory,{recursive:true,mode:0o700});
async function docker(args,timeout=120000){
 try{return (await exec('docker',args,{cwd:root,timeout,maxBuffer:16*1024**2,env:{...process.env,...(refresh?{DOCKER_BUILDKIT:'0'}:{})}})).stdout;}
 catch(e){await writeFile(directory+'/last-error.log',String(e.stderr||e.message),{mode:0o600});throw Error('Private diagnostic: '+directory+'/last-error.log');}
}
const sha=x=>createHash('sha256').update(x).digest('hex');
const context=refresh?directory+'/build-context':'deployment/maintenance';
if(refresh){
 await mkdir(context,{recursive:true,mode:0o700});
 for(const [name,hash]of [['libexpat-2.9.0-r0.apk','32b127f31e0a919110a18a7f0bb3780d8fb66ba4d8d61b2d301d633f0e319d0e'],['libx11-1.8.14-r0.apk','016efc189c6d566061ffe206ed0780e32686c1a8c832a3917d35d2c66d61a40f']]){
  let data;try{data=await readFile(context+'/'+name);}catch(e){assert.equal(e.code,'ENOENT');const r=await fetch('https://dl-cdn.alpinelinux.org/alpine/v3.24/main/x86_64/'+name,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok);data=Buffer.from(await r.arrayBuffer());}
  assert.equal(sha(data),hash);await writeFile(context+'/'+name,data,{mode:0o644});
 }
}
const ids=(await docker(['ps','-q'])).trim().split(/\s+/).filter(Boolean);
const live=JSON.parse(await docker(['inspect',...ids]));
const baseRows=live.filter(x=>x.Name.startsWith('/utilibre-')&&x.Image===old);
if(!artifactsOnly)assert.equal(baseRows.length,41,'Review changed shared-runtime scope');
const report={date:new Date().toISOString(),status:'running',deployed:false,packages:refresh?{libexpat:'2.9.0-r0',libx11:'1.8.14-r0'}:{tiff:'4.7.2-r0',zlib:'1.3.2-r1'},rows:[],routes:[]};
const reportFile=directory+(artifactsOnly?'/artifacts-stage.json':'/stage.json');
const prepared=verifyOnly?JSON.parse(await readFile(reportFile,'utf8')):null;
const save=()=>writeFile(reportFile,JSON.stringify(report,null,2)+'\n',{mode:0o600});
const imageId=async ref=>JSON.parse(await docker(['image','inspect',ref]))[0].Id;
const nativeOptions=x=>['--network','container:'+x.Name.slice(1),'--volumes-from',x.Name.slice(1)+':ro','--read-only','--tmpfs','/tmp:rw,size=32m,mode=1777','--user',x.Config.User||'101','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.5','--pids-limit','64','--log-driver','none'];
async function stageConfig(x,ref,assetRoot){
 assert(['101','101:101'].includes(x.Config.User),'Unexpected native identity');
 const labels=x.Config.Labels;
 assert(labels['com.docker.compose.project.working_dir'].startsWith(root+'/deployment/'));
 if(refresh){
  const before=JSON.parse(await docker(['image','inspect',x.Image]))[0],after=JSON.parse(await docker(['image','inspect',ref]))[0];
  assert.deepEqual(after.Config,before.Config,'Image runtime configuration changed');
  const inventory=async image=>new Map((await docker(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','96m','--cpus','.5','--log-driver','none','--entrypoint','apk',image,'list','--installed'])).trim().split('\n').map(l=>[l.split(' ')[0].replace(/-[0-9].*$/,''),l]));
  const a=await inventory(x.Image),b=await inventory(ref);assert.deepEqual([...a.keys()].sort(),[...b.keys()].sort(),'Package set changed');
  for(const [name,line]of a)if(!['libexpat','libx11'].includes(name))assert.equal(b.get(name),line,'Unrelated package changed: '+name);
 }
 const row={name:x.Name.slice(1),oldRef:x.Config.Image,oldImage:x.Image,newRef:ref,newImage:await imageId(ref),project:labels['com.docker.compose.project'],service:labels['com.docker.compose.service'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),nativeConfiguration:'pending'};
 assert(row.files.every(p=>p.startsWith(root+'/deployment/')));
 await docker(['run','--rm','--name','maintenance-nginx-tiff-config',...nativeOptions(x),'--entrypoint','nginx',ref,'-t']);
 row.nativeConfiguration='passed';
 if(assetRoot){
  assert(['/usr/share/nginx/html','/srv/app','/app','/srv/wallabag'].includes(assetRoot));
  const hash=async image=>(await docker(['run','--rm','--name','maintenance-nginx-tiff-hash','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.75','--entrypoint','sh',image,'-c',`cd ${assetRoot} && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`])).trim().split(/\s+/)[0];
  const before=await hash(x.Image),after=await hash(ref);assert.match(before,/^[a-f0-9]{64}$/);assert.equal(after,before,'Application bytes changed');row.assetRoot=assetRoot;row.assetSha256=before;
 }
 row.releaseMethod=['utilibre-trip','utilibre-unfurl','utilibre-13ft'].includes(row.project)?'native systemd supervisor restart; never standalone gateway recreate':row.name==='utilibre-wallabag-web-1'?'native Wallabag supervisor stop/recreate/start':'specific service Compose --no-deps after exact-pin review';
 report.rows.push(row);await save();console.log(`Native configuration passed: ${row.name}`);return row;
}
if(!artifactsOnly){
 const space=await statfs(directory);assert(space.bavail*space.bsize>=8*1024**3,'Preserve 8 GiB recovery floor');
 await docker(['build','--network','none','--pull=false','-f',dockerfile,'-t',candidate,context],180000);
 report.sharedImage=await imageId(candidate);
 for(const x of baseRows)await stageConfig(x,candidate);
}
if(artifacts){
 const paths=refresh?['reviewed-refresh']:['static-runtime','extra-runtime'],seen=new Map();
 for(const group of paths){
  const history=refresh?{rows:[...JSON.parse(await readFile(new URL('./nginx-artifacts-20261011.json',import.meta.url),'utf8')).rows.map(r=>({name:r.name,newImage:r.candidateImage,newRef:r.candidateRef,staticRoot:r.assetRoot})),{name:'utilibre-expanded-jupyterlite-1',newImage:'sha256:e255a33dd3ae47833eada017dad2adb9dfa8fd6761962aacf31a59cda5202ed4',newRef:'utilibre-jupyterlite:0.8.5-browser-security-20261011-p2',staticRoot:'/usr/share/nginx/html'}]}:JSON.parse(await readFile(`/var/lib/utilibre-maintenance/${group}-20261011/stage.json`,'utf8'));
  assert.equal(history.rows.length,refresh?27:group==='static-runtime'?18:8,'Changed artifact scope');
  for(const previous of history.rows){
   const x=live.find(x=>x.Name==='/'+previous.name);assert(x,'Missing exact artifact');assert.equal(x.Image,previous.newImage,'Artifact changed since reviewed release');
   const ref=previous.newRef+(refresh?'-libs20261021':'-tiff472');
   if(!seen.has(ref)){
    const space=await statfs(directory);assert(space.bavail*space.bsize>8*1024**3,'Preserve 8 GiB recovery floor');
    assert.equal(await imageId(previous.newRef),x.Image,'Base tag drift');
    if(verifyOnly){const p=prepared.rows.find(r=>r.name===previous.name);assert(p,'Missing prepared image');assert.equal(p.oldImage,x.Image);assert.equal(p.newImage,await imageId(ref),'Candidate changed since preparation');}
    else {
     const runtimeUser=JSON.parse(await docker(['image','inspect',x.Image]))[0].Config.User;
     assert(['101','101:101'].includes(runtimeUser));
     await docker(['build','--network','none','--pull=false','--build-arg','BASE='+x.Image,...(refresh?['--build-arg','RUNTIME_USER='+runtimeUser]:[]),'-f',dockerfile,'-t',ref,context],180000);
    }
    seen.set(ref,x.Image);
   }else assert.equal(seen.get(ref),x.Image,'Conflicting shared artifact');
   const assetRoot=previous.staticRoot||(group==='static-runtime'?'/usr/share/nginx/html':null);
   assert(assetRoot,'Every artifact requires an explicit reviewed application root');
   const row=await stageConfig(x,ref,assetRoot);assert.match(row.assetSha256,/^[a-f0-9]{64}$/,'Missing whole-application hash');
   row.url=previous.url;
   const curl=['exec',row.name,'curl','--silent','--show-error','--output','/dev/null','--max-time','15','--write-out','%{http_code}'];
   row.before=Number(await docker([...curl,...(row.name==='utilibre-binternet-onion-gateway-1'?['--unix-socket','/run/onion/http.sock','http://localhost/']:['http://127.0.0.1:8080/'])]));
   assert(row.before>=200&&row.before<=499,'Existing artifact endpoint unhealthy');await save();
  }
 }
}
// An alternate loopback listener shares only the existing network namespace;
// native mounts are read-only, /tmp is separate, and no public port is exposed.
const sample=live.find(x=>x.Name===(artifactsOnly?'/utilibre-toolbox-hatsh-1':'/utilibre-community-rallly-gateway-1'));
assert(sample);if(!artifactsOnly)assert.equal(sample.Image,old);
const probeImage=artifactsOnly?report.rows.find(x=>x.name===sample.Name.slice(1)).newRef:candidate;
const config=sample.Mounts.find(m=>m.Destination==='/etc/nginx/nginx.conf');
assert(config&&config.Source===root+(artifactsOnly?'/deployment/toolbox/nginx.conf':'/deployment/community/rallly-gateway.conf'));
const original=await readFile(config.Source,'utf8');
assert.equal((original.match(/listen 8080;/g)||[]).length,1,'Review alternate listener');
const probeConfig=directory+(artifactsOnly?'/artifact-probe-nginx.conf':'/probe-nginx.conf');
await writeFile(probeConfig,original.replace('listen 8080;','listen 127.0.0.1:38081;'),{mode:0o644});
await chmod(probeConfig,0o644); // Parent directory stays private; mount is read-only.
const probe=artifactsOnly?'maintenance-nginx-tiff-artifact-route':'maintenance-nginx-tiff-route';
function response(raw){
 const boundary=raw.indexOf('\r\n\r\n');assert(boundary>0);
 const lines=raw.slice(0,boundary).split('\r\n'),headers={};
 for(const line of lines.slice(1)){const i=line.indexOf(':');if(i>0)headers[line.slice(0,i).toLowerCase()]=line.slice(i+1).trim();}
 return {status:Number(lines[0].split(' ')[1]),headers,body:raw.slice(boundary+4)};
}
try{
 await docker(['run','-d','--name',probe,...nativeOptions(sample),'-v',probeConfig+':/etc/nginx/nginx.conf:ro','--entrypoint','nginx',probeImage,'-g','daemon off;']);
 await new Promise(r=>setTimeout(r,500));
 for(const path of artifactsOnly?['/','/.git/config']:['/login','/api/storage/','/api/auth/sign-up']){
  const request=async port=>response(await docker(['exec',probe,'curl','--silent','--show-error','--max-time','15','--include',`http://127.0.0.1:${port}${path}`]));
  const before=await request(8080),after=await request(38081);assert.equal(after.status,before.status);
  for(const name of ['content-type','referrer-policy','x-content-type-options','x-frame-options'])assert.equal(after.headers[name],before.headers[name],name);
  if(artifactsOnly){assert.equal(after.status,path==='/'?200:404);assert.equal(sha(after.body),sha(before.body));}
  else if(path==='/login'){assert.equal(after.status,200);assert(after.body.includes('Rallly'));assert(before.body.includes('Rallly'));}
  else{assert.equal(after.status,403);assert.equal(sha(after.body),sha(before.body));}
  report.routes.push({gateway:sample.Name.slice(1),path,status:after.status,securityHeadersEqual:true,bodyCheck:path==='/login'?'Both native login HTML documents contain Rallly':'Exact response-body hash'});
 }
 assert.equal(await readFile(config.Source,'utf8'),original,'Production configuration changed');
}finally{try{await docker(['rm','-f',probe]);}catch{}}
// Scan the shared runtime only. Artifact application dependencies remain under
// the separate full scanner; identical application bytes are not clearance.
if(!artifactsOnly){
const scanFile=directory+'/shared-scan.json';
await exec('/opt/utilibre/maintenance/bin/trivy',['image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--output',scanFile,candidate],{timeout:200000,maxBuffer:1024**2,env:{...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'2',GOMEMLIMIT:'1GiB'}});
const scan=JSON.parse(await readFile(scanFile,'utf8'));
assert(scan.Results.some(r=>r.Type==='alpine'&&r.Packages?.length>=60),'Incomplete shared runtime scan');
const findings=scan.Results.flatMap(r=>r.Vulnerabilities||[]);
report.sharedScan={image:await imageId(candidate),critical:findings.filter(v=>v.Severity==='CRITICAL').length,high:findings.filter(v=>v.Severity==='HIGH').length,total:findings.length};
assert.equal(report.sharedScan.image,report.sharedImage,'Candidate drift during staging');
assert.equal(report.sharedScan.critical+report.sharedScan.high,0,'Review remaining shared runtime findings');
}
if(artifacts){const checked=artifactsOnly?report.rows:report.rows.filter(r=>r.assetRoot);assert.equal(checked.length,artifactCount,'Incomplete artifact scope');assert(checked.every(r=>r.assetRoot&&/^[a-f0-9]{64}$/.test(r.assetSha256)),'Every artifact must have a complete application hash');}
report.status='passed';report.completedAt=new Date().toISOString();report.limits='Stage only. Representative alternate-loopback GET requests; no production recreation, user write or browser workflow. Native configuration checked for every selected runtime; artifact mode additionally hashes complete native application roots and checks existing endpoint status. Application dependencies require the separate full scanner.';await save();
console.log(JSON.stringify({status:report.status,deployed:false,configurations:report.rows.length,routeChecks:report.routes.length,image:report.sharedImage,report:reportFile}));
