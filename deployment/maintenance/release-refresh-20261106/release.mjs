// Explicit operator release of this reviewed batch only; never a scheduled updater.
// Reuse the existing Compose/health/rollback adapter. No dependency resolution.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,statfsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {existingComposeArgs,checkExistingGroup,recreateExistingGroup,releaseGroup,replaceImagePins} from '../language-final/release.mjs';
import {verifyWakapiUpgrade,upgradeRoot} from '../releases-20261111/upgrade-policy.mjs';
import {verifyHeldUpgrade,heldRoot} from '../releases-20261111/held-policy.mjs';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';
process.umask(0o077);
const wakapiUpgrade=process.argv[4]==='--wakapi-nov11';
const heldUpgrade=process.argv[4]==='--held-nov11';
assert.equal(process.argv.length,wakapiUpgrade||heldUpgrade?5:4);
const root=heldUpgrade?heldRoot:wakapiUpgrade?upgradeRoot:'/var/lib/utilibre-maintenance/releases-20261106';
const specs={
 drawio:{name:'utilibre-toolbox-drawio-1',oldImage:'sha256:4924fd72d26336b8f3ebb4ace5f1e4d05752baf7df903d2c5b19c548fd0d4836',newImage:'sha256:b827f5fbd979df27f809cb20580a916d14893dbc8047cd37d2349024fd1e0363',newRef:'utilibre-drawio:32.6.10-20261106',url:'https://draw.utilibre.org/'},
 glyphr:{name:'utilibre-creative-batch-glyphr-1',oldImage:'sha256:e692e6a442ec4896bd4baaadd0e1dc541f67d4f126dbc513f516f32a90d640d8',newImage:'sha256:0d4d70dfdb3886012dc1d72f4a66be5e236fd9bb7cbe3289aefd662a4209c2d4',newRef:'utilibre-glyphr:2.10.8-20261106',url:'https://glyphr.utilibre.org/'},
 freshrss:{name:'utilibre-services-freshrss-1',oldImage:'sha256:fa0df9fc48de5bde089e96d40b4adf6471cca4e75172ca7bc6a5e48b8a39e373',newImage:'sha256:46aa631691b25d7afddb1c9d6d39fa379529d12c50792875be7ddcad91dc2be8',newRef:'utilibre-freshrss:1.30.4-20261106',url:'https://rss.utilibre.org/',mirror:'/home/ubuntu/freetools/deployment/utilibre/compose.yaml'},
 radicale:{name:'utilibre-calendar-radicale-1',oldImage:'sha256:22f35a8562adba07ab50324c56cf290f2f183012b708abcc0b412a8d9561821a',newImage:'sha256:599726db2bc5f925d833fdfbbf93cf1b2e485bf304d44ca9b8129effececa476',newRef:'utilibre-radicale:3.9.0-20261106',url:'https://calendar.utilibre.org/dav/.web/'},
};
if(wakapiUpgrade){
 assert.equal(process.argv[2],'wakapi');const {s}=verifyWakapiUpgrade();
 specs.wakapi={name:'utilibre-expanded-wakapi-1',oldImage:s.base,newImage:s.imageId,newRef:s.candidate,url:'https://wakapi.utilibre.org/'};
 process.on('exit',acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock'));
}
if(heldUpgrade){
 const {s}=verifyHeldUpgrade(process.argv[2]);specs[process.argv[2]]=s;
 process.on('exit',acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock'));
}
const key=process.argv[2],s=specs[key];assert(s&&process.argv[3]==='--apply','Select a reviewed service and --apply');
const run=(cmd,args)=>{try{return execFileSync(cmd,args,{encoding:'utf8',timeout:180000,maxBuffer:32*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}});}catch{throw Error('Release command failed; configuration/output withheld');}};
const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0],json=p=>JSON.parse(readFileSync(root+'/'+p));
const hash=x=>createHash('sha256').update(x).digest('hex');
const shape=x=>{const {image,...rest}=x;return hash(JSON.stringify(rest));};
assert.equal(inspect(s.newRef).Id,s.newImage);
if(!wakapiUpgrade&&!heldUpgrade)assert.deepEqual(json(key+'-scan-comparison.json').newFindings,[]);
if(key==='glyphr')for(const f of ['glyphr-task.json','glyphr-import.json']){const r=json('glyphr-checks/'+f);assert(!r.failure);assert.deepEqual(r.errors,[]);assert.deepEqual(r.external,[]);}
if(key==='freshrss'){const r=json('freshrss-checks/application.json');assert(r.passed&&r.imageId===s.newImage);assert(json('freshrss-browser-restore-p5j80rro/result.json').passed);}
if(key==='radicale'){const r=json('radicale-checks/result.json');assert(r.passed&&r.image===s.newImage);}
if(key==='drawio'){const r=json('drawio-checks/native.json');assert.equal(r.results.length,1);assert.equal(r.results[0].result,'PASS');assert.deepEqual(r.results[0].external,[]);assert.equal(r.results[0].uploads,0);}
const before=inspect(s.name);assert([s.oldImage,s.newImage].includes(before.Image),'Running artifact differs from reviewed predecessor');
const labels=before.Config.Labels;
const g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),before:[],rows:[{...s,oldRef:before.Config.Image,service:labels['com.docker.compose.service'],oldContainerId:before.Id,oldRestartCount:before.RestartCount}]};
const checkPublic=()=>{run('curl',['--fail','--silent','--show-error','--location','--max-time','20','--output','/dev/null',s.url]);};
if(before.Image===s.newImage){await checkExistingGroup(g,'new');checkPublic();console.log(key+': exact candidate already running; no restart');process.exit(0);}
const directory=root+'/'+key+'-release';mkdirSync(directory,{recursive:true,mode:0o700});
const originals=new Map(),changed=new Map();
const config=()=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services[g.rows[0].service];
const originalConfig=config();assert.equal(originalConfig.image,g.rows[0].oldRef);
const configHash=shape(originalConfig);assert.equal(inspect(g.rows[0].oldRef).Id,s.oldImage);
const files=[...new Set([...g.files,...(s.mirror?[s.mirror]:[])])];
for(const [i,file] of files.entries()){
 const value=readFileSync(file,'utf8'),result=replaceImagePins(value,[{from:g.rows[0].oldRef,to:s.newRef}]);
 if(result.replaced){assert.equal(result.replaced,1);originals.set(file,value);changed.set(file,result.text);writeFileSync(directory+'/config-'+i+'.before',value);}
}
assert(originals.size>0);const space=statfsSync(root);assert(space.bavail*space.bsize>5*1024**3);
// Recovery copies of saved account work only. Never include temporary sharing data.
if(key==='freshrss'){
 const dump=execFileSync('docker',['exec','utilibre-services-postgres-1','pg_dump','-U','postgres','-Fc','freshrss'],{timeout:120000,maxBuffer:256*1024**2,stdio:['ignore','pipe','pipe']});
 writeFileSync(directory+'/database.dump',dump);run('tar',['-C','/opt/utilibre/data','-czf',directory+'/saved-account-files.tar.gz','freshrss']);
}
if(key==='radicale')run('tar',['-C','/opt/utilibre','-czf',directory+'/saved-account-files.tar.gz','calendar-data','calendar-private']);
if(key==='wakapi'){
 // Native online SQLite backup. Never print records or read unrelated accounts.
 run('python3',['-c',"import sqlite3,sys; source=sqlite3.connect('file:/opt/utilibre/expanded-data/wakapi/wakapi.db?mode=ro',uri=True); destination=sqlite3.connect(sys.argv[1]); source.backup(destination); assert destination.execute('PRAGMA integrity_check').fetchone()==('ok',); destination.close(); source.close()",directory+'/wakapi-before.sqlite']);
}
if(heldUpgrade&&['chhoto','bytestash','candlr','kitchenowl'].includes(key)){
 const db={chhoto:'/opt/utilibre/chhoto-data/urls.sqlite',bytestash:'/opt/utilibre/community-data/bytestash/snippets.db',candlr:'/opt/utilibre/records/data/candlr/candlr.db',kitchenowl:'/opt/utilibre/kitchenowl/data/database.db'}[key];
 run('python3',['-c',"import sqlite3,sys; a=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True); b=sqlite3.connect(sys.argv[2]); a.backup(b); assert b.execute('PRAGMA integrity_check').fetchone()==('ok',); b.close(); a.close()",db,directory+'/before.sqlite']);
 if(['candlr','kitchenowl'].includes(key))run('tar',['-C',key==='candlr'?'/opt/utilibre/records/data/candlr':'/opt/utilibre/kitchenowl/data','--exclude=*.db','--exclude=*.db-wal','--exclude=*.db-shm','-czf',directory+'/saved-account-files.tar.gz','.']);
}
function requireIdleBoard(){
 if(!heldUpgrade||key!=='wbo')return;
 // Aggregate only: no board names, contents or persistent temporary-data copies.
 run('python3',[new URL('../releases-20261111/check-wbo-idle.py',import.meta.url).pathname]);
}
const save=async()=>writeFileSync(directory+'/result.json',JSON.stringify({date:new Date().toISOString(),...g,configHash,files:[...originals.keys()],dataRollback:'Image rollback does not restore data; recovery copies retained privately'},null,2)+'\n');
let pausedGateway=false;
try {
if(heldUpgrade&&key==='wbo'){
 const gateway=inspect('utilibre-collaboration-pilot-gateway-1');assert(!gateway.State.Paused);
 requireIdleBoard();docker('pause',gateway.Id);pausedGateway=true;requireIdleBoard();
}
await releaseGroup(g,{
 preflight:async()=>{
  requireIdleBoard();
  assert.equal(inspect(s.name).Image,s.oldImage);assert.equal(shape(config()),configHash);
  for(const [f,v] of originals)assert.equal(readFileSync(f,'utf8'),v,'Concurrent configuration edit');
 },save,recreate:async()=>{
  if(!g.rollback){
   for(const [f,v] of changed)writeFileSync(f,v);
   assert.equal(shape(config()),configHash);assert.equal(config().image,s.newRef);
  }
  await recreateExistingGroup(g);
 },
 gate:async version=>{
  await checkExistingGroup(g,version);
  if(pausedGateway){docker('unpause','utilibre-collaboration-pilot-gateway-1');pausedGateway=false;}
  checkPublic();
 },
 rollbackPins:async()=>{for(const [f,v] of changed)assert.equal(readFileSync(f,'utf8'),v,'Concurrent edit prevents automatic rollback');for(const [f,v] of originals)writeFileSync(f,v);},
});
} finally {if(pausedGateway)docker('unpause','utilibre-collaboration-pilot-gateway-1');}
console.log(key+': deployed exact tested artifact; health and public route passed');
