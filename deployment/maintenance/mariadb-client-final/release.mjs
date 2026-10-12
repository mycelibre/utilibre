// Image-only Coturn patch. Preserve firewall, listeners, credentials and quotas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/mariadb-client-final-20261011';
const oldRef='utilibre-coturn:4.18.0-minimal-native-20261011';
const oldImage='sha256:42d3309a92b6e573ffdcdf971cf65fd50dcc6cb3e6e9ed9ca49f7f17cf482b79';
const newRef='utilibre-coturn:4.18.0-client-security-20261011';
const newImage='sha256:abdba9b317da98ca9962d33ca4a552f5a8b784a86d996e0adf10575132bff625';
const command=(p,a)=>{try{return execFileSync(p,a,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']}).trim();}catch(error){
 fs.writeFileSync(dir+'/last-error.log',String(error.stderr||error.message).slice(0,16000),{mode:0o600});
 throw Error('Native command failed; inspect restricted last-error.log.');
}};
const docker=(...args)=>command('docker',args);
const inspect=name=>JSON.parse(docker('inspect',name))[0];
const compose=r=>['compose','--profile','*','--project-directory',r.cwd,'-p',r.project,...r.files.flatMap(f=>['-f',f])];
const service=r=>JSON.parse(docker(...compose(r),'config','--format','json')).services[r.service];
const hash=s=>{const {image,...rest}=s;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
const reportPath=dir+'/release.json';
function idle(r){
 const config=fs.readFileSync(r.config,'utf8');
 const min=Number(config.match(/^min-port=(\d+)$/m)?.[1]),max=Number(config.match(/^max-port=(\d+)$/m)?.[1]);
 assert(Number.isInteger(min)&&min>1024&&max>=min&&max-min<2048,'Bounded native relay range required');
 const ports=command('ss',['-H','-u','-a','-n']).split('\n').filter(Boolean).map(line=>Number(line.trim().split(/\s+/)[3]?.match(/:(\d+)$/)?.[1]));
 assert(ports.every(Number.isFinite),'Unexpected socket output; refusing ambiguous idle check');
 const count=ports.filter(p=>p>=min&&p<=max).length;
 assert.equal(count,0,'Active relay allocation: wait, do not interrupt it');
 return {at:new Date().toISOString(),aggregateRelaySockets:count};
}
if(process.argv[2]==='prepare'){
 assert.equal(inspect(newRef).Id,newImage);
 const stage=JSON.parse(command('env',['UTILIBRE_COTURN_TEST_SUBNET=198.19.250.0/28','python3','deployment/maintenance/native-final/check-coturn.py',newRef]));
 assert.equal(stage.passed,true);assert.equal(stage.image,newImage);
 const specs=[
  ['utilibre-turn-option-turn-1','/opt/utilibre/turn/turnserver.conf',3479],
  ['utilibre-galene-turn-turn-1','/opt/utilibre/pack-data/galene-turn/turnserver.conf',3478],
 ];
 const rows=specs.map(([name,config,port])=>{
  const x=inspect(name),l=x.Config.Labels;assert.equal(x.Image,oldImage);
  const r={name,config,port,oldRef,oldImage,newRef,newImage,cwd:l['com.docker.compose.project.working_dir'],project:l['com.docker.compose.project'],service:l['com.docker.compose.service'],files:l['com.docker.compose.project.config_files'].split(',')};
  const s=service(r);assert.equal(s.image,oldRef);r.configHash=hash(s);return r;
 });
 fs.writeFileSync(reportPath,JSON.stringify({date:new Date().toISOString(),status:'prepared',stage,rows},null,2)+'\n');
 console.log('Two image-only relay releases prepared; native stage passed. No live mutation.');
}else if(process.argv[2]==='apply'){
 const report=JSON.parse(fs.readFileSync(reportPath));
 const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 for(const r of report.rows){
  assert.equal(service(r).image,newRef);assert.equal(hash(service(r)),r.configHash);
  assert.equal(inspect(newRef).Id,newImage);
  r.idleChecks=[idle(r)];await new Promise(resolve=>setTimeout(resolve,1000));r.idleChecks.push(idle(r));
  await releaseReviewedRow(r,inspect(r.name).Image,{save,inspect:async name=>{
   const x=inspect(name);
   if(name===r.name&&x.State?.Running){
    try{docker('exec',r.name,'turnutils_stunclient','-p',String(r.port),'10.10.1.43');x.State.Health={Status:'healthy'};}catch{x.State.Health={Status:'starting'};}
   }return x;
  },start:()=>docker(...compose(r),'up','-d','--no-deps','--no-build','--pull','never',r.service),rollback:()=>{
   // Restore only this image pin; never restore data or unrelated configuration.
   for(const file of r.files){const text=fs.readFileSync(file,'utf8');if(text.includes(newRef))fs.writeFileSync(file,text.replaceAll(newRef,oldRef));}
   docker(...compose(r),'up','-d','--no-deps','--no-build','--pull','never',r.service);
  }});
  console.log(r.name+' patched and native STUN responsive.');
 }
 report.status='passed';report.completedAt=new Date().toISOString();save();
}else throw Error('Use prepare, change only the two reviewed image pins, then apply.');
