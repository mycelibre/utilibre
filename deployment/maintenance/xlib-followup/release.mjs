// Exact native image overlays only. Defaults to independent read-only preparation.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceImagePins,namespaceDependents,releaseGroup,existingComposeArgs,checkExistingGroup,recreateExistingGroup,existingGroupStatus} from '../language-final/release.mjs';
import {packageGate,refreshStaticUpstreams} from './policy.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/xlib-followup-20261012',here=new URL('.',import.meta.url).pathname,file=dir+'/release.json';
const [mode,key]=process.argv.slice(2);assert.equal(process.argv.length,4);assert(['prepare','apply','verify-live'].includes(mode));assert(['forms','expanded','gathio'].includes(key));
// One durable receipt: even independent groups must never write it concurrently.
const lock=file+'.lock',lockFd=fs.openSync(lock,'wx',0o600);fs.writeFileSync(lockFd,String(process.pid)+'\n');fs.closeSync(lockFd);process.on('exit',()=>{try{fs.unlinkSync(lock);}catch{}});
const groups={forms:{project:'utilibre-pack-forms',file:'deployment/pack/compose.forms.yaml',keys:['forms'],urls:['http://10.10.1.43:3176/']},expanded:{project:'utilibre-expanded',file:'deployment/expanded/compose.yaml',keys:['breezewiki','penpot-backend','penpot-exporter'],urls:['http://10.10.1.43:3134/','http://10.10.1.43:3131/readyz']},gathio:{project:'utilibre-gathio',file:'deployment/calendar/compose.gathio.yaml',keys:['gathio'],urls:['http://10.10.1.43:3198/']}};
const specs=JSON.parse(fs.readFileSync(here+'roles.json')),allowed=groups[key];
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:24*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded Docker operation failed; private configuration output withheld');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0],config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=s=>{const{image,...rest}=s;return sha(JSON.stringify(rest));};
const save=r=>fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');
function proofs(s){
 const b=read(dir+'/images/'+s.key+'/build.json'),paths=[dir+'/images/'+s.key+'/build.json',dir+'/source-checks.json'];
 assert.equal(b.status,'staged');assert(b.configurationUnchanged);assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(inspect(s.candidate).Id,b.imageId);assert.deepEqual(b.packages.map(p=>p.name),s.packages);
 packageGate(s.suite,b.packages,s.packages);
 const source=read(dir+'/source-checks.json');assert(source.passed&&source.sources.length===6);for(const p of b.packages){assert.equal(source.packages.find(a=>a.suite===s.suite&&a.file===p.file)?.sha256,p.sha256);assert.equal(sha(fs.readFileSync(dir+'/images/'+s.key+'/packages/'+p.file)),p.sha256);}
 assert(b.abi.every(a=>a.preservedSymbols>0&&a.sameNativeDependencies&&a.sameSONAME));for(const h of Object.values(b.preservation))assert.match(h,/^[a-f0-9]{64}/);
 if(s.key.startsWith('penpot-')){
  paths.push(dir+'/penpot-native.json',dir+'/penpot-application.json');const native=read(paths.at(-2)),app=read(paths.at(-1)),component=s.key.replace('penpot-','');
  assert(native.passed&&native.font.fontforgeTtfOtf&&native.font.woffRoundtrip&&native.font.woff2Roundtrip);const n=native.native.find(n=>n.key===component);assert.equal(n.imageId,b.imageId);assert(n.systemAndPrivateRasterParity&&n.codecSetPreserved);assert.equal(app.status,'passed');assert.equal(app.manifest[component].imageId,b.imageId);
 }else{
  const path=dir+'/images/'+s.key+'/'+(s.key==='gathio'?'application':'native')+'.json';paths.push(path);const p=read(path);assert.equal(p.imageId,b.imageId);
  if(s.key==='forms'){for(const flag of ['blankDatabase','nativeAvatarPng','nativeTwoAccountLogin','nativeRequiredEncryptionFormCreation','ownerAnswerPage','otherAndAnonymousDenied','svgPngDimensionsAndPixel','svgPdfExport'])assert(p[flag]);}
  else if(s.key==='breezewiki')assert(p.passed&&p.nativeRacketTextPngRoundtrip&&p.oldNewPngEqual&&p.nativeHomepage200);
  else assert(p.passed&&p.nativeTypedDataAndIsolation&&p.logicalRestore&&p.postgisRegressionAndProjection);
 }
 for(const p of paths){const r=read(p);assert(Date.now()-Date.parse(r.date||r.checkedAt)<86400000,'Expired candidate proof');}
 return{b,hashes:Object.fromEntries(paths.map(p=>[p,sha(fs.readFileSync(p))]))};
}
async function http(url){const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(8000)});await r.body?.cancel();return r.status;}
async function native(g,which){
 for(const row of g.rows.filter(r=>r.key!=='namespace-companion')){
  const b=read(dir+'/images/'+row.key+'/build.json');
  for(const a of b.abi){const output=docker('exec',row.name,'sha256sum',a.path);assert.equal(output.split(/\s+/)[0],a[which==='new'?'newSha256':'oldSha256']);}
  if(which==='new')for(const p of b.packages)assert.equal(docker('exec',row.name,'dpkg-query','-W','-f=${Version}',p.name),p.version);
 }
 if(g.key==='expanded')assert.equal(docker('exec','utilibre-expanded-penpot-exporter-1','node','-e',"Promise.all(['http://127.0.0.1:6061/readyz','http://penpot-backend:6060/readyz'].map(async u=>{if(!(await fetch(u,{signal:AbortSignal.timeout(4000)})).ok)throw Error('not ready')})).then(()=>console.log('ready')).catch(()=>process.exit(1))"),'ready');
 if(g.key==='gathio')assert.equal(docker('exec','utilibre-gathio-postgres-1','psql','-U','gathio','-d','postgres','-Atc',"SELECT current_setting('server_version')||'|'||postgis_lib_version()||'|'||(SELECT extversion FROM pg_extension WHERE extname='documentdb');"),g.nativeBefore);
}
async function gate(g,which){
 await checkExistingGroup(g,which);
 for(let n=0;n<90;n++){try{await native(g,which);assert.deepEqual(await Promise.all(groups[g.key].urls.map(http)),g.httpBefore);return;}catch{if(n===89)throw Error('Native readiness/byte gate failed');await new Promise(r=>setTimeout(r,1000));}}
}
if(mode==='prepare'){
 const report=fs.existsSync(file)?read(file):{status:'prepared',groups:[]};assert(report.groups.every(g=>['prepared','passed'].includes(g.status)));
 const previous=report.groups.find(g=>g.key===key);assert(!previous||previous.status==='prepared','Retain completed receipt');
 const selected=specs.filter(s=>allowed.keys.includes(s.key)),rows=[];let g;
 for(const s of selected){
  const {b,hashes}=proofs(s),live=inspect(s.container),l=live.Config.Labels;assert.equal(live.Image,s.base);
  if(!g)g={key,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows,status:'prepared',proofs:{}};
  assert.equal(g.project,allowed.project);assert.equal(l['com.docker.compose.project'],g.project);assert.deepEqual(g.files,['/home/ubuntu/freetools/'+allowed.file]);
  const service=l['com.docker.compose.service'],c=config(g)[service];assert.equal(inspect(c.image).Id,s.base);
  rows.push({key:s.key,name:s.container,service,oldRef:c.image,oldImage:s.base,newRef:s.candidate,newImage:b.imageId,configHash:hash(c),verification:dir+'/images/'+s.key+'/build.json'});Object.assign(g.proofs,hashes);
 }
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n'))),cfg=config(g);
 for(const{container:x,parent}of namespaceDependents(all,new Set(selected.map(s=>s.container)))){assert.equal(x.Config.Labels['com.docker.compose.project'],g.project);const service=x.Config.Labels['com.docker.compose.service'];assert.equal(inspect(cfg[service].image).Id,x.Image);rows.push({key:'namespace-companion',name:x.Name.slice(1),service,oldRef:cfg[service].image,newRef:cfg[service].image,oldImage:x.Image,newImage:x.Image,configHash:hash(cfg[service]),namespaceParent:parent});}
 g.before=await existingGroupStatus(g);g.httpBefore=await Promise.all(allowed.urls.map(http));assert(g.httpBefore.every(s=>s===200));
 if(key==='gathio')g.nativeBefore=docker('exec','utilibre-gathio-postgres-1','psql','-U','gathio','-d','postgres','-Atc',"SELECT current_setting('server_version')||'|'||postgis_lib_version()||'|'||(SELECT extversion FROM pg_extension WHERE extname='documentdb');");
 g.untouched=all.filter(x=>x.Config.Labels?.['com.docker.compose.project']===g.project&&!rows.some(r=>r.name===x.Name.slice(1))).map(x=>({name:x.Name.slice(1),id:x.Id,image:x.Image,service:x.Config.Labels['com.docker.compose.service'],configSha256:sha(JSON.stringify(cfg[x.Config.Labels['com.docker.compose.service']]))}));
 await gate(g,'old');g.preparedAt=new Date().toISOString();g.fileHashes=Object.fromEntries(g.files.map(p=>[p,sha(fs.readFileSync(p))]));
 report.groups=report.groups.filter(g=>g.key!==key);report.groups.push(g);report.date=g.preparedAt;report.status='prepared';delete report.completedAt;save(report);console.log(key+': exact native release prepared; no production changes.');
}else if(mode==='verify-live'){
 // Reconcile a stale saved group only after independently observing every gate.
 // This never repins/recreates a container or restores user data.
 const report=read(file),g=report.groups.find(g=>g.key===key);assert(g&&['prepared','applying','passed'].includes(g.status));assert.equal(g.project,allowed.project);
 const fresh={};for(const s of specs.filter(s=>allowed.keys.includes(s.key)))Object.assign(fresh,proofs(s).hashes);assert.deepEqual(fresh,g.proofs);
 const cfg=config(g);for(const r of g.rows){assert.equal(cfg[r.service].image,r.newRef);assert.equal(hash(cfg[r.service]),r.configHash);assert.equal(inspect(r.newRef).Id,r.newImage);assert.equal(inspect(r.name).Image,r.newImage);}
 for(const u of g.untouched){const x=inspect(u.name);assert.equal(x.Id,u.id);assert.equal(x.Image,u.image);assert.equal(sha(JSON.stringify(cfg[u.service])),u.configSha256);}
 await gate(g,'new');
 const checkpoint=dir+'/release-gathio-completed-checkpoint.json';
 if(key==='gathio'&&fs.existsSync(checkpoint)){
  const prior=read(checkpoint).groups.find(x=>x.key===key);assert.equal(prior?.status,'passed');for(const field of ['project','cwd','files','rows','proofs','untouched','nativeBefore','httpBefore'])assert.deepEqual(prior[field],g[field],'Checkpoint mismatch '+field);assert(Number.isFinite(Date.parse(prior.completedAt)));g.completedAt=prior.completedAt;g.recoveredFromCheckpointSha256=sha(fs.readFileSync(checkpoint));
 }
 g.status='passed';g.completedAt ||= new Date().toISOString();g.receiptRevalidated=true;g.receiptRevalidatedAt=new Date().toISOString();
 report.status=report.groups.every(x=>x.status==='passed')?'passed':'prepared';if(report.status==='passed')report.completedAt=g.completedAt;save(report);console.log(key+': existing live release reverified and receipt saved; no restart or pin change.');
}else{
 const report=read(file),g=report.groups.find(g=>g.key===key);assert(g&&g.status==='prepared');assert(Date.now()-Date.parse(g.preparedAt)<3600000);assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
 const fresh={};for(const s of specs.filter(s=>allowed.keys.includes(s.key)))Object.assign(fresh,proofs(s).hashes);assert.deepEqual(fresh,g.proofs);for(const [p,h]of Object.entries(g.fileHashes))assert.equal(sha(fs.readFileSync(p)),h,'Concurrent compose edit; prepare again');
 const validate=()=>{const cfg=config(g);for(const r of g.rows){assert.equal(hash(cfg[r.service]),r.configHash);assert([r.oldRef,r.newRef].includes(cfg[r.service].image));assert.equal(inspect(r.oldRef).Id,r.oldImage);assert.equal(inspect(r.newRef).Id,r.newImage);}for(const u of g.untouched){const x=inspect(u.name);assert.equal(x.Id,u.id);assert.equal(x.Image,u.image);assert.equal(sha(JSON.stringify(cfg[u.service])),u.configSha256);}};
 const repin=reverse=>{const pairs=g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r[reverse?'newRef':'oldRef'],to:r[reverse?'oldRef':'newRef']}));let count=0;for(const p of g.files){const text=fs.readFileSync(p,'utf8'),next=replaceImagePins(text,pairs);assert.equal(next.replaced,pairs.length);fs.writeFileSync(p,next.text);count+=next.replaced;}assert.equal(count,allowed.keys.length);};
 let rollback=false;await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save:()=>save(report),recreate:async()=>{validate();if(!rollback)repin(false);await recreateExistingGroup(g);refreshStaticUpstreams(key,docker);},gate:async which=>{await gate(g,which);validate();},rollbackPins:()=>{validate();rollback=true;repin(true);}});
 g.completedAt=new Date().toISOString();report.status=report.groups.every(x=>x.status==='passed')?'passed':'prepared';if(report.status==='passed')report.completedAt=g.completedAt;save(report);console.log(key+': exact native images live; health, preserved configuration and bytes verified.');
}
