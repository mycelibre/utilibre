// Explicit PHP-only activation using Utilibre's established scoped release and
// rollback machinery. Never rebuilds, pulls, migrates or restores user data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {specs,output} from './specs.mjs';
import {canonical} from '../go-final/release.mjs';
import {replaceImagePins,namespaceDependents,releaseGroup,existingComposeArgs,checkExistingGroup,recreateExistingGroup,existingGroupStatus} from '../language-final/release.mjs';
process.umask(0o077);
const [mode,...keys]=process.argv.slice(2);assert(['prepare','apply','retry'].includes(mode));assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
const run=(exe,args)=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('Release operation failed; credential-bearing output withheld');}};
const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0],image=n=>docker('image','inspect','--format','{{.Id}}',n);
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=c=>{const{image,...rest}=c;return createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex');};
const file=output+'/release.json',read=f=>JSON.parse(fs.readFileSync(f));
const report=fs.existsSync(file)?read(file):{date:new Date().toISOString(),status:'partial',groups:[]};
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
const urls={privatebin:'https://paste.utilibre.org/',fourget:'https://4get.utilibre.org/',freshrss:'https://rss.utilibre.org/',rssbridge:'https://bridge.utilibre.org/',wallabag:'https://wallabag.utilibre.org/',translite:'https://translate.utilibre.org/',binternet:'https://binternet.utilibre.org/',addy:'https://aliases.utilibre.org/',pollaris:'https://pollaris.utilibre.org/'};
async function publicStatus(key){const r=await fetch(urls[key],{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();return r.status;}
function boundaries(g){
 if(g.key==='wallabag'){
  run('systemctl',['is-active','--quiet','utilibre-wallabag.service']);
  const rules=run('iptables',['-S','UTILIBRE-WALLABAG']);assert(rules.includes('-j DROP')&&rules.includes('--dport 3128 -j RETURN'));
 }
 if(g.key==='addy'){
  run('systemctl',['is-active','--quiet','utilibre-addy-smtp.service']);
  const x=inspect('utilibre-addy-app-1'),pid=String(x.State.Pid);assert(+pid>0);
  const allowed=fs.readFileSync(new URL('../../addy/start-smtp.sh',import.meta.url),'utf8').match(/-s ((?:\d+\.){3}\d+)\/32 -j ACCEPT/)?.[1];assert(allowed,'Native relay allowlist not found');
  const chain=run('nsenter',['-t',pid,'-n','iptables','-S','UTILIBRE-SMTP-IN']);assert(chain.includes('-s '+allowed+'/32 -j ACCEPT')&&chain.includes('-j REJECT'));
  assert(run('nsenter',['-t',pid,'-n','iptables','-S','INPUT']).includes('--dport 25 -j UTILIBRE-SMTP-IN'));
  assert(run('nsenter',['-t',pid,'-n','ip6tables','-S','INPUT']).includes('--dport 25 -j REJECT'));
  const tcp=docker('exec',x.Id,'cat','/proc/net/tcp','/proc/net/tcp6');assert(tcp.split('\n').some(l=>{const f=l.trim().split(/\s+/);return f[3]==='0A'&&f[1]?.endsWith(':0019');}),'Native SMTP listener absent');
 }
}
function evidence(key){const s=specs.find(s=>s.key===key),b=read(output+'/'+key+'/build.json'),a=read(output+'/'+key+'/application.json'),v=read(output+'/'+key+'/scan-gate.json');
 assert.equal(b.base,s.base);assert(b.passed&&b.configurationUnchanged&&b.applicationUnchanged&&b.unrelatedPackagesUnchanged);
 for(const r of [a,v]){assert(r.passed);assert.equal(r.imageId,b.imageId);assert(Date.now()-Date.parse(r.date)<86400000);}
 assert.deepEqual(v.newHighCritical,[]);assert.equal(image(b.candidate),b.imageId);assert.equal(b.normalAfter.version,s.version.split('-')[0]);return {s,b};
}
function pins(g,version){
 const pairs=g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r[version==='new'?'oldRef':'newRef'],to:r[version+'Ref']}));
 const changes=[...new Set([...g.files,...(g.mirrorFiles||[])])].map(f=>({f,...replaceImagePins(fs.readFileSync(f,'utf8'),pairs)}));
 assert(changes.some(c=>g.files.includes(c.f)&&c.replaced),'No exact active pin found');
 for(const c of changes)if(c.replaced)fs.writeFileSync(c.f,c.text);
}
async function gate(g,version){
 await checkExistingGroup(g,version);
 for(const r of g.rows.filter(r=>r.oldImage!==r.newImage)){
  const s=specs.find(s=>s.key===g.key),b=read(output+'/'+g.key+'/build.json');
  const actual=docker('exec',r.name,s.php,'-n','-r','echo PHP_VERSION;');assert.equal(actual,version==='new'?b.normalAfter.version:b.normalBefore.version);
 }
 // Addy's supervisor starts the container before s6 finishes its native mail
 // services. Require readiness, but give that startup a finite settling window.
 for(let attempt=0;attempt<(g.key==='addy'?60:1);attempt++){
  try{boundaries(g);assert.equal(await publicStatus(g.key),g.publicBefore,'Public route changed');return;}
  catch(error){if(g.key!=='addy'||attempt===59){fs.writeFileSync(output+'/'+g.key+'/release-gate-error.log',String(error.stack||error));throw error;}await new Promise(r=>setTimeout(r,1000));}
 }
}
if(mode==='prepare')for(const key of keys){
 const {s,b}=evidence(key);assert(!report.groups.some(g=>g.key===key),'Already prepared; retained receipt must not be overwritten');
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n'))),groups=new Map();
 const dependents=namespaceDependents(all,new Set(s.containers));
 for(const name of [...s.containers,...dependents.map(d=>d.container.Name.slice(1))]){
  const x=all.find(x=>x.Name==='/'+name),l=x.Config.Labels,project=l['com.docker.compose.project'];
  let g=groups.get(project);if(!g){g={key,project,cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],status:'prepared',preparedAt:new Date().toISOString()};groups.set(project,g);}
  const selected=s.containers.includes(name),service=l['com.docker.compose.service'],c=config(g)[service];assert.equal(image(c.image),x.Image);if(selected)assert.equal(x.Image,s.base);
  assert(Date.now()-Date.parse(x.State.StartedAt)>300000,'Unstable predecessor');
  const parent=all.find(p=>'container:'+p.Id===x.HostConfig.NetworkMode)?.Name.slice(1);
  g.rows.push({name,service,oldContainerId:x.Id,oldRestartCount:x.RestartCount,oldRef:c.image,oldImage:x.Image,newRef:selected?b.candidate:c.image,newImage:selected?b.imageId:x.Image,configHash:hash(c),...(parent?{namespaceParent:parent}:{})});
 }
 for(const g of groups.values()){
  if(g.project==='utilibre-addy'){assert.equal(g.rows.length,1);assert.equal(g.rows[0].service,'app');assert(!config(g).app.pull_policy||config(g).app.pull_policy==='missing');}
  if(g.project==='utilibre-services')g.mirrorFiles=['/home/ubuntu/freetools/deployment/utilibre/compose.yaml'];
  g.before=await existingGroupStatus(g);g.publicBefore=await publicStatus(key);assert(g.publicBefore>=200&&g.publicBefore<400,'Public baseline failed');
  await gate(g,'old');report.groups.push(g);save();
 }
 console.log(key+': exact-image release prepared; no production changes');
}
if(['apply','retry'].includes(mode))for(const key of keys){
 evidence(key);const groups=report.groups.filter(g=>g.key===key);assert(groups.length);
 for(const g of groups){
  assert(Date.now()-Date.parse(g.preparedAt)<86400000);
  const validate=v=>{const c=config(g);for(const r of g.rows){assert.equal(c[r.service].image,r[v+'Ref']);assert.equal(hash(c[r.service]),r.configHash,'Only image can change');assert.equal(image(r.newRef),r.newImage);assert.equal(image(r.oldRef),r.oldImage);}};
  if(g.status==='passed'){validate('new');await gate(g,'new');continue;}
  const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>=8*1024**3,'8 GiB disk reserve');
  if(g.status==='failed'){
   assert.equal(mode,'retry','Failed activation requires explicit retry and verified rollback');validate('old');await gate(g,'old');
   (g.attempts??=[]).push({status:g.status,rollbackInitially:g.rollback,rollbackVerifiedAt:new Date().toISOString(),reason:'Explicit retry after old image, configuration and full rollback gate verified'});
   g.rollback='verified';g.status='prepared';save();
  }
  assert.equal(g.status,'prepared');
  let rollback=false;
  await releaseGroup(g,{preflight:async()=>{validate('old');await gate(g,'old');},save,recreate:async()=>{if(!rollback)pins(g,'new');validate(rollback?'old':'new');if(g.project==='utilibre-addy')run('systemctl',['restart','utilibre-addy-smtp.service']);else await recreateExistingGroup(g);},gate:v=>gate(g,v),rollbackPins:()=>{rollback=true;pins(g,'old');validate('old');}});
  g.completedAt=new Date().toISOString();save();console.log(key+' ('+g.project+'): fixed PHP live; exact image, native health and public route verified');
 }
}
// Complete means every declared container has a successful scoped release,
// not merely that the most recently requested service passed.
report.status=specs.every(s=>s.containers.every(name=>report.groups.some(g=>g.key===s.key&&g.status==='passed'&&g.rows.some(r=>r.name===name))))&&report.groups.every(g=>g.status==='passed')?'passed':'partial';
report.updatedAt=new Date().toISOString();save();
