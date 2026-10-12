// Complete native 2.18.3 regression with only disposable, isolated data.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {readFile,writeFile,rm,statfs} from 'node:fs/promises';
process.umask(0o077);
const manifestArgument=process.argv.find(value=>value.startsWith('--manifest='));
let nativeManifest=null;
if(manifestArgument){
 const path=manifestArgument.slice('--manifest='.length);
 assert.match(path,/^\/var\/lib\/utilibre-maintenance\/native-final\/[a-z0-9-]+\.json$/);
 nativeManifest=JSON.parse(await readFile(path,'utf8'));
 assert.equal(nativeManifest.schema,1);assert.equal(nativeManifest.version,'2.18.3');assert.equal(nativeManifest.status,'passed');
 for(const component of ['backend','frontend','exporter']){
  assert.deepEqual(Object.keys(nativeManifest[component]).sort(),['image','imageId']);
  assert.match(nativeManifest[component].image,new RegExp('^utilibre-penpot-'+component+':2\\.18\\.3-[a-z0-9-]+$'));
  assert.match(nativeManifest[component].imageId,/^sha256:[a-f0-9]{64}$/);
 }
}
const backend=nativeManifest?.backend.image||process.argv[2]||'utilibre-penpot-backend:2.18.3-libraries-security-20261011';
assert(nativeManifest||['utilibre-penpot-backend:2.18.3-libraries-security-20261011','utilibre-penpot-backend:2.18.3-debian-inventory-20261011','utilibre-penpot-backend:2.18.3-runtime-hardening-20261011'].includes(backend));
const hardened=Boolean(nativeManifest)||backend.includes('-runtime-hardening-');
const runtime=hardened||backend.includes('-debian-inventory-');
const layers=nativeManifest||(hardened?JSON.parse(await readFile('/var/lib/utilibre-maintenance/penpot-runtime-20261011/hardening.json','utf8')):null);
const reviewedBackendId=hardened?layers.backend.imageId:runtime?JSON.parse(await readFile('/var/lib/utilibre-maintenance/penpot-runtime-20261011/runtime.json','utf8')).imageId:'sha256:4746bdafbe62fd3423c6802e8ee106b453d00be47570e7e9c37ec4e735430301';
const space=await statfs('/opt/utilibre');assert(space.bavail*space.bsize>8*1024**3);
const metadata=JSON.parse(execFileSync('python3',['deployment/expanded/prepare-penpot-roundtrip.py'],{encoding:'utf8'}));
assert.match(metadata.report,/^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
const config=JSON.parse(await readFile(metadata.report+'/compose.json','utf8'));
config.services['penpot-backend'].image=backend;
config.services['penpot-frontend'].image='penpotapp/frontend:2.18.3@sha256:bb8abe27d53de84c95597f2c02c0e702b2779971fb0703e543f9ecf183e999f6';
config.services['penpot-frontend'].environment.PENPOT_EXPORTER_URI='http://penpot-exporter:6061';
config.services['penpot-exporter']={image:'utilibre-penpot-exporter:2.18.3-vendor-security-20261011',restart:'no',networks:['isolated'],security_opt:['no-new-privileges:true'],pids_limit:256,cpus:1,mem_limit:'768m',shm_size:'128m',environment:{PENPOT_PUBLIC_URI:`http://127.0.0.1:${metadata.port}`,PENPOT_INTERNAL_URI:'http://penpot-frontend:8080',PENPOT_REDIS_URI:'redis://penpot-valkey/0',PENPOT_SECRET_KEY:config.services['penpot-backend'].environment.PENPOT_SECRET_KEY},logging:{driver:'local',options:{'max-size':'1m','max-file':'2'}}};
if(hardened){config.services['penpot-frontend'].image=layers.frontend.image;config.services['penpot-exporter'].image=layers.exporter.image;}
await writeFile(metadata.report+'/compose.json',JSON.stringify(config,null,2),{mode:0o600});
await writeFile(metadata.report+'/metadata.json',JSON.stringify({...metadata,version:'2.18.3'}),{mode:0o600});
const compose=['compose','-f',metadata.report+'/compose.json'];
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000});
let relay;
try{
 assert.equal(JSON.parse(docker('image','inspect',backend))[0].Id,reviewedBackendId);
 if(hardened)for(const component of ['frontend','exporter'])assert.equal(JSON.parse(docker('image','inspect',layers[component].image))[0].Id,layers[component].imageId);
 docker(...compose,'up','-d','--pull','never');
 const ip=docker('inspect',metadata.name+'-penpot-frontend-1','--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}').trim();
 relay=spawn('socat',[`TCP4-LISTEN:${metadata.port},bind=127.0.0.1,reuseaddr,fork`,`TCP4:${ip}:8080`],{detached:true,stdio:'ignore'});
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(`http://127.0.0.1:${metadata.port}/readyz`,{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'Backend readiness');
 execFileSync('node',['deployment/expanded/check-penpot-roundtrip.mjs',metadata.report],{stdio:['ignore','pipe','pipe'],timeout:180000});
 execFileSync('node',['deployment/maintenance/penpot-2.18.3/check-membership.mjs',metadata.report],{stdio:['ignore','pipe','pipe'],timeout:120000});
 execFileSync('node',['deployment/maintenance/penpot-2.18.3/check-exporter.mjs',metadata.report],{stdio:['ignore','pipe','pipe'],timeout:120000});
 if(runtime)execFileSync('node',['deployment/maintenance/penpot-2.18.3/check-backend-media.mjs',metadata.report],{stdio:['ignore','pipe','pipe'],timeout:120000});
 const exporterReady=docker('exec',metadata.name+'-penpot-exporter-1','node','-e','fetch("http://127.0.0.1:6061/readyz").then(r=>{if(!r.ok)process.exit(1);console.log("ready")}).catch(()=>process.exit(1))').trim();assert.equal(exporterReady,'ready');
 console.log(JSON.stringify({status:'passed',version:'2.18.3',report:metadata.report,checks:'Two fictional accounts; editable native export/import/reload; account boundaries; removal/leave/legacy orphan permission checks; native PNG export; deletion. No public deployment.'}));
}catch(e){await writeFile(metadata.report+'/candidate-error.txt',String(e.stderr||e.message),{mode:0o600});throw Error('Candidate failed; inspect private '+metadata.report+'/candidate-error.txt');}
finally{
 if(relay?.pid)try{process.kill(-relay.pid,'SIGTERM');}catch{}
 docker(...compose,'down','--volumes');
 assert.match(metadata.ram,/^\/dev\/shm\/utilibre-penpot-roundtrip-[a-z0-9_]+$/);await rm(metadata.ram,{recursive:true});
 await writeFile(metadata.report+'/cleanup.json',JSON.stringify({date:new Date().toISOString(),containersRemoved:true,relayStopped:true,syntheticRamRemoved:true}));
}
