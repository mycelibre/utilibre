// Native gates for the four installer-only candidates, using fictional state.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/npm10-final-20261011';fs.mkdirSync(root,{recursive:true});
const specs=JSON.parse(fs.readFileSync(new URL('./npm10-images.json',import.meta.url)));
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']});}catch{throw Error('Native Docker check failed; configuration output withheld.');}};
const report={status:'running',date:new Date().toISOString(),rows:[],productionChanged:false};
const name='maintenance-npm10-kuma';let created=false;
try{
 for(const s of specs){
  const id=docker('image','inspect','--format','{{.Id}}',s.candidate).trim();
  const proofs=fs.readdirSync('/opt/utilibre/reports').filter(x=>x.startsWith('language-verify-'+s.key+'-')).flatMap(d=>{try{return [{path:'/opt/utilibre/reports/'+d+'/result.json',...JSON.parse(fs.readFileSync('/opt/utilibre/reports/'+d+'/result.json'))}];}catch{return [];}});
  const proof=proofs.find(x=>x.status==='passed'&&x.imageId===id&&x.applicationFilesUnchanged);assert(proof,'Missing exact image byte/native installer proof');
  const row={key:s.key,imageId:id,proof:proof.path,applicationBytesUnchanged:true,nativeOfflineInstaller:true};
  if(s.key==='kuma-npm10'){
   assert.equal(docker('ps','-aq','--filter','name=^/'+name+'$').trim(),'');
   docker('run','-d','--name',name,'--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','512m','--pids-limit','96','-e','UPTIME_KUMA_DB_TYPE=sqlite','--tmpfs','/app/data:rw,nosuid,nodev,size=128m,uid=1000,gid=1000','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,mode=1777','--mount','type=bind,src='+path.resolve('deployment/maintenance/sqlite-final/kuma-native.cjs')+',dst=/tmp/kuma-native.cjs,readonly',s.candidate);created=true;
   let ready=false;for(let i=0;i<60;i++){try{docker('exec',name,'node','-e',"fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))");ready=true;break;}catch{}await new Promise(r=>setTimeout(r,1000));}assert(ready);
   assert.match(docker('exec',name,'node','/tmp/kuma-native.cjs'),/authenticated Socket/);
   docker('exec',name,'test','!','-e','/usr/bin/cloudflared');
   docker('rm','-f',name);created=false;
   Object.assign(row,{nativeFreshSetupAndLogin:true,unusedCloudflaredAbsent:true});
  }
  if(s.key==='grist-npm10'){
   const output=cp.execFileSync(process.execPath,['deployment/maintenance/sandbox-final/check-grist.mjs',s.candidate],{encoding:'utf8',timeout:300000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']});
   const native=JSON.parse(output.trim());assert(native.passed&&native.imageId===id);row.nativeGristProof=native.report+'/result.json';
  }
  row.status='passed';report.rows.push(row);
 }
 report.status='passed';
}finally{
 if(created)docker('rm','-f',name);
 report.completedAt=new Date().toISOString();fs.writeFileSync(root+'/native.json',JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({status:report.status,images:report.rows.length,report:root+'/native.json'}));
