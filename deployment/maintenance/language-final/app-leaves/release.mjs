// Four finite same-major module changes. Preparation cannot mutate production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {replaceImagePins,namespaceDependents,readinessSeconds,releaseGroup} from '../release.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/app-leaves-20261011';fs.mkdirSync(dir,{recursive:true,mode:0o700});
const file=dir+'/release.json';
const specs=JSON.parse(fs.readFileSync(new URL('./images.json',import.meta.url)));
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}});}catch{throw Error('Bounded Docker operation failed; sensitive output withheld.');}};
const inspect=name=>JSON.parse(docker('inspect',name))[0];
const compose=g=>['compose','--profile','*','--project-directory',g.cwd,...(g.project==='utilibre-community'?['--env-file',g.cwd+'/.env.rallly']:[]),'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services[g.service];
const hash=s=>{const {image,...rest}=s;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
const sourceFiles=g=>[...g.files,...(g.mirrorFiles||[])];
function repin(g,from,to){let count=0;for(const f of sourceFiles(g)){const old=fs.readFileSync(f,'utf8'),changed=replaceImagePins(old,[{from,to}]);if(changed.replaced){fs.writeFileSync(f,changed.text);count+=changed.replaced;}}assert(count>=g.files.length,'Exact source pin missing');}
async function gate(g,version){
 const maximum=readinessSeconds([inspect(g.name)]);
 for(let i=0;i<maximum;i++){
  const expected=version==='old'&&g.rollbackImage?g.rollbackImage:g[version+'Image'];
  const x=inspect(g.name);if(x.Image===expected&&x.State.Running&&x.State.Health?.Status==='healthy'&&x.RestartCount===0)return;
  await new Promise(r=>setTimeout(r,1000));
 }throw Error('Exact image/native health gate failed: '+g.name);
}
const mode=process.argv[2];assert(['prepare','apply'].includes(mode));
if(mode==='prepare'){
 const nativeDirs=fs.readdirSync('/opt/utilibre/reports').filter(x=>x.startsWith('app-leaves-native-'));
 const natives=nativeDirs.flatMap(d=>{try{return [{path:'/opt/utilibre/reports/'+d+'/result.json',...JSON.parse(fs.readFileSync('/opt/utilibre/reports/'+d+'/result.json'))}];}catch{return [];}}).filter(x=>x.status==='passed');assert(natives.length);
 const spliit=fs.readdirSync('/opt/utilibre/reports').filter(x=>x.startsWith('app-leaves-spliit-native-')).flatMap(d=>{try{return [JSON.parse(fs.readFileSync('/opt/utilibre/reports/'+d+'/result.json'))];}catch{return [];}});
 const rr=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/rallly-libraries-20261011/mysql/stage.json'));assert.equal(rr.status,'passed');
 const wr=JSON.parse(fs.readFileSync(dir+'/wishlist-stage.json'));assert(wr.nativeAccountCreated&&wr.reloadPersistence&&wr.anonymousListDenied);assert.deepEqual(wr.externalBrowserOrigins,[]);
 const reports=fs.readdirSync('/opt/utilibre/reports').filter(x=>x.startsWith('app-leaves-verify-')).flatMap(d=>{try{return [{path:'/opt/utilibre/reports/'+d+'/result.json',...JSON.parse(fs.readFileSync('/opt/utilibre/reports/'+d+'/result.json'))}];}catch{return [];}});
 const groups=[];
 for(const s of specs){
  const x=inspect(s.container),l=x.Config.Labels,candidate=inspect(s.candidate);assert.equal(x.Image,s.baseId);assert.equal(x.State.Health?.Status,'healthy');
  const proof=reports.find(r=>r.status==='passed'&&r.imageId===candidate.Id&&r.key===s.key);assert(proof?.applicationFilesOutsideSelectedLibraryUnchanged||proof?.applicationFilesOutsideSelectedLibraryAndDocumentedPrivacyPatchUnchanged);assert(Date.now()-Date.parse(proof.verifiedAt)<86400000);
  const native=natives.find(n=>n.rows.some(r=>r.key===s.key&&r.imageId===candidate.Id&&r.status==='passed'));assert(native);
  if(s.key==='spliit'){const sp=spliit.find(r=>r.status==='passed'&&r.imageId===candidate.Id);assert(sp?.jsonCsvExport&&sp.nativeExpenseDeletion);assert.deepEqual(sp.externalBrowserOrigins,[]);}
  if(s.key==='rallly')assert.equal(rr.imageId,candidate.Id);if(s.key==='wishlist')assert.equal(wr.imageId,candidate.Id);
  const g={key:s.key,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),service:l['com.docker.compose.service'],name:s.container,oldRef:s.base,oldImage:s.baseId,newRef:s.candidate,newImage:candidate.Id,status:'prepared',proof:proof.path,native:native.path};
  if(s.key==='spliit'){
   g.rollbackRef='utilibre-spliit:1.29.0-privacy-rollback-20261011';g.rollbackImage=inspect(g.rollbackRef).Id;
   const fallback=spliit.find(r=>r.status==='passed'&&r.imageId===g.rollbackImage);assert(fallback?.jsonCsvExport&&fallback.nativeExpenseDeletion);assert.deepEqual(fallback.externalBrowserOrigins,[]);
   assert(reports.some(r=>r.status==='passed'&&r.imageId===g.rollbackImage&&r.applicationFilesOutsideSelectedLibraryAndDocumentedPrivacyPatchUnchanged));
  }
  assert.equal(config(g).image,g.oldRef);g.configHash=hash(config(g));if(s.key==='rsshub')g.mirrorFiles=['/home/ubuntu/freetools/deployment/utilibre/compose.yaml'];groups.push(g);
 }
 const containers=JSON.parse(docker('inspect',...docker('ps','-q').trim().split('\n')));
 assert.deepEqual(namespaceDependents(containers,new Set(groups.map(g=>g.name))),[],'New namespace companion requires review');
 fs.writeFileSync(file,JSON.stringify({status:'prepared',date:new Date().toISOString(),groups},null,2)+'\n');console.log('Four exact candidates prepared; no production mutation.');
}else{
 const report=JSON.parse(fs.readFileSync(file));assert(Date.now()-Date.parse(report.date)<86400000);assert.equal(report.groups.length,4);assert(['prepared','applying'].includes(report.status));
 const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');report.status='applying';save();
 for(const g of report.groups){
  const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>=8*1024**3,'8 GiB disk floor');
  if(g.status==='passed'){await gate(g,'new');continue;}
  const validate=()=>{assert.equal(inspect(g.oldRef).Id,g.oldImage);assert.equal(inspect(g.newRef).Id,g.newImage);if(g.rollbackRef)assert.equal(inspect(g.rollbackRef).Id,g.rollbackImage);assert.equal(hash(config(g)),g.configHash);assert([g.oldRef,g.newRef,g.rollbackRef].includes(config(g).image));};
  let rollingBack=false;
  await releaseGroup(g,{preflight:()=>{validate();assert.equal(inspect(g.name).Image,g.oldImage);assert.equal(config(g).image,g.oldRef);},save,recreate:()=>{validate();if(!rollingBack)repin(g,g.oldRef,g.newRef);assert.equal(config(g).image,rollingBack?(g.rollbackRef||g.oldRef):g.newRef);docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',g.service);},gate:v=>gate(g,v),rollbackPins:()=>{rollingBack=true;validate();repin(g,g.newRef,g.rollbackRef||g.oldRef);assert.equal(config(g).image,g.rollbackRef||g.oldRef);}});
  console.log(g.key+': exact candidate/native health passed');
 }
 report.status='passed';report.completedAt=new Date().toISOString();save();
}
