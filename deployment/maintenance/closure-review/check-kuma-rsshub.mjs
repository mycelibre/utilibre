import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import {specs,output} from '../js-closure/specs.mjs';
process.umask(0o077);
const followup=process.argv[2]==='cache-followup';
const health=process.argv[2]==='--health',healthRoot='/var/lib/utilibre-maintenance/security-20261028/health';
const zod=process.argv[2]==='--zod',markdown=process.argv[2]==='--markdown';
const postal=process.argv[2]==='--postal'||markdown||zod;assert(!process.argv[2]||followup||postal||health);
const postalRoot='/var/lib/utilibre-maintenance/security-20261028/'+(zod?'zod':markdown?'markdown':'postal');
const cacheRoot='/var/lib/utilibre-maintenance/closure-followup-20261012/cache';
const cacheSpecs=followup?JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/closure-followup-20261012/cache-inventory.json')).specs:[];
const docker=(...a)=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']}).trim();}catch(e){throw Error('Isolated native operation failed: '+String(e.stderr||e.message).slice(0,1500));}};
for(const key of health?['kuma']:postal?['rsshub']:['kuma','rsshub']){
 const s=health?JSON.parse(fs.readFileSync(healthRoot+'/kuma/build.json')):postal?JSON.parse(fs.readFileSync(postalRoot+'/rsshub/build.json')):followup?cacheSpecs.find(s=>s.key===(key==='kuma'?'cache-community-uptime-kuma':'cache-services-rsshub')):specs.find(s=>s.key===key),name='maintenance-closure-'+key;
 assert.equal(docker('ps','-aq','--filter','name=^/'+name+'$'),'','Preserve an existing test container');
 const common=['--network','none','--read-only','--memory','1g','--cpus','1','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,size=64m,mode=1777'];
 try{
  const extra=key==='kuma'?['--user','1000:1000','--tmpfs','/app/data:rw,size=128m,uid=1000,gid=1000','-e','UPTIME_KUMA_DB_TYPE=sqlite','-v',path.resolve('deployment/maintenance/sqlite-final/kuma-native.cjs')+':/check.cjs:ro']:['-e','NODE_ENV=production','-e','CACHE_TYPE=memory','-e','NO_LOGFILES=true','-e','LOGGER_LEVEL=error','-e','DEBUG_INFO=false'];
  docker('run','-d','--name',name,...common,...extra,s.candidate);
  const url=key==='kuma'?'http://127.0.0.1:3001/':'http://127.0.0.1:1200/healthz';let ready=false;
  for(let i=0;i<80;i++){try{docker('exec',name,'node','-e',`fetch(${JSON.stringify(url)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
  if(key==='kuma')assert.match(docker('exec',name,'node','/check.cjs'),/authenticated Socket/);
  const result={date:new Date().toISOString(),imageId:docker('image','inspect',s.candidate,'--format','{{.Id}}'),passed:true,nativeStartup:true,nativeKumaSetupAndLogin:key==='kuma',network:'none',productionChanged:false,limitation:key==='rsshub'?'Native health endpoint plus isolated FTP API contracts; no external feed connector fetched.':'Synthetic local account; email uses separate native MIME contract, not real delivery.'};
  if(postal)result.limitation=zod?'Native health endpoint and separate bounded-container/CJS/ESM Zod checks; no external feed connector fetched.':markdown?'Native health endpoint and separate exact Markdown CJS/ESM parser contracts; no external feed connector fetched.':'Native health endpoint and separate exact MIME parser contracts; no external feed connector fetched.';
  fs.writeFileSync(health?healthRoot+'/kuma/application.json':postal?postalRoot+'/rsshub/application.json':followup?cacheRoot+'/'+s.key+'/application.json':output+'/'+key+'/native.json',JSON.stringify(result,null,2)+'\n');console.log(key+': native gate passed');
 }finally{try{docker('rm','-f',name);}catch{}}
}
