// Finite release of independently staged TIFF/zlib layers, never a general updater.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,statfs} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const versionRefresh=process.argv.includes('--nginx-1306');
const refresh=versionRefresh||process.argv.includes('--library-refresh');
assert(!(versionRefresh&&process.argv.includes('--library-refresh')));
assert(process.argv.slice(4).every(a=>['--library-refresh','--nginx-1306'].includes(a)));
const exec=promisify(execFile),dir='/var/lib/utilibre-maintenance/'+(versionRefresh?'security-20261022/nginx':refresh?'nginx-libraries-20261021':'nginx-tiff-20261011');
const group=process.argv[3]||'gateways';assert(['gateways','artifacts'].includes(group));
const receipt=dir+'/'+group+'-release.json';process.umask(0o077);
const stage=JSON.parse(await readFile(dir+'/'+(group==='gateways'?'stage':'artifacts-stage')+'.json','utf8'));
assert.equal(stage.status,'passed');assert.equal(stage.rows.length,group==='gateways'?41:refresh?27:26);
if(group==='artifacts')for(const r of stage.rows){assert(['/usr/share/nginx/html','/srv/app','/app','/srv/wallabag'].includes(r.assetRoot));assert.match(r.assetSha256,/^[a-f0-9]{64}$/);}
assert(Date.now()-Date.parse(stage.completedAt||stage.date)<86400000,'Restage stale candidates');
async function docker(args,timeout=120000){try{return (await exec('docker',args,{timeout,maxBuffer:16*1024**2,env:{...process.env,APP_BIND_IP:'10.10.1.43'}})).stdout;}catch(e){await writeFile(dir+'/release-error.log',String(e.stderr||e.message),{mode:0o600});throw Error('Private diagnostic: '+dir+'/release-error.log');}}
const inspect=async name=>JSON.parse(await docker(['inspect',name]))[0];
const compose=r=>['compose','--profile','*','--project-directory',r.cwd,...(r.project==='utilibre-trip'?['--env-file','/opt/utilibre/trip/private/runtime.env']:r.service==='rallly-gateway'?['--env-file',r.cwd+'/.env.rallly']:[]),'-p',r.project,...r.files.flatMap(f=>['-f',f])];
const config=async r=>JSON.parse(await docker([...compose(r),'config','--format','json'])).services[r.service];
const normalizedHash=service=>{const {image,...rest}=service;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
function endpoints(x){const ports=Object.entries(x.NetworkSettings.Ports||{}).filter(([k])=>k.endsWith('/tcp')).flatMap(([,v])=>v||[]).filter(p=>!p.HostIp.includes(':'));return ports.filter(p=>p.HostIp==='127.0.0.1'||!ports.some(q=>q.HostPort===p.HostPort&&q.HostIp==='127.0.0.1')).map(p=>`http://${p.HostIp==='0.0.0.0'?'127.0.0.1':p.HostIp}:${p.HostPort}/`);}
async function status(r){
 if(r.name==='utilibre-binternet-onion-gateway-1')return [Number(await docker(['exec',r.name,'curl','--silent','--output','/dev/null','--max-time','10','--write-out','%{http_code}','--unix-socket','/run/onion/http.sock','http://localhost/']))];
 const values=[];for(const url of r.urls){const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});await response.body?.cancel();values.push(response.status);}return values;
}
if(process.argv[2]==='prepare'){
 const rows=[];
 for(const original of stage.rows){
  const r={...original},live=await inspect(r.name),service=await config(r);
  assert.equal(live.Image,r.oldImage,'Unexpected live image');assert.equal(service.image,r.oldRef,'Source/runtime drift');
  assert.equal((await inspect(r.newRef)).Id,r.newImage,'Candidate drift');
  r.configSha256=normalizedHash(service);r.urls=endpoints(live);
  if(!r.urls.length&&live.HostConfig.NetworkMode.startsWith('container:'))r.urls=endpoints(await inspect(live.HostConfig.NetworkMode.slice(10)));
  assert(r.urls.length||r.name==='utilibre-binternet-onion-gateway-1','No verified endpoint');
  r.before=await status(r);r.status='prepared';rows.push(r);
 }
 await writeFile(receipt,JSON.stringify({date:new Date().toISOString(),status:'prepared',rows},null,2)+'\n',{mode:0o600});
 console.log(`${rows.length} exact service configurations and endpoint baselines recorded; not deployed.`);
}else if(process.argv[2]==='apply'){
 const report=JSON.parse(await readFile(receipt,'utf8'));assert.equal(report.rows.length,stage.rows.length);
 assert(Date.now()-Date.parse(report.date)<86400000);
 const save=()=>writeFile(receipt,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 for(const r of report.rows){
  const space=await statfs(dir);assert(space.bavail*space.bsize>=8*1024**3,'Preserve 8 GiB recovery floor');
  const service=await config(r);assert.equal(service.image,r.newRef,'Review and update exact source pin first');
  assert.equal(normalizedHash(service),r.configSha256,'Unrelated service configuration changed');
  assert.equal((await inspect(r.newRef)).Id,r.newImage,'Candidate tag drift');
  const live=await inspect(r.name);assert([r.oldImage,r.newImage].includes(live.Image),'Unexpected runtime drift');
  const coupled=['utilibre-trip','utilibre-13ft','utilibre-unfurl'].includes(r.project);
  const wallabag=r.name==='utilibre-wallabag-web-1';
  async function recreate(extra=[]){
   if(coupled){assert(!extra.length,'Use native supervisor rollback runbook');await exec('systemctl',['restart',r.project+'.service'],{timeout:180000});}
   else{if(wallabag)await exec('systemctl',['stop','utilibre-wallabag.service']);try{await docker([...compose(r),...extra,'up','-d','--no-deps','--no-build','--pull','never',r.service]);}finally{if(wallabag)await exec('systemctl',['start','utilibre-wallabag.service'],{timeout:180000});}}
  }
  if(live.Image===r.oldImage)await recreate();
  let passed=false;
  for(let n=0;n<(coupled||wallabag?30:10);n++){
   try{r.after=await status(r);const current=await inspect(r.name);passed=current.State.Running&&current.Image===r.newImage&&JSON.stringify(r.after)===JSON.stringify(r.before);if(passed)break;}catch{}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  r.status=passed?'passed':'failed';r.checkedAt=new Date().toISOString();await save();
  if(!passed){
   if(coupled)throw Error(r.name+': stopped release; use native supervisor runbook to roll back exact image pin.');
   const rollback=dir+'/rollback-'+r.name+'.json';await writeFile(rollback,JSON.stringify({services:{[r.service]:{image:r.oldRef}}}),{mode:0o600});await recreate(['-f',rollback]);
   throw Error(r.name+': previous image restored; reconcile its source pin before continuing.');
  }
  console.log(`Passed: ${r.name}`);
 }
 report.status='passed';report.completedAt=new Date().toISOString();await save();
}else throw Error('Use prepare gateways|artifacts, review/apply exact source pins, then apply gateways|artifacts.');
