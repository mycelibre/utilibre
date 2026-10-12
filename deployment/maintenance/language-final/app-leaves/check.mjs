import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const root=fileURLToPath(new URL('.',import.meta.url));
const specs=JSON.parse(fs.readFileSync(root+'images.json'));
const dir=fs.mkdtempSync('/opt/utilibre/reports/app-leaves-native-');
const db='maintenance-app-leaves-mariadb',rss='maintenance-app-leaves-rsshub';
const dbImage='sha256:0b223a2f1ee48d47948f61ce1455a9d80a34509168ba108bbfc444fa93f2fb49';
const docker=(args,options={})=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:2*1024**2,stdio:['pipe','pipe','pipe'],...options});
const pause=()=>new Promise(r=>setTimeout(r,500));
const rows=[];let madeDb=false,madeRss=false;
try{
 assert.equal(docker(['ps','-aq','--filter','name=^/'+db+'$']).trim(),'');
 docker(['run','-d','--name',db,'--network','none','--memory','512m','--cpus','1','--pids-limit','128','--log-driver','none','--tmpfs','/var/lib/mysql:rw,size=256m','-e','MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1','-e','MARIADB_DATABASE=fixture','-e','MARIADB_USER=fixture','-e','MARIADB_PASSWORD=fictional-local-only',dbImage]);madeDb=true;
 let ready=false;for(let i=0;i<80;i++){try{docker(['exec',db,'mariadb','-ufixture','-pfictional-local-only','-e','SELECT 1','fixture']);ready=true;break;}catch{await pause();}}assert(ready,'Fresh isolated database startup');
 for(const s of specs){
  const imageId=docker(['image','inspect',s.candidate,'--format','{{.Id}}']).trim();
  const args=['run','--rm','-i','--network',s.library==='mysql2'?'container:'+db:'none','--read-only','--memory','256m','--cpus','1','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=16m,mode=1777','--entrypoint','node',s.candidate,'-',s.path];
  const result=JSON.parse(docker(args,{input:fs.readFileSync(root+(s.library==='mysql2'?'mysql-native.cjs':'zip-native.cjs'))}));
  rows.push({key:s.key,image:s.candidate,imageId,...result});
 }
 const s=specs.find(x=>x.key==='rsshub');
 docker(['run','-d','--name',rss,'--network','none','--read-only','--memory','1536m','--cpus','1','--pids-limit','256','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=64m,mode=1777','-e','CACHE_TYPE=memory','-e','DEBUG_INFO=false','-e','NO_LOGFILES=true','-e','LOGGER_LEVEL=error','-e','ALLOW_USER_SUPPLY_UNSAFE_DOMAIN=false',s.candidate]);madeRss=true;
 ready=false;for(let i=0;i<80;i++){try{docker(['exec',rss,'node','-e',"fetch('http://127.0.0.1:1200/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]);ready=true;break;}catch{await pause();}}assert(ready,'Native RSSHub startup/health with network disabled');
 rows.find(x=>x.key==='rsshub').nativeStartupAndHealth=true;
 const report={status:'passed',date:new Date().toISOString(),rows,productionChanged:false,network:'none; MySQL callers share only isolated database loopback',data:'Fictional UTF-8 records and ZIP only',limitations:['MySQL wire API is tested; deployed Rallly/Spliit use PostgreSQL and Wishlist uses SQLite.','RSSHub upstream connectors were not crawled.','These tests do not claim compiled third-party bundles were rewritten.']};
 fs.writeFileSync(dir+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(dir);
}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stderr||e.stack));throw Error('Native app-leaf gate failed; private report '+dir);}
finally{if(madeRss)docker(['rm','-f',rss]);if(madeDb)docker(['rm','-f',db]);}
