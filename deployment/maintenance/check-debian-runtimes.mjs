// Finite reviewed vendor-backport batch. No app version, data schema, permission
// or authentication changes. Stage all candidates before editing Compose pins.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,copyFileSync,statfsSync} from 'node:fs';
const root='/home/ubuntu/freetools',dir='/var/lib/utilibre-maintenance/debian-runtimes-20261011';
mkdirSync(dir,{recursive:true,mode:0o700});
const selected=[
 ['utilibre-expanded-actual-1','actual','/app','1000:1000'],
 ['utilibre-community-rallly-1','rallly','/app','nextjs'],
 ['utilibre-expanded-resume-1','resume','/app','1000:1000'],
 ['utilibre-linkding-linkding-1','linkding','/etc/linkding','33:33'],
 ['utilibre-kitchenowl-app-1','kitchenowl','/usr/src/kitchenowl','1000:1000'],
 ['utilibre-pack-cryptpad-cryptpad-1','cryptpad-node',null,'4001:4001'],
];
function docker(args,timeout=120000){try{return execFileSync('docker',args,{encoding:'utf8',timeout,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});}catch(e){writeFileSync(dir+'/last-error.log',String(e.stderr||'Docker operation failed'),{mode:0o600});throw Error('Private batch diagnostic: '+dir+'/last-error.log');}}
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
function appHash(image,path){return docker(['run','--rm','--network','none','--read-only','--memory','128m','--cpus','.5','--entrypoint','sh',image,'-c',`cd ${path} && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`]).trim().split(/\s+/)[0];}
const envFiles={rallly:root+'/deployment/community/.env.rallly',actual:root+'/deployment/expanded/.env',resume:root+'/deployment/expanded/.env'};
const compose=r=>['compose','--profile','*','--project-directory',r.cwd,'-p',r.project,...(envFiles[r.key]?['--env-file',envFiles[r.key]]:[]),...r.files.flatMap(f=>['-f',f])];
const pause=()=>new Promise(r=>setTimeout(r,1000));
if(process.argv[2]==='stage'){
 const rows=[],files={};
 for(const [name,key,path,user] of selected){
  const free=statfsSync(dir);assert(free.bavail*free.bsize>8*1024**3,'8 GiB floor');
  const x=inspect(name),labels=x.Config.Labels;
  assert.equal(x.Config.User,user);assert(!x.Config.Image.includes('debian-security-20261011'));
  const r={name,key,oldImage:x.Image,oldRef:x.Config.Image,newRef:`utilibre-${key}:debian-security-20261011`,user,path,cwd:labels['com.docker.compose.project.working_dir'],project:labels['com.docker.compose.project'],files:labels['com.docker.compose.project.config_files'].split(','),service:labels['com.docker.compose.service']};
  assert(r.files.every(f=>f.startsWith(root+'/deployment/')));
  for(const f of r.files)if(!files[f]){const b=dir+'/compose-'+Object.keys(files).length+'.yaml';copyFileSync(f,b);files[f]=b;}
  assert.equal(JSON.parse(docker(['image','inspect',r.oldRef]))[0].Id,r.oldImage);
  docker(['build','--build-arg','ARTIFACT_IMAGE='+r.oldRef,'--build-arg','RUNTIME_USER='+user,'-f','deployment/maintenance/Dockerfile.debian-runtime','-t',r.newRef,'deployment/maintenance'],600000);
  r.newImage=JSON.parse(docker(['image','inspect',r.newRef]))[0].Id;
  if(path){r.applicationSha256=appHash(r.oldRef,path);assert.match(r.applicationSha256,/^[a-f0-9]{64}$/);assert.equal(appHash(r.newRef,path),r.applicationSha256);}
  // Runtime import/startup checks use no mounted user data and no network.
  const command=['linkding','kitchenowl'].includes(key)?['python','-c','import ssl,sqlite3; print(ssl.OPENSSL_VERSION)']:['node','-p','process.version'];
  r.runtime=docker(['run','--rm','--network','none','--read-only','--memory','128m','--cpus','.5','--entrypoint',command[0],r.newRef,...command.slice(1)]).trim();
  const pkg=docker(['run','--rm','--network','none','--entrypoint','dpkg-query',r.newRef,'-W','-f','${Package} ${Version}\n']);writeFileSync(dir+'/'+key+'-packages.txt',pkg,{mode:0o600});
  rows.push(r);writeFileSync(dir+'/stage.json',JSON.stringify({date:new Date().toISOString(),rows,files},null,2)+'\n',{mode:0o600});console.log(key+': vendor update built; unchanged application bytes and runtime startup passed.');
 }
}else if(process.argv[2]==='apply'){
 const stage=JSON.parse(readFileSync(dir+'/stage.json'));assert.equal(stage.rows.length,selected.length);assert(Date.now()-Date.parse(stage.date)<86400000);
 for(const r of stage.rows){
  assert([r.oldImage,r.newImage].includes(inspect(r.name).Image),'Deployment drift');
  const cfg=JSON.parse(docker([...compose(r),'config','--format','json']));assert.equal(cfg.services[r.service].image,r.newRef);
  assert(!JSON.stringify(cfg.services[r.service].environment||{}).includes('UNCONFIGURED'),'Refuse missing native environment');
  docker([...compose(r),'up','-d','--no-deps','--no-build','--pull','never',r.service]);
  let x;for(let i=0;i<120;i++){await pause();x=inspect(r.name);if(x.State.Health?.Status==='healthy')break;if(!x.State.Running)break;}
  if(x.Image!==r.newImage||!x.State.Running||(x.State.Health&&x.State.Health.Status!=='healthy')){
   const f=dir+'/'+r.key+'-rollback.json';writeFileSync(f,JSON.stringify({services:{[r.service]:{image:r.oldRef}}}),{mode:0o600});
   docker([...compose(r),'-f',f,'up','-d','--no-deps','--no-build','--pull','never',r.service]);throw Error(r.key+': rolled back; reconcile source pin');
  }
  console.log(r.key+': updated runtime running; native/public checks still required.');
 }
 writeFileSync(dir+'/release.json',JSON.stringify({date:new Date().toISOString(),rows:stage.rows},null,2)+'\n',{mode:0o600});
}else throw Error('Use stage, review/back up, update exact pins, then apply');
