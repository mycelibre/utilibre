// Operator-only exact GLib release; reuse existing scoped health and rollback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {canonical} from '../go-final/release.mjs';
import {replaceImagePins,releaseGroup,existingComposeArgs,checkExistingGroup,recreateExistingGroup,existingGroupStatus} from '../language-final/release.mjs';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261109';
const mode=process.argv[2];assert(['prepare','apply','verify'].includes(mode));
const read=f=>JSON.parse(fs.readFileSync(f));
const sha=x=>createHash('sha256').update(x).digest('hex');
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(root+'/release-command-error.log',String(e.stderr||e.message));throw Error('Release command failed; private diagnostic retained');}};
const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
const image=n=>docker('image','inspect','--format','{{.Id}}',n);
const specs=read(root+'/glib-stage.json').rows;assert.equal(specs.length,2);
const file=root+'/glib-release.json';
const report=fs.existsSync(file)?read(file):{date:new Date().toISOString(),status:'prepared',groups:[]};
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');process.once('exit',unlock);
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const configHash=c=>{const {image,...rest}=c;return sha(JSON.stringify(canonical(rest)));};
const url=k=>k==='addy'?'https://aliases.utilibre.org/':'https://4get.utilibre.org/';
async function publicStatus(k){const r=await fetch(url(k),{redirect:'manual',signal:AbortSignal.timeout(10000)});await r.body?.cancel();return r.status;}
function evidence(s){
 assert.equal(image(s.candidate),s.imageId);assert.equal(s.status,'passed');
 assert(read(root+'/glib-output/abi-and-baseline.json').passed);
 for(const f of ['application','scan-gate']){const r=read(root+'/'+s.key+'/'+f+'.json');assert(r.passed&&r.imageId===s.imageId);if(f==='scan-gate')assert.deepEqual(r.newHighCritical,[]);}
 assert(Date.now()-Date.parse(read(root+'/glib-stage.json').date)<86400000);
 assert.equal(sha(fs.readFileSync(root+'/glib-output/libgio-2.0.so.0.8600.5')),s.gioSha256);
}
function smtpBoundary(){
 run('systemctl',['is-active','--quiet','utilibre-addy-smtp.service']);
 const pid=String(inspect('utilibre-addy-app-1').State.Pid);assert(+pid>0);
 const allowed=fs.readFileSync(new URL('../../addy/start-smtp.sh',import.meta.url),'utf8').match(/-s ((?:\d+\.){3}\d+)\/32 -j ACCEPT/)?.[1];assert(allowed);
 const rule=run('nsenter',['-t',pid,'-n','iptables','-S','UTILIBRE-SMTP-IN']);assert(rule.includes('-s '+allowed+'/32 -j ACCEPT')&&rule.includes('-j REJECT'));
 assert(run('nsenter',['-t',pid,'-n','iptables','-S','INPUT']).includes('--dport 25 -j UTILIBRE-SMTP-IN'));
 assert(run('nsenter',['-t',pid,'-n','ip6tables','-S','INPUT']).includes('--dport 25 -j REJECT'));
 const tcp=docker('exec','utilibre-addy-app-1','cat','/proc/net/tcp','/proc/net/tcp6');assert(tcp.split('\n').some(l=>{const f=l.trim().split(/\s+/);return f[3]==='0A'&&f[1]?.endsWith(':0019');}));
}
async function gate(g,v){
 await checkExistingGroup(g,v);
 if(v==='new')assert.equal(docker('exec',g.rows[0].name,'sha256sum','/usr/lib/libgio-2.0.so.0').split(/\s/)[0],specs.find(s=>s.key===g.key).gioSha256);
 for(let n=0;n<60;n++){try{if(g.key==='addy')smtpBoundary();assert.equal(await publicStatus(g.key),g.publicBefore);return;}catch(e){if(n===59)throw e;await new Promise(r=>setTimeout(r,1000));}}
}
function validate(g,v){const cfg=config(g);for(const r of g.rows){assert.equal(cfg[r.service].image,r[v+'Ref']);assert.equal(configHash(cfg[r.service]),r.configHash);assert.equal(image(r.oldRef),r.oldImage);assert.equal(image(r.newRef),r.newImage);}}
function pin(g,v){const r=g.rows[0];const changes=g.files.map(f=>({f,...replaceImagePins(fs.readFileSync(f,'utf8'),[{from:r[v==='new'?'oldRef':'newRef'],to:r[v+'Ref']}])}));assert(changes.some(c=>c.replaced));for(const c of changes)if(c.replaced)fs.writeFileSync(c.f,c.text);}
if(mode==='prepare'){
 assert.equal(report.groups.length,0);
 for(const s of specs){evidence(s);const x=inspect(s.name),l=x.Config.Labels;assert.equal(x.Image,s.base);assert(Date.now()-Date.parse(x.State.StartedAt)>300000);
  const g={key:s.key,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],status:'prepared'};
  const service=l['com.docker.compose.service'],c=config(g)[service];assert.equal(image(c.image),s.base);
  g.rows=[{name:s.name,service,oldContainerId:x.Id,oldRestartCount:x.RestartCount,oldRef:c.image,oldImage:s.base,newRef:s.candidate,newImage:s.imageId,configHash:configHash(c)}];
  g.publicBefore=await publicStatus(s.key);assert(g.publicBefore>=200&&g.publicBefore<400);g.before=await existingGroupStatus(g);await gate(g,'old');report.groups.push(g);save();
 }
 console.log('Two exact candidates prepared; no live changes.');
}else{
 assert.equal(report.groups.length,2);assert(Date.now()-Date.parse(report.date)<86400000);
 for(const g of report.groups){const s=specs.find(s=>s.key===g.key);evidence(s);
  if(g.status==='passed'){validate(g,'new');await gate(g,'new');continue;}
  assert.equal(mode,'apply');assert.equal(g.status,'prepared');const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>8*1024**3);
  let rollback=false;
  await releaseGroup(g,{save,preflight:async()=>{validate(g,'old');await gate(g,'old');},recreate:async()=>{if(!rollback)pin(g,'new');validate(g,rollback?'old':'new');if(g.key==='addy')run('systemctl',['restart','utilibre-addy-smtp.service']);else await recreateExistingGroup(g);},gate:v=>gate(g,v),rollbackPins:()=>{rollback=true;pin(g,'old');validate(g,'old');}});
  g.completedAt=new Date().toISOString();save();console.log(g.key+': exact library active; health, HTTPS and applicable SMTP boundary passed');
 }
 report.status='passed';report.completedAt??=new Date().toISOString();save();
}
