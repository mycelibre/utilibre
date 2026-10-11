// Finite runtime-only repair using the existing artifact Dockerfile. The browser
// application bytes are preserved; no dependency upgrade, source rebuild or fork.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,copyFile,statfs} from 'node:fs/promises';
const extended=process.argv.includes('--extended');
const exec=promisify(execFile),dir='/var/lib/utilibre-maintenance/'+(extended?'extra-runtime':'static-runtime')+'-20261011',root='/home/ubuntu/freetools';
const extra={
 'utilibre-openresume-web-1':['openresume','/usr/share/nginx/html'],
 'utilibre-translite-gateway-1':['translite-gateway','/app'],
 'utilibre-wallabag-web-1':['wallabag-web','/srv/wallabag'],
 'utilibre-reader-evaluation-safetwitch-1':['safetwitch','/app'],
 'utilibre-binternet-gateway-1':['binternet-gateway','/app'],
 'utilibre-binternet-onion-gateway-1':['binternet-gateway','/app'],
 'utilibre-pollaris-gateway-1':['pollaris-gateway','/app'],
 'utilibre-expanded-whisper-1':['whisper','/usr/share/nginx/html'],
};
const names=extended?Object.keys(extra):['ittools','hatsh','qr-offline','excalidraw','glyphr','cyberchef','zip-manager','bentopdf','miniqr','minipaint','svgedit','markmap','vert','rawgraphs','omnitools','image-scrubber','audiomass','drawio'];
const assetHash=directory=>`cd ${directory} && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`;
await mkdir(dir,{recursive:true,mode:0o700});
async function docker(args,timeout=120000){try{return (await exec('docker',args,{cwd:root,env:{...process.env,APP_BIND_IP:'10.10.1.43'},timeout,maxBuffer:8*1024**2})).stdout;}catch(e){await writeFile(dir+'/last-error.log',String(e.stderr||e.message),{mode:0o600});throw Error('Private diagnostic: '+dir+'/last-error.log');}}
const compose=r=>['compose','--profile','*','--project-directory',r.cwd,'-p',r.project,...r.files.flatMap(x=>['-f',x])];
async function checksum(image,directory='/usr/share/nginx/html'){if(!['/usr/share/nginx/html','/srv/app','/app','/srv/wallabag'].includes(directory))throw Error('Unexpected asset path');return (await docker(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.75','--entrypoint','sh',image,'-c',assetHash(directory)])).trim().split(/\s+/)[0];}
async function status(r){if(r.name==='utilibre-binternet-onion-gateway-1')return Number(await docker(['exec',r.name,'curl','--silent','--output','/dev/null','--max-time','10','--write-out','%{http_code}','--unix-socket','/run/onion/http.sock','http://localhost/']));const response=await fetch(r.url,{redirect:'manual',signal:AbortSignal.timeout(10000)});await response.body?.cancel();return response.status;}
if(process.argv[2]==='stage'){
 const ids=(await docker(['ps','-q'])).trim().split(/\s+/),containers=JSON.parse(await docker(['inspect',...ids]));
 const rows=[],files={};
 for(const name of names){
  const x=containers.find(x=>extended?x.Name==='/'+name:x.Config.Image.startsWith('utilibre-'+name+':')&&!x.Config.Image.includes('-nginx1305'));
  if(!x)throw Error('Missing exact initial container: '+name);
  const space=await statfs(dir);if(space.bavail*space.bsize<10*1024**3)throw Error('10 GiB staging floor');
  const labels=x.Config.Labels,ports=Object.values(x.NetworkSettings.Ports).flat().filter(Boolean);
  const port=ports.find(x=>x.HostIp==='127.0.0.1')||ports.find(x=>!x.HostIp.includes(':'))||(name==='utilibre-binternet-onion-gateway-1'?{HostIp:Object.values(x.NetworkSettings.Networks)[0].IPAddress,HostPort:'8080'}:null);
  if(!port)throw Error('No existing endpoint');
  const row={name:x.Name.slice(1),oldImage:x.Image,oldRef:x.Config.Image,newRef:x.Config.Image+'-nginx1305',project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),service:labels['com.docker.compose.service'],url:`http://${port.HostIp==='0.0.0.0'?'127.0.0.1':port.HostIp}:${port.HostPort}/`};
  if(extended)row.newRef='utilibre-'+extra[name][0]+':security-20261011-nginx1305';
  if(!row.files.every(f=>f.startsWith(root+'/deployment/')))throw Error('Unexpected source path');
  const original=JSON.parse(await docker(['image','inspect',row.oldRef]))[0];
  const expectedEntrypoint=name==='utilibre-binternet-onion-gateway-1'?['/bin/sh','/usr/local/bin/binternet-onion-start.sh']:['nginx','-g','daemon off;'];
  if(original.Id!==row.oldImage||JSON.stringify(extended?x.Config.Entrypoint:original.Config.Entrypoint)!==JSON.stringify(expectedEntrypoint))throw Error('Not the reviewed static runtime');
  for(const file of row.files)if(!files[file]){const backup=dir+'/compose-'+Object.keys(files).length+'.yaml';await copyFile(file,backup);files[file]=backup;}
  row.before=await status(row);
  row.staticRoot=extended?extra[name][1]:name==='glyphr'?'/srv/app':'/usr/share/nginx/html';
  let artifactRef=row.oldRef;
  if(extended&&/^sha256:[a-f0-9]{64}$/.test(artifactRef)){artifactRef='utilibre-'+extra[name][0]+':pre-security-20261011';await docker(['tag',row.oldImage,artifactRef]);}
  const shared=rows.find(r=>r.newRef===row.newRef);
  if(shared&&(shared.oldImage!==row.oldImage||shared.staticRoot!==row.staticRoot))throw Error('Conflicting shared artifact');
  if(!shared)await docker(['build','--network','none','--build-arg','ARTIFACT_IMAGE='+artifactRef,'--build-arg','STATIC_ROOT='+row.staticRoot,'-f','deployment/toolbox/Dockerfile.artifact','-t',row.newRef,'deployment/toolbox'],300000);
  const built=JSON.parse(await docker(['image','inspect',row.newRef]))[0];row.newImage=built.Id;
  const [before,after]=await Promise.all([checksum(row.oldRef,row.staticRoot),checksum(row.newRef,row.staticRoot)]);
  if(!/^[a-f0-9]{64}$/.test(before)||before!==after)throw Error('Browser asset bytes changed');row.assetSha256=before;
  await docker(['run','--rm','--network','container:'+row.name,'--volumes-from',row.name+':ro','--read-only','--tmpfs','/tmp','--user',x.Config.User||'101','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.5','--entrypoint','nginx',row.newRef,'-t']);
  rows.push(row);console.log(`${rows.length}/${names.length} asset hash/config passed: ${name}`);
  await writeFile(dir+'/progress.json',JSON.stringify({date:new Date().toISOString(),rows,files},null,2)+'\n',{mode:0o600});
 }
 await copyFile(dir+'/progress.json',dir+'/stage.json');
}else if(process.argv[2]==='reconcile-shared-stage'&&extended){
 const stage=JSON.parse(await readFile(dir+'/stage.json','utf8'));
 const shared=stage.rows.filter(r=>r.newRef==='utilibre-binternet-gateway:security-20261011-nginx1305');
 if(shared.length!==2||shared[0].oldImage!==shared[1].oldImage||shared[0].assetSha256!==shared[1].assetSha256)throw Error('Unexpected shared artifact');
 const digest=await checksum(shared[0].newRef,shared[0].staticRoot);
 if(digest!==shared[0].assetSha256)throw Error('Shared asset bytes differ');
 const id=JSON.parse(await docker(['image','inspect',shared[0].newRef]))[0].Id;
 for(const row of shared)row.newImage=id;
 await writeFile(dir+'/stage.json',JSON.stringify(stage,null,2)+'\n',{mode:0o600});
 console.log('Shared clearnet/onion candidate identity reconciled after exact-byte verification.');
}else if(process.argv[2]==='repair-glyphr-stage'){
 const stage=JSON.parse(await readFile(dir+'/stage.json','utf8')),r=stage.rows.find(x=>x.name==='utilibre-creative-batch-glyphr-1');
 const live=JSON.parse(await docker(['inspect',r.name]))[0];if(live.Image!==r.oldImage)throw Error('Repair only the un-deployed candidate');
 r.staticRoot='/srv/app';
 await docker(['build','--network','none','--build-arg','ARTIFACT_IMAGE='+r.oldRef,'--build-arg','STATIC_ROOT=/srv/app','-f','deployment/toolbox/Dockerfile.artifact','-t',r.newRef,'deployment/toolbox'],300000);
 const before=await checksum(r.oldRef,r.staticRoot),after=await checksum(r.newRef,r.staticRoot);if(before!==after)throw Error('Glyphr app bytes changed');
 r.assetSha256=before;r.newImage=JSON.parse(await docker(['image','inspect',r.newRef]))[0].Id;
 await writeFile(dir+'/stage.json',JSON.stringify(stage,null,2)+'\n',{mode:0o600});
 console.log('Glyphr /srv/app native asset hash matches; candidate corrected, not yet deployed.');
}else if(process.argv[2]==='apply'){
 const stage=JSON.parse(await readFile(dir+'/stage.json','utf8'));
 if(stage.rows.length!==names.length||Date.now()-Date.parse(stage.date)>86400000)throw Error('Restage required');
 try{await copyFile(dir+'/release.json',dir+'/release-before-'+Date.now()+'.json');}catch(e){if(e.code!=='ENOENT')throw e;}
 const report={date:new Date().toISOString(),rows:[]};
 for(const r of stage.rows){
  const config=JSON.parse(await docker([...compose(r),'config','--format','json']));
  if(config.services[r.service].image!==r.newRef)throw Error('Update exact source pin first');
  const live=JSON.parse(await docker(['inspect',r.name]))[0];
  if(![r.oldImage,r.newImage].includes(live.Image))throw Error('Runtime drift');
  const supervisor=r.name==='utilibre-wallabag-web-1'?'utilibre-wallabag.service':null;
  if(live.Image===r.oldImage){
   if(supervisor)await exec('systemctl',['stop',supervisor]);
   try{await docker([...compose(r),'up','-d','--no-deps','--no-build','--pull','never',r.service]);}
   finally{if(supervisor)await exec('systemctl',['start',supervisor]);}
  }
  let after;
  for(let i=0;i<(supervisor?25:5);i++){try{after=await status(r);if(after===r.before)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
  if(after!==r.before){
   const rollback=dir+'/rollback-'+r.service+'.yaml';await writeFile(rollback,JSON.stringify({services:{[r.service]:{image:r.oldRef}}}),{mode:0o600});
   if(supervisor)await exec('systemctl',['stop',supervisor]);
   try{await docker([...compose(r),'-f',rollback,'up','-d','--no-deps','--no-build','--pull','never',r.service]);}
   finally{if(supervisor)await exec('systemctl',['start',supervisor]);}
   throw Error(r.name+': previous runtime restored; reconcile source pin');
  }
  const actual=JSON.parse(await docker(['inspect',r.name]))[0];if(actual.Image!==r.newImage)throw Error('Deployed identity mismatch');
  report.rows.push({name:r.name,status:'passed',before:r.before,after,assetSha256:r.assetSha256,newImage:r.newImage});
  await writeFile(dir+'/release.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`${report.rows.length}/${names.length} deployed: ${r.name}`);
 }
}else throw Error('Use stage, review exact file/image changes, then apply');
