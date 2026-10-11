// Fixed reviewed runtime replacements; never print Compose environment/secrets.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {releaseReviewedRow} from './release-postgres-vendor-security.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/final-release-20261011';
await mkdir(dir,{recursive:true,mode:0o700});
const late=process.argv.includes('--leaves');
const secret=process.argv.includes('--yopass');assert(!(late&&secret));
const actual=process.argv.includes('--actual');assert([late,secret,actual].filter(Boolean).length<=1);
const definitions=actual?[
 ['utilibre-expanded-actual-1','utilibre-actual:leaves-security-20261011','6859a1cb16fef5f0abc06c4dd4828160dda1157b01c39b6a0751efd7fdfb7a61'],
]:secret?[
 ['utilibre-community-yopass-1','utilibre-yopass:14.10.0-go-openssl-security-20261011','6c193ee48e73d27af3360288fc577803add0743cfc33845e2430153da77b6390'],
]:late?[
 ['utilibre-additions-fmd-1','utilibre-fmd:0.17.0-go-security-20261011','a092682df501ab35bbbde42638c9374131debd7d297a15f1cf3d09495b522858'],
 ['utilibre-community-uptime-kuma-1','utilibre-kuma:2.5.6-leaves-security-20261011','8d78c4ea077c0be5e7407343a405caa613bffa4b0185df671cde75d1f522eb77'],
]:[
 ['utilibre-expanded-penpot-backend-1','utilibre-penpot-backend:2.18.3-runtime-hardening-20261011','8b822a4d33272059d4be9b6023246a449b7ae6c9a4faf931d7477f168c7623b8',6060,'/readyz'],
 ['utilibre-expanded-penpot-exporter-1','utilibre-penpot-exporter:2.18.3-runtime-hardening-20261011','d403d2f058e0f6ab958b232dd717b2864c3c5980441f577e1ac497d5cf5cedd2',6061,'/readyz'],
 ['utilibre-expanded-penpot-frontend-1','utilibre-penpot-frontend:2.18.3-minimal-runtime-20261011','ca4f4adc5367a40e1597bea7d6032de0d08266b6d65cdf083ae4c695d54d23a7',8080,'/'],
 ['utilibre-community-pairdrop-1','utilibre-pairdrop:1.11.2-security-20261011-p4','79198c175c7b064cc78c25912172cdea2b0e5fa066e95190efab1844c16b60a6'],
 ['utilibre-chhoto-app-1','utilibre-chhoto:7.8.3-auditable-20261011','c86c860a692ba503eae2a48bc7c4ad221f7b9d00b7fb158fa8d04b69717a535a',4567,'/api/version'],
 ['utilibre-addy-db-1','utilibre-mariadb:12.2.2-gosu-security-20261011-p2','0b223a2f1ee48d47948f61ce1455a9d80a34509168ba108bbfc444fa93f2fb49'],
 ['utilibre-gathio-postgres-1','utilibre-gathio-documentdb:17.11-0.107.0-gosu-security-20261011-p2','f6ce7041988cd446f0f17af8da87616a836b2983c017177ee1431866142eb5a6'],
];
const docker=(...a)=>{try{return execFileSync('docker',a,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']});}catch{throw Error('Docker command failed; private output withheld.');}};
const inspect=ref=>JSON.parse(docker('inspect',ref))[0];
const args=r=>['compose','--profile','*','--project-directory',r.cwd,...(r.project==='utilibre-community'?['--env-file',r.cwd+'/.env.rallly']:[]),'-p',r.project,...r.files.flatMap(f=>['-f',f])];
const config=r=>JSON.parse(docker(...args(r),'config','--format','json')).services[r.service];
const hash=s=>{const{image,...rest}=s;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
const file=dir+(actual?'/actual.json':secret?'/yopass.json':late?'/leaves.json':'/release.json');
if(process.argv[2]==='prepare'){
 if(actual){
  const native=JSON.parse(await readFile('/opt/utilibre/reports/actual-leaves-native-64d7sh7q/result.json'));assert.equal(native.passed,true);assert.deepEqual(native.externalRequests,[]);assert.equal(native.nativeZipExportAndImport,true);
  const fallback=JSON.parse(await readFile('/opt/utilibre/reports/actual-leaves-native-v8nhuy7v/result.json'));assert.equal(fallback.passed,true);assert.deepEqual(fallback.externalRequests,[]);assert.equal(fallback.nativeZipExportAndImport,true);
 }else if(secret){
  const native=JSON.parse(await readFile('/var/lib/utilibre-maintenance/go-runtime-20261011/yopass-native.json'));assert.equal(native.status,'passed');
  const vendor=JSON.parse(await readFile('/var/lib/utilibre-maintenance/go-runtime-20261011/yopass-vendor.json'));assert.equal(vendor.status,'passed');
 }else if(late){
  const fmd=JSON.parse(await readFile('/var/lib/utilibre-maintenance/go-runtime-20261011/fmd-native.json'));assert.equal(fmd.status,'passed');
  const kuma=JSON.parse(await readFile('/var/lib/utilibre-maintenance/kuma-256-leaves-20261011/result.json'));assert.equal(kuma.status,'passed');assert.equal(kuma.nativeLogin,'passed');
 }else{
 const hardening=JSON.parse(await readFile('/var/lib/utilibre-maintenance/penpot-runtime-20261011/hardening.json'));assert.equal(hardening.status,'passed');
 // Native two-account, export and restored-database evidence stays private.
 const penpot=JSON.parse(await readFile('/opt/utilibre/reports/penpot-native-roundtrip-7yemwo50/result.json'));
 for(const key of ['nativeExportImport','editableBrowserReopen','editSavedAfterReload','otherAccountDenied','nativeFileDeletion'])assert.equal(penpot[key],true);
 assert.equal(JSON.parse(await readFile('/opt/utilibre/reports/chhoto-auditable-native-ygoikkqd/result.json')).passed,true);
 for(const f of ['/var/lib/utilibre-maintenance/pairdrop-ws-20261011/check.json','/var/lib/utilibre-maintenance/gosu-security-20261011/dependencies/checks.json'])assert.equal(JSON.parse(await readFile(f)).status,'passed');
 const gathio=JSON.parse(await readFile('/var/lib/utilibre-maintenance/gathio-20261011/gathio-restore.json'));assert.equal(gathio.image,definitions.at(-1)[1]);assert.equal(gathio.cleanPostgresFilesystemRestore,true);assert.equal(gathio.nativeGathioReopen,true);
 }
 const rows=definitions.map(([name,newRef,id,port,path])=>{
  const x=inspect(name),l=x.Config.Labels;
  const r={name,newRef,newImage:'sha256:'+id,oldRef:x.Config.Image,oldImage:x.Image,port,path,project:l['com.docker.compose.project'],service:l['com.docker.compose.service'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(',')};
  if(actual){r.rollbackRef='utilibre-actual:privacy-rollback-20261011';r.rollbackImage='sha256:a5d3ae8053d03188148239fe68a54116d7c5b6a36cdef3485a0a8e385cf382b3';assert.equal(inspect(r.rollbackRef).Id,r.rollbackImage);}
  assert.equal(inspect(newRef).Id,r.newImage);assert.equal(config(r).image,r.oldRef);r.configHash=hash(config(r));return r;
 });
 await writeFile(file,JSON.stringify({status:'prepared',date:new Date().toISOString(),rows},null,2)+'\n');console.log(rows.length+' exact candidates prepared; no live mutation.');
}else if(process.argv[2]==='apply'){
 const report=JSON.parse(await readFile(file)),save=()=>writeFile(file,JSON.stringify(report,null,2)+'\n');
 for(const r of report.rows){
  assert.equal(config(r).image,r.newRef);assert.equal(hash(config(r)),r.configHash);assert.equal(inspect(r.newRef).Id,r.newImage);
  await releaseReviewedRow(r,inspect(r.name).Image,{save,inspect:async name=>{
   const x=inspect(name);if(name===r.name&&x.State?.Running&&!x.State.Health){
    let good=false;for(const net of Object.values(x.NetworkSettings.Networks))if(net.IPAddress){try{const q=await fetch(`http://${net.IPAddress}:${r.port}${r.path}`,{signal:AbortSignal.timeout(1500)});good=q.ok;await q.body?.cancel();if(good)break;}catch{}}
    x.State.Health={Status:good?'healthy':'starting'};
   }return x;
  },start:()=>docker(...args(r),'up','-d','--no-deps','--no-build','--pull','never',r.service),rollback:async()=>{
   const rollback=dir+'/rollback-'+r.name+'.json';await writeFile(rollback,JSON.stringify({services:{[r.service]:{image:r.rollbackRef||r.oldRef}}}));docker(...args(r),'-f',rollback,'up','-d','--no-deps','--no-build','--pull','never',r.service);
  }});console.log(r.name+' exact reviewed image ready.');
 }
 report.status='passed';report.completedAt=new Date().toISOString();await save();
}else throw Error('Use prepare or apply; Addy app deliberately excluded (guarded SMTP service required).');
