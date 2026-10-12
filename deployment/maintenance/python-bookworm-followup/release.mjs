// Exact native Python/Expat rollout. No data/schema migration or unrelated pin.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonical} from '../go-final/release.mjs';
import {replaceImagePins,namespaceDependents,releaseGroup,rollbackFiles,existingComposeArgs,checkExistingGroup,recreateExistingGroup} from '../language-final/release.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/python-bookworm-followup-20261012',file=dir+'/release.json';
const [mode,key]=process.argv.slice(2);assert(['prepare','apply'].includes(mode));assert(['kuma','gathio'].includes(key));assert.equal(process.argv.length,4);
const specs=JSON.parse(fs.readFileSync(new URL('./specs.json',import.meta.url)));
const sdk=JSON.parse(fs.readFileSync(new URL('./sdk-packages.json',import.meta.url)));
assert.deepEqual(specs.map(s=>s.key),['kuma','gathio']);
const allowed={
 kuma:{project:'utilibre-community',service:'uptime-kuma',file:'/home/ubuntu/freetools/deployment/community/compose.yaml',url:'http://10.10.1.43:3125/status/utilibre'},
 gathio:{project:'utilibre-gathio',service:'postgres',file:'/home/ubuntu/freetools/deployment/calendar/compose.gathio.yaml',url:'http://10.10.1.43:3198/'}
};
const read=p=>JSON.parse(fs.readFileSync(p)),sha=v=>createHash('sha256').update(v).digest('hex');
const digest=v=>sha(JSON.stringify(canonical(v)));
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded Docker operation failed; private configuration withheld');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0];
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=row=>{const {image,...rest}=row;return digest(rest);};
const save=r=>fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');
function proofs(s){
 const location=dir+'/images/'+s.key,paths=['build','native','application'].map(n=>location+'/'+n+'.json');
 const [b,n,a]=paths.map(read);assert(b.passed&&b.configurationUnchanged&&n.passed&&a.passed);
 for(const x of [n,a]){assert.equal(x.imageId,b.imageId);assert(Date.now()-Date.parse(x.date)<86400000);}
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(inspect(s.candidate).Id,b.imageId);assert.equal(inspect(s.baseRef).Id,s.base);
 assert.equal(b.abi.length,2);assert(b.abi.every(x=>x.preservedSymbols>=71&&x.added128bitApi));
 assert.equal(n.upstreamPythonModules,10);assert.equal(n.upstreamExpatChecks,5196);assert(n.abiPreserved);
 const current=n.native.find(x=>x.image===b.imageId);assert(current?.passed&&current.bothParserPathsUse128BitSalt);assert.equal(current.nativeEntropyApiCalls,2);assert.equal(current.expat,'expat_2.9.0');
 assert(a.fictionalDataOnly&&a.network==='none');
 if(s.key==='kuma')assert(a.nativeSetupLogin&&a.noNotificationSent);else assert(a.nativeTypedDataAndIsolation&&a.logicalRestore&&a.postgisRegressionAndProjection);
 const expected=['python3.11','python3.11-minimal','libpython3.11-minimal','libpython3.11-stdlib','libexpat1',...(s.key==='gathio'?sdk.map(p=>p.name):[])];
 assert.deepEqual(b.packages.map(x=>x.name),expected);
 for(const p of b.packages)assert.equal(p.version,sdk.find(a=>a.name===p.name)?.version||(p.name==='libexpat1'?'2.9.0-1~deb12u1+utilibre1':'3.11.2-6+deb12u9+utilibre1'));
 if(s.key==='gathio'){
  assert(b.sdkCompatibilityRepair);const c=n.sdkNative;
  for(const property of ['passed','loopbackOnly','nativeSigV4VerifiedIndependently','environmentCredentials','wrongKeyDenied','untrustedTlsDenied','nativeBarmanUploadListReadDownload','missingObjectHandled','syntheticDeletion'])assert(c[property]);
  assert.equal(c.boto3,'1.40.72');assert.equal(c.botocore,'1.40.72');assert.equal(c.s3transfer,'0.14.0');assert.equal(c.urllib3,'2.8.0');
 }
 for(const key of ['applicationSha256','etcSha256','unrelatedLibrariesSha256'])assert.match(b[key],/^[a-f0-9]{64}/);
 return {b,hashes:Object.fromEntries(paths.map(p=>[p,sha(fs.readFileSync(p))]))};
}
async function http(url){const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000)});await response.body?.cancel();return response.status;}
function native(row){
 return JSON.parse(docker('exec',row.name,'python3','-B','-c',"import json,sys,pyexpat,xml.etree.ElementTree as E; assert sys.version_info[:3]==(3,11,2); p=pyexpat.ParserCreate(); assert p.Parse('<fictional>native check</fictional>',True); assert E.fromstring('<fictional>native check</fictional>').text=='native check'; print(json.dumps({'python':sys.version.split()[0],'expat':pyexpat.EXPAT_VERSION,'parsers':True}))"));
}
async function gate(g,which){
 await checkExistingGroup(g,which);
 const target=g.rows.find(r=>r.key!=='namespace-companion');
 const parsed=native(target);assert(parsed.parsers);assert.equal(parsed.expat,which==='new'?'expat_2.9.0':g.nativeBefore.expat);
 if(which==='new'){
  const wanted=['python3.11','python3.11-minimal','libpython3.11-minimal','libpython3.11-stdlib','libexpat1',...(target.key==='gathio'?sdk.map(p=>p.name):[])];
  const packages=docker('exec',target.name,'dpkg-query','-W','-f=${binary:Package}\t${Version}\n',...wanted).split('\n');
  assert.equal(packages.length,wanted.length);for(const line of packages){const [name,version]=line.split('\t');assert.equal(version,sdk.find(p=>p.name===name)?.version||(name.startsWith('libexpat1')?'2.9.0-1~deb12u1+utilibre1':'3.11.2-6+deb12u9+utilibre1'));}
  if(target.key==='gathio')assert.equal(docker('exec',target.name,'python3','-B','-c',"import boto3,botocore,s3transfer; from barman.cloud_providers.aws_s3 import S3CloudInterface; assert (boto3.__version__,botocore.__version__,s3transfer.__version__)==('1.40.72','1.40.72','0.14.0'); print('native-sdk-compatible')"),'native-sdk-compatible');
 }
 let recovered=false;for(let n=0;n<30;n++){try{if(await http(g.url)===g.httpBefore){recovered=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert(recovered,'Existing public application did not recover');
}
if(mode==='prepare'){
 const report=fs.existsSync(file)?read(file):{date:new Date().toISOString(),status:'prepared',groups:[]};
 assert(!report.groups.some(g=>g.rows.some(r=>r.key===key)),'Preserve previous release evidence');
 assert(report.groups.every(g=>g.status==='passed'),'Finish the preceding release first');
 const groups=report.groups;
 for(const s of specs.filter(s=>s.key===key)){
  const a=allowed[s.key],{b,hashes}=proofs(s);assert.equal(s.containers.length,1);
  const live=inspect(s.containers[0]),labels=live.Config.Labels;assert.equal(live.Image,s.base);
  const g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),rows:[],before:[],status:'prepared',url:a.url,proofs:hashes};
  assert.equal(g.project,a.project);assert.deepEqual(g.files,[a.file]);assert.equal(labels['com.docker.compose.service'],a.service);
  const cfg=config(g),c=cfg[a.service];assert.equal(c.image,s.baseRef);
  const row={name:s.containers[0],key:s.key,service:a.service,oldRef:s.baseRef,oldImage:s.base,newRef:s.candidate,newImage:b.imageId,configHash:hash(c),verification:dir+'/images/'+s.key+'/native.json'};g.rows.push(row);
  const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));
  for(const {container:x,parent} of namespaceDependents(all,new Set(s.containers))){
   const l=x.Config.Labels;assert.equal(l['com.docker.compose.project'],g.project,'Unreviewed cross-project namespace companion');
   const service=l['com.docker.compose.service'],c=cfg[service];assert.equal(inspect(c.image).Id,x.Image);
   g.rows.push({name:x.Name.slice(1),key:'namespace-companion',service,oldRef:c.image,newRef:c.image,oldImage:x.Image,newImage:x.Image,configHash:hash(c),namespaceParent:parent});
  }
  g.httpBefore=await http(g.url);assert.equal(g.httpBefore,200);g.nativeBefore=native(row);await gate(g,'old');groups.push(g);
 }
 report.date=new Date().toISOString();report.status='prepared';delete report.completedAt;save(report);console.log(key+': exact native candidate prepared; production unchanged.');
}else{
 const report=read(file);assert(Date.now()-Date.parse(report.date)<86400000);assert(report.groups.length>=1&&report.groups.length<=2);
 const selected=report.groups.filter(g=>g.rows.some(r=>r.key===key));assert.equal(selected.length,1);
 for(const g of selected){
  const target=g.rows.find(r=>r.key!=='namespace-companion'),s=specs.find(s=>s.key===target.key);assert(s);assert.deepEqual(proofs(s).hashes,g.proofs);
  assert.equal(g.project,allowed[s.key].project);assert.deepEqual(g.files,[allowed[s.key].file]);
  if(g.status==='passed'){await gate(g,'new');continue;}assert.equal(g.status,'prepared');
  const space=fs.statfsSync('/');assert(space.bavail*space.bsize>=8*1024**3,'8 GiB recovery floor');
  const validate=()=>{const cfg=config(g);for(const row of g.rows){assert.equal(hash(cfg[row.service]),row.configHash);assert([row.oldRef,row.newRef].includes(cfg[row.service].image));assert.equal(inspect(row.oldRef).Id,row.oldImage);assert.equal(inspect(row.newRef).Id,row.newImage);}};
  const repin=reverse=>{
   const pairs=g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r[reverse?'newRef':'oldRef'],to:r[reverse?'oldRef':'newRef']}));
   let changed=0;for(const path of rollbackFiles(g)){const text=fs.readFileSync(path,'utf8'),next=replaceImagePins(text,pairs);if(next.replaced){assert.equal(next.replaced,1);fs.writeFileSync(path,next.text);changed+=next.replaced;}}
   assert.equal(changed,1,'Exactly one reviewed native image scalar');
  };
  let rollback=false;
  await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save:()=>save(report),recreate:async()=>{validate();if(!rollback)repin(false);await recreateExistingGroup(g);},gate:which=>gate(g,which),rollbackPins:()=>{validate();rollback=true;repin(true);}});
  g.completedAt=new Date().toISOString();save(report);console.log(g.project+': exact Python/Expat candidate live and healthy.');
 }
 assert(report.groups.every(g=>g.status==='passed'));report.status='passed';report.completedAt=new Date().toISOString();save(report);
}
