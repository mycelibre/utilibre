// Finite image-only follow-up. Never prints resolved environments or live data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {specs,output as originalOutput} from './specs.mjs';
import {profile as bookplateProfile,current as oct22} from '../next-leaves-final/profile.mjs';
import {spec as gathioTarget} from '../security-20261022/gathio.mjs';
import {specs as redirectTargets,output as redirectOutput} from '../security-20261022/redirects.mjs';
import {spec as privatebinTarget,output as privatebinOutput} from '../security-20261022/privatebin-nginx.mjs';
const redirects=process.argv.includes('--redirects');
const privatebinNginx=process.argv.includes('--privatebin-nginx');
assert([oct22,redirects,privatebinNginx].filter(Boolean).length<=1,'Choose one finite release cohort');
const output=privatebinNginx?privatebinOutput:redirects?redirectOutput:oct22?'/var/lib/utilibre-maintenance/security-20261022':originalOutput;
import {canonical} from '../go-final/release.mjs';
import {plannedPins} from '../go-leaf-final/release.mjs';
import {namespaceDependents,readinessSeconds,releaseGroup} from '../language-final/release.mjs';
process.umask(0o077);
const receipt=output+'/release.json';
const bookplateTarget={key:'bookplate',container:'utilibre-records-bookplate-1',base:bookplateProfile.base,candidate:bookplateProfile.image};
const biblioreadsTarget={key:'biblioreads',container:'utilibre-biblioreads-biblioreads-1',base:'sha256:528889b6b04905f3407d87848e5bd721a3420a9db267a1d879b2fa8305773947',candidate:'utilibre-biblioreads:9508abc-next15528-security-20261022'};
const clientTargets=[
 {key:'candlr',container:'utilibre-records-candlr-1',base:'sha256:c90793134becd0f214b8ed9d41e54cece1c9ba3fded056f3e5dac5c184a033e2',candidate:'utilibre-candlr:2.0.0-dom3417-security-20261022'},
 {key:'markmap',container:'utilibre-browser-tools-markmap-1',base:'sha256:4f00d172549eb379dc344f42d07887ef8c050888f2b40f8bd6851ff60cc4d843',candidate:'utilibre-markmap:0.18.12-dom3417-security-20261022'},
 {key:'degoog',container:'utilibre-evaluation-degoog-1',base:'sha256:c0ef68a99e6140dddfd306f4c87ced31fccb20d7ed7d9025877b847cfb7ef740',candidate:'utilibre-degoog:1.0.0-dom3417-security-20261022'},
 {key:'spliit',container:'utilibre-spliit-app-1',base:'sha256:ba07130dc83b69f81a8711bdb9031556d1407cca4e8e4e85459072825e7a5250',candidate:'utilibre-spliit:1.29.0-next1641-security-20261022'},
 {key:'rallly',container:'utilibre-community-rallly-1',base:'sha256:8328589dc8b274ffc20834978d8ba27d819a21f6f0685a37aa568549ce982485',candidate:'utilibre-rallly:4.15.4-next1641-security-20261022'},
 {key:'grist',container:'utilibre-records-grist-1',base:'sha256:938a84a71e69b3a591dc05e3e2b27496ae96110a943680c83ab9298b4c990683',candidate:'utilibre-grist:1.7.21-dom3417-security-20261022'},
];
const targets=privatebinNginx?[privatebinTarget]:redirects?redirectTargets:oct22?[bookplateTarget,gathioTarget,biblioreadsTarget,...clientTargets]:[...specs,{key:'projects',container:'utilibre-projects-app-1',base:'sha256:6241eed79c9e9802ab7069dd34002a106771f1a169799b479709d7f3fd5acd8f',candidate:'utilibre-projects:455aa274-redis-example-security-20261012'},bookplateTarget];
const run=(exe,args)=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded release operation failed; command output withheld.');}};
const docker=(...args)=>run('docker',args);
// Whitelist only operational fields. In particular, never fetch Config.Env.
const format='{"Id":{{json .Id}},"Name":{{json .Name}},"Image":{{json .Image}},"Config":{"Labels":{{json .Config.Labels}},"Healthcheck":{{json (index .Config "Healthcheck")}}},"State":{"Running":{{json .State.Running}},"StartedAt":{{json .State.StartedAt}},"Health":{{json (index .State "Health")}}},"RestartCount":{{json .RestartCount}},"HostConfig":{"NetworkMode":{{json .HostConfig.NetworkMode}}}}';
const inspect=n=>JSON.parse(docker('inspect','--format',format,n));
const image=n=>docker('image','inspect','--format','{{.Id}}',n);
function noDependents(name){const all=docker('inspect','--format',format,...docker('ps','-q').split('\n')).split('\n').map(s=>JSON.parse(s));assert.deepEqual(namespaceDependents(all,new Set([name])),[],'Unreviewed namespace dependent');}
const compose=g=>['compose','--profile','*','--project-directory',g.cwd,...(g.key==='rallly'?['--env-file',g.cwd+'/.env.rallly']:[]),'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services[g.service];
const hash=s=>{const{image,...rest}=s;return createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex');};
const urls={admin:['https://design.utilibre.org/'],degoog:['http://127.0.0.1:3143/readyz','https://degoog.utilibre.org/'],candlr:['http://10.10.1.43:3228/login','https://candlr.utilibre.org/login'],projects:['http://127.0.0.1:3217/','https://projects.utilibre.org/'],bookplate:['http://10.10.1.43:3229/','https://bookplate.utilibre.org/']};
export function fresh(date){const n=Date.parse(date);assert(Number.isFinite(n)&&n<=Date.now()+300000&&Date.now()-n<86400000,'Native evidence must be recent');}
export function evidence(s,b,n,l){
 assert.equal(b.passed,true);assert.equal(b.configurationUnchanged,true);
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(b.container,s.container);
 assert(/^sha256:[a-f0-9]{64}$/.test(b.imageId));
 for(const r of [n,l]){assert.equal(r.passed,true);assert.equal(r.imageId,b.imageId);fresh(r.date);}
 assert.equal(n.libraryGate,true);assert.equal(n.productionChanged,false);
 assert.equal(n.applicationParity.length,2);assert.equal(n.applicationParity[0].imageId,s.base);assert.equal(n.applicationParity[1].imageId,b.imageId);
 return b.imageId;
}
function candidateEvidence(s){
 if(privatebinNginx){
  const read=n=>JSON.parse(fs.readFileSync(output+'/'+n+'.json')),b=read('build'),n=read('native'),v=read('scan-gate');
  for(const r of [b,n,v]){fresh(r.date);assert(r.passed&&r.imageId===b.imageId);}
  assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert(b.applicationUnchanged&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);assert.equal(b.php,'8.5.12');assert.equal(b.nginx,'1.30.6');
  assert.equal(n.rawBytes,25000000);assert(n.checks.some(t=>t.includes('SHA-256 matched'))&&n.checks.some(t=>t.includes('one week'))&&n.checks.some(t=>t.includes('purge')));
  assert.equal(v.rows[0].imageId,s.base);assert.equal(v.rows[1].imageId,b.imageId);assert.deepEqual(v.rows[1].findings,[]);return b.imageId;
 }
 if(redirects){
  const read=n=>JSON.parse(fs.readFileSync(output+'/'+s.key+'/'+n+'.json'));
  const b=read('build'),r=read('regression'),n=read(s.key==='kuma'?'application':'native');
  for(const x of [b,r,n]){fresh(x.date);assert.equal(x.passed,true);assert.equal(x.imageId,b.imageId);}
  assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(b.configurationUnchanged,true);
  assert.equal(b.packages.length,1);assert.equal(b.packages[0].name,'follow-redirects');assert.equal(b.packages[0].version,'1.16.1');
  assert.equal(b.adapter,null);assert(b.unchangedOtherAppFiles>100&&b.changedFiles<20);
  assert.equal(r.base,s.base);assert.equal(r.newHighCritical,0);assert.equal(r.followRedirectsFindings,0);assert.equal(r.noExternalRequests,true);
  assert.equal(r.rows.length,2);assert.equal(r.rows[0].imageId,s.base);assert.equal(r.rows[1].imageId,b.imageId);
  assert.equal(r.rows[0].native.sensitiveObjectHeadersStripped,false);assert.equal(r.rows[0].native.arrayHeadersSafe,false);
  for(const k of ['sameOriginPreservesCredentials','ordinaryHeaderPreserved','sensitiveObjectHeadersStripped','arrayHeadersSafe'])assert.equal(r.rows[1].native[k],true);
  if(s.key==='actual'){for(const k of ['nativePasswordLogin','anonymousReadDenied','nativeZipExportAndImport','nativeServerSyncAndDownload','reloadPersistence','narrowConnectionCsp'])assert.equal(n[k],true);assert.deepEqual(n.externalRequests,[]);assert.equal(n.productionChanged,false);}
  if(s.key==='kuma'){assert(n.nativeSetupLogin&&n.noNotificationSent&&n.fictionalDataOnly);assert.equal(n.network,'none');}
  if(s.key==='grist-redirects'){assert.equal(n.checks.length,4);assert(n.checks.every(x=>x.passed));assert.equal(n.productionChanged,false);assert.equal(n.network,'internal; no external browser origins');}
  return b.imageId;
 }
 if(oct22&&s.key==='grist'){
  const dir=output+'/grist/',read=name=>JSON.parse(fs.readFileSync(dir+name+'.json'));
  const b=read('build'),n=read('native'),v=read('grist-verify'),d=read('dom-regression');
  for(const r of [b,n,v]){fresh(r.date);assert.equal(r.passed,true);assert.equal(r.imageId,b.imageId);}
  fresh(d.date);assert(d.passed&&d.rows[0].imageId===s.base&&d.rows[1].imageId===b.imageId);
  assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(b.configurationUnchanged,true);assert.equal(v.base,s.base);assert.equal(v.dompurify,'3.4.17');assert.equal(v.dompurifyFindings,0);assert.equal(v.counts.CRITICAL,0);
  assert.equal(n.checks.length,4);assert(n.checks.every(r=>r.passed));assert.equal(n.network,'internal; no external browser origins');assert.equal(n.productionChanged,false);
  assert(v.onlyApplicationTreeChanged&&v.unchangedRuntime);return b.imageId;
 }
 if(oct22&&['spliit','rallly'].includes(s.key)){
  const dir=output+'/'+s.key+'/',read=name=>JSON.parse(fs.readFileSync(dir+name+'.json'));
  const b=read('build'),n=read('native'),v=read(s.key+'-verify');
  for(const r of [b,n,v]){fresh(r.date);assert(r.passed||r.status==='passed');assert.equal(r.imageId,b.imageId);}
  assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(b.configurationUnchanged,true);assert.equal(v.base,s.base);assert.equal(v.next,'16.4.1');assert.equal(v.nextFindings,0);assert.equal(v.publicMigrationsNativeAdminHelpersIdentical,true);
  if(s.key==='spliit')assert.equal(v.counts.CRITICAL,0);
  else {const a=read('critical-attribution');fresh(a.date);assert(a.passed&&a.imageId===b.imageId&&a.base===s.base&&a.id==='CVE-2023-45853'&&a.package==='zlib1g'&&a.status==='not-affected'&&Date.parse(a.expiresAt)>Date.now());assert.equal(v.counts.CRITICAL,1);}
  if(s.key==='spliit'){for(const k of ['nativeGroupAndExpenseCreated','jsonCsvExport','reloadPersistence','nativeExpenseDeletion'])assert.equal(n[k],true);assert.deepEqual(n.externalBrowserOrigins,[]);assert.equal(v.counts.HIGH,0);}
  else {for(const k of ['nativeMigrations','fictionalInviteRendered','nativePasswordSetupAndLogin','twoIndependentAccounts','nativePollCreated','guestVoteSaved','reloadPersistence','otherAccountAndGuestDeleteDenied','ownerDeleteAllowed'])assert.equal(n[k],true);assert.equal(n.network,'internal; no external browser origins');}
  return b.imageId;
 }
 if(oct22&&['candlr','markmap','degoog'].includes(s.key)){
  const dir=output+'/'+s.key+'/',read=name=>JSON.parse(fs.readFileSync(dir+name+'.json'));
  const b=read('build'),n=read('native'),v=read(s.key+'-verify');
  for(const r of [b,n,v]){fresh(r.date);assert.equal(r.passed,true);assert.equal(r.imageId,b.imageId);}
  assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(b.configurationUnchanged,true);
  assert.equal(v.base,s.base);assert.equal(v.onlyApplicationTreeChanged,true);assert.equal(v.dompurify,'3.4.17');assert.equal(v.dompurifyFindings,0);assert.equal(v.counts.CRITICAL,0);assert.equal(n.productionChanged,false);
  if(['candlr','degoog'].includes(s.key))evidence(s,b,n,read('libraries'));
  else {assert.equal(n.externalRequests,0);assert.equal(v.counts.HIGH,0);assert(n.checks.includes('SVG reopen')&&n.checks.includes('hostile imports'));}
  return b.imageId;
 }
 if(s.key==='biblioreads'){
  const dir=output+'/biblioreads/',read=name=>JSON.parse(fs.readFileSync(dir+name+'.json'));
  const b=read('biblioreads-image'),n=read('native'),v=read('biblioreads-verify');
  for(const r of [b,n,v]){fresh(r.date);assert.equal(r.passed,true);assert.equal(r.imageId,b.imageId);}
  assert.equal(b.base,s.base);assert.equal(b.image,s.candidate);assert.equal(b.unchangedRuntime,true);
  assert.equal(v.base,s.base);assert.equal(v.onlyApplicationTreeChanged,true);assert.equal(v.faviconAndPrivacyWrapperIdentical,true);assert.equal(v.next,'15.5.28');assert.equal(v.nextFindings,0);assert.equal(v.counts.CRITICAL,0);assert.equal(v.counts.HIGH,0);
  for(const key of ['publicSearchBookAndCover','localLibraryExportDelete','inputDenials','desktopAndMobileEmulation'])assert.equal(n[key],true);
  assert.equal(n.browserThirdParties,0);assert.equal(n.productionChanged,false);return b.imageId;
 }
 if(s.key==='gathio'){
  const read=kind=>JSON.parse(fs.readFileSync(output+'/gathio/'+kind+'.json'));
  const b=read('build'),n=read('native'),d=read('dom-regression'),scan=read('scan');
  for(const r of [b,n,d]){fresh(r.date);assert.equal(r.passed,true);}
  assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(b.configurationUnchanged,true);assert.equal(n.imageId,b.imageId);
  for(const key of ['nativeGathioCreateEdit','invalidEditTokenDenied','imageUpload','icsImportExport','stoppedDatabaseCopyRestore','reopenedOriginalAndImportedEvents'])assert.equal(n[key],true);
  assert.equal(n.productionChanged,false);assert.equal(d.rows.length,2);assert.equal(d.rows[0].imageId,s.base);assert.equal(d.rows[1].imageId,b.imageId);assert.equal(d.rows[0].shadowExpressionRemoved,false);assert.equal(d.rows[1].shadowExpressionRemoved,true);
  assert.equal(scan.Metadata.ImageID,b.imageId);assert(scan.Results.some(r=>r.Type==='node-pkg'&&r.Packages.length>500));assert.equal(scan.Results.flatMap(r=>r.Vulnerabilities||[]).filter(v=>['CRITICAL','HIGH'].includes(v.Severity)).length,0);
  return b.imageId;
 }
 if(s.key==='bookplate'){
  const read=kind=>JSON.parse(fs.readFileSync(bookplateProfile.dir+'/bookplate-'+kind+'.json'));
  const b=read('image'),n=read('native'),v=read('verify');
  for(const r of [b,n,v]){fresh(r.date);assert.equal(r.passed,true);assert.equal(r.imageId,b.imageId);}
  assert.equal(b.base,s.base);assert.equal(b.image,s.candidate);assert.equal(b.unchangedRuntime,true);assert.equal(v.base,s.base);assert.equal(v.onlyApplicationTreeChanged,true);assert.equal(v.publicMigrationsNativeAdminHelpersIdentical,true);assert.equal(v.next,bookplateProfile.next);assert.equal(v.nextFindings,0);assert.equal(v.productionChanged,false);return b.imageId;
 }
 if(s.key==='projects'){
  const r=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/projects-redis-final-20261012/result.json'));
  fresh(r.completedAt);assert.equal(r.status,'passed');assert.equal(r.baseId,s.base);assert.equal(r.candidate,s.candidate);assert.equal(r.allOtherImageFilesUnchanged,true);assert.equal(r.removedFiles,45);assert.equal(r.removedPath,'/app/node_modules/redis/heroku/');assert.equal(r.redisFindingAbsentFromActualCandidateScan,true);assert.equal(r.native.passed,true);assert.equal(r.productionChanged,false);return r.imageId;
 }
 const read=name=>JSON.parse(fs.readFileSync(output+'/'+s.key+'/'+name+'.json'));return evidence(s,read('build'),read('native'),read('libraries'));
}
async function statuses(g){
 const result=[];
 if(g.key==='privatebin-nginx'){const r=await fetch('https://paste.utilibre.org/',{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();return[r.status];}
 if(['actual','kuma'].includes(g.key)){const r=await fetch(g.key==='actual'?'https://budget.utilibre.org/':'https://status.utilibre.org/status/utilibre',{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();return[r.status];}
 if(['grist','grist-redirects'].includes(g.key)){const r=await fetch('https://grist.utilibre.org/',{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();return[r.status];}
 if(['spliit','rallly'].includes(g.key)){const r=await fetch(g.key==='spliit'?'https://expenses.utilibre.org/':'https://poll.utilibre.org/login',{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();return [r.status];}
 if(g.key==='markmap'){const r=await fetch('https://mindmap.utilibre.org/',{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();return [r.status];}
 if(g.key==='biblioreads'){const r=await fetch('https://biblioreads.utilibre.org/',{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();return [r.status];}
 if(g.key==='gathio'){const r=await fetch('https://events.utilibre.org/',{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();return [r.status];}
 if(g.key==='admin')result.push(Number(docker('exec',g.name,'node','-e',"fetch('http://127.0.0.1:3000/',{redirect:'manual'}).then(async r=>{await r.body?.cancel();console.log(r.status)}).catch(()=>process.exit(1))")));
 for(const url of urls[g.key]){const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000)});result.push(r.status);await r.body?.cancel();}
 return result;
}
async function gate(g,which){
 const max=readinessSeconds([inspect(g.name)]);
 for(let i=0;i<max;i++){
  try{const x=inspect(g.name);assert.equal(x.Image,g[which+'Image']);assert(x.State.Running);assert.equal(x.RestartCount,0);assert(Date.now()-Date.parse(x.State.StartedAt)>4000);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');assert.deepEqual(await statuses(g),g.before);
   if(g.key==='projects'){
    run('systemctl',['is-active','--quiet','utilibre-projects-firewall.service']);
    run('iptables',['-w','-C','DOCKER-USER','-j','UTILIBRE-PROJECTS']);
    for(const subnet of ['172.29.148.0/24','172.29.149.0/24']){run('iptables',['-w','-C','UTILIBRE-PROJECTS','-s',subnet,'-j','DROP']);run('iptables',['-w','-C','INPUT','-s',subnet,'-m','conntrack','--ctstate','NEW','-j','DROP']);}
    const r=await fetch('https://projects.utilibre.org/api/projects',{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();assert.equal(r.status,401,'Anonymous project listing denied');
   }
   if(g.key==='bookplate')for(const pathname of ['/api/client-errors','/uploads/','/api/metrics','/s/']){const r=await fetch('https://bookplate.utilibre.org'+pathname,{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();assert.equal(r.status,404,'Private image/sharing/telemetry boundary');}
   return;}
  catch{if(i===max-1)throw Error(g.key+': live image/health/route gate failed');await new Promise(r=>setTimeout(r,1000));}
 }
}
export function planReleasePins(active,mirrors,from,to){
 assert(new Set([...active,...mirrors].map(f=>f.file)).size===active.length+mirrors.length,'Duplicate release file');
 // One active scalar, plus one independently validated scalar in each mirror.
 // Validate the whole plan before writing any file.
 return [...plannedPins(active,from,to),...mirrors.flatMap(f=>plannedPins([f],from,to))];
}
const pinPlan=(g,from,to)=>planReleasePins(g.files.map(file=>({file,text:fs.readFileSync(file,'utf8')})),(g.mirrorFiles||[]).map(file=>({file,text:fs.readFileSync(file,'utf8')})),from,to);
function repin(g,from,to){for(const e of pinPlan(g,from,to))fs.writeFileSync(e.file,e.text);}
async function main(){
 const[mode,...keys]=process.argv.slice(2).filter(a=>!['--oct22','--redirects','--privatebin-nginx'].includes(a));assert(['prepare','apply','retry'].includes(mode));assert(keys.length&&new Set(keys).size===keys.length);for(const k of keys)assert(targets.some(s=>s.key===k));
 const report=fs.existsSync(receipt)?JSON.parse(fs.readFileSync(receipt)):{groups:[],status:'preparing'};
 const save=()=>fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');
 for(const key of keys){
  if(mode==='prepare'){
   assert(!report.groups.some(g=>g.key===key),'Do not overwrite a release receipt');
   const s=targets.find(s=>s.key===key),newImage=candidateEvidence(s);assert.equal(image(s.candidate),newImage);
   const imageConfig=id=>createHash('sha256').update(docker('image','inspect','--format','{{json .Config}}',id)).digest('hex');assert.equal(imageConfig(newImage),imageConfig(s.base),'Image configuration changed');
   const x=inspect(s.container),l=x.Config.Labels;assert.equal(x.Image,s.base);
   const g={key,name:s.container,oldImage:s.base,newImage,newRef:s.candidate,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),service:l['com.docker.compose.service'],preparedAt:new Date().toISOString(),status:'prepared'};
   if(key==='privatebin-nginx'&&!g.files.includes('/home/ubuntu/freetools/deployment/utilibre/compose.yaml'))g.mirrorFiles=['/home/ubuntu/freetools/deployment/utilibre/compose.yaml'];
   const c=config(g);g.oldRef=c.image;assert.equal(image(g.oldRef),g.oldImage);g.configHash=hash(c);g.before=await statuses(g);assert(g.before.every(v=>v>=200&&v<400));
   noDependents(g.name);
   pinPlan(g,g.oldRef,g.newRef);await gate(g,'old');report.groups.push(g);save();console.log(key+': prepared; production unchanged');continue;
  }
  const g=report.groups.find(g=>g.key===key);assert(g&&Date.now()-Date.parse(g.preparedAt)<86400000);
  if(mode==='retry'&&g.status==='failed'){
   assert.equal(g.rollback,'verified');assert.equal(config(g).image,g.oldRef);assert.equal(hash(config(g)),g.configHash);assert.equal(candidateEvidence(targets.find(s=>s.key===key)),g.newImage);pinPlan(g,g.oldRef,g.newRef);await gate(g,'old');
   (g.attempts??=[]).push({date:new Date().toISOString(),previousStatus:'failed',rollback:'verified',reason:'Explicit retry after correction and complete pin preflight; failed receipt retained'});g.status='prepared';save();
  }
  assert(['prepared','passed'].includes(g.status));
  if(g.status==='passed'){await gate(g,'new');continue;}
  const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>=8*1024**3,'8 GiB reserve');
  const validate=()=>{assert.equal(image(g.oldRef),g.oldImage);assert.equal(image(g.newRef),g.newImage);const c=config(g);assert.equal(hash(c),g.configHash);assert([g.oldRef,g.newRef].includes(c.image));};let rollback=false;
  await releaseGroup(g,{preflight:async()=>{validate();noDependents(g.name);assert.equal(inspect(g.name).Image,g.oldImage);assert.equal(config(g).image,g.oldRef);pinPlan(g,g.oldRef,g.newRef);await gate(g,'old');},save,recreate:()=>{validate();if(!rollback)repin(g,g.oldRef,g.newRef);assert.equal(config(g).image,rollback?g.oldRef:g.newRef);docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',g.service);},gate:v=>gate(g,v),rollbackPins:()=>{rollback=true;validate();if(config(g).image===g.newRef)repin(g,g.newRef,g.oldRef);}});
  g.completedAt=new Date().toISOString();save();console.log(key+': deployed; exact image, native health and route parity passed');
 }
 report.status=report.groups.length===targets.length&&report.groups.every(g=>g.status==='passed')?'passed':'partial';report.updatedAt=new Date().toISOString();save();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
