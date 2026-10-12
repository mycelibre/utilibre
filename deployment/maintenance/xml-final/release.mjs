// Authorized, exact-image-only native library release; preserve all data/config.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,statfsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/xml-final-20261011',path=dir+'/release.json';
const build=JSON.parse(readFileSync(dir+'/build.json'));
const targets={freshrss:['utilibre-services-freshrss-1'],kitchenowl:['utilibre-kitchenowl-app-1'],authentik:['utilibre-identity-server-1','utilibre-identity-worker-1'],rssbridge:['utilibre-community-rssbridge-1'],gathio:['utilibre-gathio-postgres-1']};
const command=(c,args,input)=>{try{return execFileSync(c,args,{input,encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}});}catch{throw Error('Scoped release command failed; output withheld');}};
const docker=(...args)=>command('docker',args),inspect=name=>JSON.parse(docker('inspect',name))[0];
const compose=row=>['compose','--profile','*','--project-directory',row.cwd,...(row.project==='utilibre-community'?['--env-file',row.cwd+'/.env.rallly']:[]),'-p',row.project,...row.files.flatMap(f=>['-f',f])];
const config=row=>JSON.parse(docker(...compose(row),'config','--format','json')).services[row.service];
const hash=value=>{const{image,...rest}=value;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
async function http(url,statuses){const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000)});await response.body?.cancel();assert(statuses.includes(response.status),'Unexpected public/native entry status');}
function guard(){assert.equal(command('systemctl',['is-active','utilibre-tools-firewall.service']).trim(),'active');command('iptables',['-w','-C','DOCKER-USER','-s','172.29.70.10','-j','UTILIBRE-RSS-OUT']);}
async function gate(row){
 const live=inspect(row.name);assert.equal(live.Image,row.newImage);assert.equal(live.State.Health?.Status,'healthy');
 assert.equal(docker('exec',row.name,'dpkg-query','-W','-f','${Version}','libxml2'),row.version);
 assert.equal(docker('exec',row.name,'sha256sum','/usr/lib/x86_64-linux-gnu/libxml2.so.2.9.14').split(/\s/)[0],row.librarySha256);
 if(row.kind==='freshrss'){await http('http://10.10.1.43:3106/',[200,301,302]);await http('https://rss.utilibre.org/',[200,301,302]);}
 if(row.kind==='kitchenowl')await http('https://kitchen.utilibre.org/',[200]);
 if(row.kind==='authentik'&&row.service==='server'){
  await http('https://auth.utilibre.org/-/health/ready/',[200]);
  await http('https://auth.utilibre.org/if/flow/default-authentication-flow/',[200]);
 }
 if(row.kind==='rssbridge'){guard();await http('https://bridge.utilibre.org/',[200]);}
 if(row.kind==='gathio')command('node',['deployment/maintenance/check-gathio-live.mjs']);
}
function saveDump(container,user,db,file){
 const fd=openSync(file,'wx',0o600);
 try{execFileSync('docker',['exec',container,'pg_dump','-U',user,'-d',db,'-Fc'],{timeout:120000,stdio:['ignore',fd,'pipe']});}
 catch{throw Error('Read-only native release backup failed; no rollout');}
 finally{closeSync(fd);}
 command('docker',['run','--rm','--network','none','--cpus','1','--memory','256m','--log-driver','none','--read-only',
  '--mount','type=bind,src='+file+',dst=/fixture.dump,readonly','--entrypoint','pg_restore',inspect(container).Image,'--list','/fixture.dump']);
}
if(process.argv[2]==='prepare'){
 const s=statfsSync(dir);assert(s.bavail*s.bsize>=8*1024**3);guard();
 const auth=JSON.parse(readFileSync('/var/lib/utilibre-maintenance/vendor-stage-20261011/authentik-xml.json'));
 assert(auth.nativePasswordAndTotpReplay&&auth.rsaAndEcdsaOAuthCodeExchange&&auth.imageId===build.rows.find(r=>r.kind==='authentik').candidateId);
 const pg=JSON.parse(readFileSync(dir+'/gathio/database.json'));assert(pg.passed&&pg.nativeDumpRestore&&pg.imageId===build.rows.find(r=>r.kind==='gathio').candidateId);
 const rows=[];
 for(const image of build.rows){
  const test=JSON.parse(readFileSync(dir+'/'+image.kind+'/native.json'));assert(test.passed);assert.equal(test.imageId,image.candidateId);
  for(const name of targets[image.kind]){
   const live=inspect(name),labels=live.Config.Labels;assert.equal(live.Image,image.baseId);assert.equal(live.State.Health?.Status,'healthy');
   const row={name,kind:image.kind,project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(',').filter(file=>file!==dir+'/rollback-'+name+'.json'),service:labels['com.docker.compose.service'],oldRef:image.base,oldImage:image.baseId,newRef:image.candidate,newImage:image.candidateId,version:image.version,librarySha256:test.librarySha256};
   assert.equal(config(row).image,row.oldRef);row.configHash=hash(config(row));assert.equal(inspect(row.newRef).Id,row.newImage);rows.push(row);
  }
 }
 const backups=dir+'/pre-release-'+new Date().toISOString().replace(/[:.]/g,'-');mkdirSync(backups,{mode:0o700});
 saveDump('utilibre-services-postgres-1','postgres','freshrss',backups+'/freshrss.dump');
 saveDump('utilibre-identity-postgresql-1','authentik','authentik',backups+'/authentik.dump');
 saveDump('utilibre-gathio-postgres-1','gathio','postgres',backups+'/gathio.dump');
 command('python3',['-c',`import sqlite3,sys,os\nsrc=sqlite3.connect('file:/opt/utilibre/kitchenowl/data/database.db?mode=ro',uri=True)\ndst=sqlite3.connect(sys.argv[1]);src.backup(dst);assert dst.execute('PRAGMA integrity_check').fetchone()==('ok',);dst.close();src.close();os.chmod(sys.argv[1],0o600)`,backups+'/kitchenowl.sqlite']);
 writeFileSync(path,JSON.stringify({date:new Date().toISOString(),status:'prepared',backups,backupScope:'Native consistent read-only PG dumps with archive validation and SQLite backup/integrity; existing file/config backups preserved; fresh isolated native restore gates recorded separately.',rows},null,2)+'\n');
 console.log('Five applications/six exact roles prepared; native read-only recovery snapshots validated.');
}else if(['apply','resume'].includes(process.argv[2])){
 const report=JSON.parse(readFileSync(path));
 if(process.argv[2]==='resume'){
  assert.equal(report.status,'failed');
  assert(report.rows.filter(row=>row.status==='failed').every(row=>row.rollback?.status==='verified'));
  report.attempts??=[];report.attempts.push({at:new Date().toISOString(),rows:report.rows.map(row=>({name:row.name,status:row.status,phase:row.failurePhase,rollback:row.rollback}))});
 }else assert.equal(report.status,'prepared');
 assert(Date.now()-Date.parse(report.date)<3600000);
 const save=()=>writeFileSync(path,JSON.stringify(report,null,2)+'\n');report.status='applying';save();
 try{
  for(const row of report.rows){
   assert.equal(config(row).image,row.newRef);assert.equal(hash(config(row)),row.configHash);assert.equal(inspect(row.newRef).Id,row.newImage);guard();
   await releaseReviewedRow(row,inspect(row.name).Image,{save,delay:()=>new Promise(resolve=>setTimeout(resolve,6000)),inspect:async name=>{
    const live=inspect(name);if(name===row.name&&live.Image===row.newImage&&live.State.Health?.Status==='healthy')await gate(row);return live;
   },start:()=>docker(...compose(row),'up','-d','--no-deps','--no-build','--pull','never',row.service),rollback:()=>{
    const override=dir+'/rollback-'+row.name+'.json';writeFileSync(override,JSON.stringify({services:{[row.service]:{image:row.oldRef}}}));
    docker(...compose(row),'-f',override,'up','-d','--no-deps','--no-build','--pull','never',row.service);
   }});
   row.exactPackageAndLibraryVerified=true;save();console.log('Exact native XML release passed: '+row.kind+'/'+row.service);
  }
  report.status='passed';report.completedAt=new Date().toISOString();save();
 }catch(error){report.status='failed';save();throw error;}
}else throw Error('Use prepare, review/edit exact image pins, then apply.');
