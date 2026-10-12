// Root-authorized two-service release. Never prints Compose environments/data.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,statfsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
process.umask(0o077);
const directory='/var/lib/utilibre-maintenance/sqlite-final-20261011';
const build=JSON.parse(readFileSync(directory+'/build.json'));
const checks=JSON.parse(readFileSync(directory+'/checks.json'));assert.equal(checks.status,'passed');
const receipt=directory+'/release.json';
const cwd='/home/ubuntu/freetools/deployment/community';
const compose=['compose','--profile','*','--project-directory',cwd,'--env-file',cwd+'/.env.rallly','-p','utilibre-community','-f',cwd+'/compose.yaml'];
const command=(name,args,input)=>{try{return execFileSync(name,args,{input,encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe']});}catch{throw Error('Release command failed; command output withheld');}};
const docker=(...args)=>command('docker',args);
const inspect=name=>JSON.parse(docker('inspect',name))[0];
const config=service=>JSON.parse(docker(...compose,'config','--format','json')).services[service];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const configHash=value=>{const{image,...rest}=value;return hash(rest);};
function firewall(){
 assert.equal(command('systemctl',['is-active','utilibre-tools-firewall.service']).trim(),'active');
 command('iptables',['-w','-C','DOCKER-USER','-s','172.29.70.10','-j','UTILIBRE-RSS-OUT']);
 command('iptables',['-w','-C','INPUT','-s','172.29.70.10','-m','conntrack','--ctstate','NEW','-j','DROP']);
}
async function http(url,status){const r=await fetch(url,{signal:AbortSignal.timeout(10000),redirect:'manual'});await r.body?.cancel();assert.equal(r.status,status,'Unexpected live HTTP response');}
async function liveGate(row){
 const x=inspect(row.name);assert.equal(x.Image,row.newImage);assert.equal(x.State.Running,true);assert.equal(x.State.Health?.Status,'healthy');
 assert.equal(docker('exec',row.name,'dpkg-query','-W','-f','${Version}','libsqlite3-0'),build.version);
 assert.equal(docker('exec',row.name,'sha256sum','/usr/lib/x86_64-linux-gnu/libsqlite3.so.0.8.6').split(/\s/)[0],row.librarySha256);
 if(row.service==='uptime-kuma'){
  await http('http://127.0.0.1:3135/status/utilibre',200);
  await http('https://status.utilibre.org/status/utilibre',200);
  for(const path of ['/dashboard','/setup','/socket.io/'])await http('https://status.utilibre.org'+path,404);
  assert.equal(docker('exec',row.name,'dpkg-query','-W','-f','${Version}','python3-jwt'),'2.15.1-1');
 }else{
  firewall();await http('http://10.10.1.43:3120/',200);await http('https://bridge.utilibre.org/',200);
  const php=`foreach(['http://10.10.1.3/','http://169.254.169.254/','http://[fd00::1]/'] as $u){$c=curl_init($u);curl_setopt_array($c,[CURLOPT_NOBODY=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>2,CURLOPT_PROXY=>'']);if(curl_exec($c)!==false)exit(1);curl_close($c);}echo 'blocked';`;
  assert.equal(docker('exec',row.name,'php','-r',php),'blocked');
 }
}
if(process.argv[2]==='prepare'){
 const s=statfsSync(directory);assert(s.bavail*s.bsize>=8*1024**3);firewall();
 const rows=build.rows.filter(r=>r.kind!=='documentdb').map(image=>{
  const service=image.kind==='kuma'?'uptime-kuma':'rssbridge';const name='utilibre-community-'+service+'-1';
  const live=inspect(name),native=checks.rows.find(r=>r.candidateId===image.candidateId);assert(native?.status==='passed');
  assert.equal(live.Image,image.baseId);assert.equal(live.State.Health?.Status,'healthy');assert.equal(config(service).image,image.base);
  assert.equal(inspect(image.candidate).Id,image.candidateId);
  return {name,service,oldRef:image.base,oldImage:image.baseId,newRef:image.candidate,newImage:image.candidateId,configHash:configHash(config(service)),librarySha256:native.librarySha256};
 });
 const backup='/opt/utilibre/community-backups/'+new Date().toISOString().replace(/[:.]/g,'-')+'-sqlite-security';mkdirSync(backup,{mode:0o700});
 command('python3',['-c',`import sqlite3,sys,os\nsrc=sqlite3.connect('file:/opt/utilibre/community-data/kuma/kuma.db?mode=ro',uri=True)\ndst=sqlite3.connect(sys.argv[1])\nsrc.backup(dst)\nassert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'\ndst.close();src.close();os.chmod(sys.argv[1],0o600)`,backup+'/kuma.sqlite']);
 writeFileSync(receipt,JSON.stringify({date:new Date().toISOString(),status:'prepared',kumaNativeBackup:backup+'/kuma.sqlite',backupIntegrity:true,rows},null,2)+'\n');
 console.log('Two exact native-tested services prepared; private native Kuma backup verified.');
}else if(process.argv[2]==='apply'){
 const report=JSON.parse(readFileSync(receipt));assert.equal(report.status,'prepared');assert(Date.now()-Date.parse(report.date)<3600000);
 const save=()=>writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');report.status='applying';save();
 try{
  for(const row of report.rows){
   assert.equal(config(row.service).image,row.newRef);assert.equal(configHash(config(row.service)),row.configHash);assert.equal(inspect(row.newRef).Id,row.newImage);firewall();
   await releaseReviewedRow(row,inspect(row.name).Image,{save,inspect:async name=>{
    const x=inspect(name);
    if(name===row.name&&x.Image===row.newImage&&x.State?.Health?.Status==='healthy'){
     try{await liveGate(row);}catch{x.State.Health.Status='starting';}
    }
    return x;
   },start:()=>docker(...compose,'up','-d','--no-deps','--no-build','--pull','never',row.service),rollback:()=>{
    const override=directory+'/rollback-'+row.service+'.json';writeFileSync(override,JSON.stringify({services:{[row.service]:{image:row.oldRef}}}));
    docker(...compose,'-f',override,'up','-d','--no-deps','--no-build','--pull','never',row.service);
   }});
   row.liveEntryAndAccessGate=true;row.exactLibraryHashVerified=true;save();console.log('Native live release passed: '+row.service);
  }
  report.status='passed';report.completedAt=new Date().toISOString();save();
 }catch(error){report.status='failed';save();throw error;}
}else throw Error('Use prepare, apply only exact two image edits, then apply.');
