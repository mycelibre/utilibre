import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
const dir='/var/lib/utilibre-maintenance/security-20261022/biblioreads',stage=JSON.parse(fs.readFileSync(dir+'/biblioreads-image.json')),name='maintenance-biblioreads-oct22-native';
process.umask(0o077);const run=(p,a,options={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],...options});
assert.equal(run('docker',['ps','-aq','--filter','name=^/'+name+'$']).trim(),'');
try{
 assert(stage.passed);assert.equal(run('docker',['image','inspect','--format','{{.Id}}',stage.image]).trim(),stage.imageId);
 run('docker',['run','-d','--name',name,'--read-only','--memory','512m','--cpus','1','--pids-limit','96','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,size=32m','--tmpfs','/app/.next/cache:rw,size=64m,uid=1000,gid=1000','-p','127.0.0.1:3436:3000','-e','NEXT_TELEMETRY_DISABLED=1',stage.imageId]);
 let ready=false;for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:3436/',{signal:AbortSignal.timeout(1000)});await r.body?.cancel();if(r.status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}assert(ready);
 // Two existing desktop/mobile journeys; only explicitly requested public
 // Goodreads metadata/covers. No saved production library or account is used.
 const log=run(process.execPath,['deployment/community/check-biblioreads.mjs','--candidate-oct22'],{timeout:240000});fs.writeFileSync(dir+'/native.log',log);
 const r={date:new Date().toISOString(),passed:true,imageId:stage.imageId,publicSearchBookAndCover:true,localLibraryExportDelete:true,inputDenials:true,browserThirdParties:0,desktopAndMobileEmulation:true,productionChanged:false,limits:'Controlled candidate; upstream Goodreads retrieval is live and bounded by two scripted journeys. Not a real-phone test.'};fs.writeFileSync(dir+'/native.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
}catch(e){fs.writeFileSync(dir+'/native-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('BiblioReads candidate test failed; private diagnostic retained');}
finally{try{run('docker',['rm','-f',name])}catch{}}
