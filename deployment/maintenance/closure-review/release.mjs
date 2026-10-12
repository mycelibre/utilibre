// Finite evidence-gated image rollout; only existing image scalars change.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {specs,output} from '../js-closure/specs.mjs';
import {canonical} from '../go-final/release.mjs';
import {replaceImagePins,namespaceDependents,readinessSeconds,releaseGroup} from '../language-final/release.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',file=root+'/closure-release-20261012.json';
const read=p=>JSON.parse(fs.readFileSync(p));
const docker=(...a)=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded Docker operation failed; sensitive configuration output withheld.');}};
const fmt='{"Id":{{json .Id}},"Name":{{json .Name}},"Image":{{json .Image}},"Config":{"Labels":{{json .Config.Labels}},"Healthcheck":{{json (index .Config "Healthcheck")}}},"State":{"Running":{{json .State.Running}},"StartedAt":{{json .State.StartedAt}},"Health":{{json (index .State "Health")}}},"RestartCount":{{json .RestartCount}},"HostConfig":{"NetworkMode":{{json .HostConfig.NetworkMode}}}}';
const inspect=n=>JSON.parse(docker('inspect','--format',fmt,n));
const id=n=>docker('image','inspect',n,'--format','{{.Id}}');
const imageHash=n=>createHash('sha256').update(docker('image','inspect',n,'--format','{{json .Config}}')).digest('hex');
const compose=g=>['compose','--profile','*','--project-directory',g.cwd,...(g.project==='utilibre-community'?['--env-file',g.cwd+'/.env.rallly']:[]),'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const configs=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services;
const hash=s=>{const{image,...rest}=s;return createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex');};
const fresh=r=>assert(Date.now()-Date.parse(r.date||r.checkedAt)<86400000,'Fresh evidence required');
function evidence(key){
 if(['anubis','ferretdb'].includes(key)){
  const b=read(root+'/go-closure-20261012/'+key+'/image.json'),n=read(root+'/go-closure-20261012/'+key+'/native.json');
  fresh(b);fresh(n);assert(b.passed&&b.configurationUnchanged&&n.passed);assert.equal(n.imageId,b.imageId);return b;
 }
 if(key==='authentik'){
  const b=read(root+'/fips-closure-20261012/candidate.json'),n=read(root+'/vendor-stage-20261011/authentik-fips-closure.json');
  fresh(b);fresh(n);assert(b.passed&&b.configurationUnchanged&&b.fipsProviderUnchanged);assert(n.nativePasswordAndTotpReplay&&n.rsaAndEcdsaOAuthCodeExchange);assert.equal(n.imageId,b.imageId);return b;
 }
 const s=specs.find(x=>x.key===key);
 if(key==='simplelogin'||key==='grist'){
  const b=read(root+'/python-closure-20261012/'+key+'-parity.json');fresh(b);assert(b.passed&&b.configurationUnchanged);
  if(key==='simplelogin'){
   const n=read('/opt/utilibre/reports/simplelogin-python-closure-20261012/result.json');assert.equal(n.image,b.candidate);assert(n.fixture_dump_restore&&n.native_auth_csrf_sudo_csv_import_function_export);return b;
  }
  const n=fs.readdirSync(root+'/sandbox-final-20261011').filter(x=>x.startsWith('native-')).map(x=>{try{return read(root+'/sandbox-final-20261011/'+x+'/result.json')}catch{return null}}).find(x=>x?.imageId===b.imageId&&x.passed);assert(n);fresh(n);
  b.base=s.base; // Combined Python overlay over the already verified JS layer.
 }
 assert(s,'Known target required');
 const b=read(output+'/'+key+'/build.json'),l=read(output+'/'+key+'/libraries.json');fresh(b);fresh(l);assert(b.passed&&b.configurationUnchanged&&l.passed);assert.equal(l.imageId,b.imageId);
 if(key==='grist')return {...read(root+'/python-closure-20261012/grist-parity.json'),base:s.base};
 let n;
 if(key==='wishlist'){n=read(output+'/wishlist/wishlist-stage.json');assert(n.nativeAccountCreated&&n.reloadPersistence&&n.anonymousListDenied);}
 else if(key==='rallly'){n=read(output+'/rallly/stage.json');assert(n.nativeMigrations&&n.fictionalInviteRendered);}
 else if(key==='spliit'){n=fs.readdirSync('/opt/utilibre/reports').filter(x=>x.startsWith('app-leaves-spliit-native-')).map(x=>{try{return read('/opt/utilibre/reports/'+x+'/result.json')}catch{return null}}).find(x=>x?.imageId===b.imageId&&x.status==='passed');assert(n?.jsonCsvExport&&n.nativeExpenseDeletion);}
 else {n=read(output+'/'+key+'/native.json');assert(n.passed);}
 fresh(n);assert.equal(n.imageId,b.imageId);return b;
}
const[mode,...keys]=process.argv.slice(2);assert(['prepare','apply'].includes(mode));assert(keys.length);
const report=fs.existsSync(file)?read(file):{date:new Date().toISOString(),groups:[]};
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
async function gate(g,which){
 for(let n=0,max=readinessSeconds(g.rows.map(r=>inspect(r.name)));n<max;n++){
  try{for(const row of g.rows){const x=inspect(row.name);assert.equal(x.Image,g[which+'Image']);assert(x.State.Running);assert.equal(x.RestartCount,0);assert(Date.now()-Date.parse(x.State.StartedAt)>4000);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');}return;}
  catch{if(n===max-1)throw Error('Native image/readiness gate failed');await new Promise(r=>setTimeout(r,1000));}
 }
}
function repin(g,from,to){
 let changes=0;for(const file of [...g.files,...(g.mirrorFiles||[])]){const before=fs.readFileSync(file,'utf8'),r=replaceImagePins(before,[{from,to}]);if(r.replaced){fs.writeFileSync(file,r.text);changes+=r.replaced;}}
 assert(changes>=1,'Exact image pin missing');
}
for(const key of keys){
 if(mode==='prepare'){
  assert(!report.groups.some(g=>g.key===key),'Existing receipt must not be overwritten');const b=evidence(key);assert.equal(id(b.candidate),b.imageId);assert.equal(imageHash(b.base),imageHash(b.imageId));
  const all=docker('inspect','--format',fmt,...docker('ps','-q').split('\n')).split('\n').map(JSON.parse),selected=all.filter(x=>x.Image===b.base);assert(selected.length);assert.deepEqual(namespaceDependents(all,new Set(selected.map(x=>x.Name.slice(1)))),[],'Unreviewed namespace dependent');
  const projects=new Map();for(const x of selected){const l=x.Config.Labels,project=l['com.docker.compose.project'];assert(project);if(!projects.has(project))projects.set(project,{key,project,cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],oldImage:b.base,newImage:b.imageId,newRef:b.candidate,preparedAt:new Date().toISOString(),status:'prepared'});projects.get(project).rows.push({name:x.Name.slice(1),service:l['com.docker.compose.service']});}
  for(const g of projects.values()){
   const config=configs(g);const refs=new Set();for(const r of g.rows){refs.add(config[r.service].image);r.configHash=hash(config[r.service]);}assert.equal(refs.size,1);g.oldRef=[...refs][0];assert.equal(id(g.oldRef),g.oldImage);
   if(key==='rsshub')g.mirrorFiles=['/home/ubuntu/freetools/deployment/utilibre/compose.yaml'];
   await gate(g,'old');report.groups.push(g);save();console.log(key+': prepared, '+g.rows.length+' existing roles');
  }continue;
 }
 const groups=report.groups.filter(g=>g.key===key);assert(groups.length);
 for(const g of groups){
  if(g.status==='passed'){await gate(g,'new');continue;}
  assert.equal(g.status,'prepared');assert(Date.now()-Date.parse(g.preparedAt)<86400000);assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
  const validate=()=>{assert.equal(id(g.oldRef),g.oldImage);assert.equal(id(g.newRef),g.newImage);const c=configs(g);for(const r of g.rows){assert.equal(hash(c[r.service]),r.configHash);assert([g.oldRef,g.newRef].includes(c[r.service].image));}};
  let rollback=false;
  await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save,recreate:()=>{validate();if(!rollback)repin(g,g.oldRef,g.newRef);docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',...g.rows.map(r=>r.service));},gate:v=>gate(g,v),rollbackPins:()=>{rollback=true;validate();repin(g,g.newRef,g.oldRef);}});
  g.completedAt=new Date().toISOString();save();console.log(key+': deployed and healthy');
 }
}
report.updatedAt=new Date().toISOString();report.status=report.groups.every(x=>x.status==='passed')?'passed':'partial';save();
