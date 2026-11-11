// Finite configuration-only release; ordinary tests and explicit operator action required.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';
import {namespaceDependents,releaseGroup,existingComposeArgs,checkExistingGroup,recreateExistingGroup} from '../language-final/release.mjs';
process.umask(0o077);
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const root='/var/lib/utilibre-maintenance/security-20261110/freshrss-permissions-release';
const file=root+'/release.json',mode=process.argv[2];
assert(['prepare','apply','verify'].includes(mode));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const run=(cmd,args,opts={})=>{try{return cp.execFileSync(cmd,args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe'],...opts}).trim();}catch{throw Error('Bounded operation failed: '+cmd+'; configuration output withheld');}};
const docker=(...args)=>run('docker',args),inspect=n=>JSON.parse(docker('inspect',n))[0];
const policy=read(new URL('./freshrss-permissions.json',import.meta.url));
const evidencePath='/var/lib/utilibre-maintenance/security-20261110/freshrss-permissions-verified/result.json';
const evidence=()=>{
 const e=read(evidencePath);assert(e.passed&&e.results.length===2&&e.results.every(r=>r.passed&&r.image===policy.image));
 for(const [p,h] of Object.entries(e.inputHashes))assert.equal(hash(fs.readFileSync(repo+p)),h,'Test input drift: '+p);
 return e;
};
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json'));
const stripped=c=>{c=structuredClone(c);delete c.services.freshrss.cap_add;delete c.services.freshrss.cap_drop;return c;};
const atomic=(p,data)=>{const temporary=p+'.permissions-release';fs.writeFileSync(temporary,data,{flag:'wx',mode:0o600});fs.chmodSync(temporary,fs.existsSync(p)?fs.statSync(p).mode&0o777:0o755);fs.renameSync(temporary,p);};
const artifactFiles=['backup.sh','restore.sh','check-backup-input.py'];
const changedFiles=['/opt/utilibre/compose.yaml',repo+'deployment/pack/compose.freshrss-privacy.yaml',...artifactFiles.map(f=>'/opt/utilibre/scripts/'+f)];
const route=async()=>{
 const x=inspect(policy.container),b=x.HostConfig.PortBindings['80/tcp'][0];
 const r=await fetch(`http://${b.HostIp}:${b.HostPort}/i/?c=auth&a=login`,{redirect:'manual',signal:AbortSignal.timeout(10000)});
 assert.equal(r.status,200);const body=await r.text();assert(body.includes('name="username"')&&body.includes('password'));
 assert.match(r.headers.get('content-security-policy')||'',/img-src 'self' data: blob:/);
 assert.equal(r.headers.get('referrer-policy'),'no-referrer');
 docker('exec',policy.container,'php','/var/www/FreshRSS/cli/health.php');
};
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
try{
 const e=evidence();
 if(mode==='prepare'){
  assert(!fs.existsSync(root),'Preserve previous release evidence');fs.mkdirSync(root,{mode:0o700});
  assert(Date.now()-Date.parse(e.date)<86400000,'Tests expired');
  const x=inspect(policy.container),labels=x.Config.Labels;
  assert.equal(x.Image,policy.image);assert.equal(x.Config.User,'root');assert(!x.HostConfig.CapDrop?.length);
  const g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),before:[],rows:[{name:policy.container,service:'freshrss',oldImage:x.Image,newImage:x.Image,oldContainerId:x.Id,oldRestartCount:x.RestartCount}]};
  assert.equal(g.project,'utilibre-services');assert.equal(g.cwd,'/opt/utilibre');assert.deepEqual(g.files,changedFiles.slice(0,2));
  const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));
  assert.deepEqual(namespaceDependents(all,new Set([policy.container])),[]);
  assert.equal(run('systemctl',['list-units','--state=running','--no-legend','utilibre*backup*.service']),'','Backup running');
  await checkExistingGroup(g,'old');await route();
  const originals={};
  for(const p of changedFiles)originals[p]=fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;
  // The checked-in overlay was edited during preparation, but is not live yet.
  originals[g.files[1]]=run('git',['show','HEAD:deployment/pack/compose.freshrss-privacy.yaml'],{cwd:repo})+'\n';
  for(const f of ['backup.sh','restore.sh'])assert.equal(originals['/opt/utilibre/scripts/'+f].trim(),run('git',['show','HEAD:deployment/utilibre/scripts/'+f],{cwd:repo}),'Installed helper baseline drift');
  fs.writeFileSync(root+'/originals.json',JSON.stringify(originals));
  fs.writeFileSync(root+'/old-overlay.yaml',originals[g.files[1]]);
  const previous=config({...g,files:[g.files[0],root+'/old-overlay.yaml']}),candidate=config(g);
  assert.deepEqual(stripped(candidate),stripped(previous),'Only FreshRSS capabilities may differ');
  assert.deepEqual(candidate.services.freshrss.cap_drop,policy.capDrop);
  assert.deepEqual(candidate.services.freshrss.cap_add.sort(),[...policy.capAdd].sort());
  fs.writeFileSync(root+'/before-config.json',JSON.stringify(previous));
  const first='\n  freshrss:\n',parts=originals[g.files[0]].split(first);assert.equal(parts.length,2);
  const boundary=parts[1].search(/\n  [a-z][\w-]*:/);assert(boundary>0);
  const block=parts[1].slice(0,boundary),anchor='    <<: *default-security\n';assert.equal(block.split(anchor).length,2);
  const candidateText=parts[0]+first+block.replace(anchor,anchor+'    cap_drop: [ALL]\n    cap_add: ['+policy.capAdd.join(', ')+']\n')+parts[1].slice(boundary);
  fs.writeFileSync(root+'/candidate-compose.yaml',candidateText);
  const candidateHashes=Object.fromEntries(artifactFiles.map(f=>[f,hash(fs.readFileSync(repo+'deployment/utilibre/scripts/'+f))]));
  const backup=run('sh',['/opt/utilibre/scripts/backup.sh','--no-prune']);assert(backup.startsWith('/opt/utilibre/data/backups/daily-'));
  run('sha256sum',['-c','SHA256SUMS'],{cwd:backup});
  fs.writeFileSync(file,JSON.stringify({status:'prepared',date:new Date().toISOString(),group:g,evidenceSha256:hash(fs.readFileSync(evidencePath)),candidateHashes,candidateComposeSha256:hash(candidateText),configSha256:hash(JSON.stringify(candidate)),backup,others:all.filter(c=>c.Name!=='/'+policy.container).map(c=>({name:c.Name,id:c.Id})),mounts:x.Mounts.map(({Source,Destination,RW})=>({Source,Destination,RW}))},null,2)+'\n');
  console.log('Scoped release prepared; saved-work backup checksummed; no service restarted.');
 }else{
  const r=read(file),g=r.group,originals=read(root+'/originals.json');
  const save=()=>fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');
  assert.equal(hash(fs.readFileSync(evidencePath)),r.evidenceSha256);
  for(const [f,h] of Object.entries(r.candidateHashes))assert.equal(hash(fs.readFileSync(repo+'deployment/utilibre/scripts/'+f)),h,'Helper drift');
  const gate=async version=>{
   await checkExistingGroup(g,version);await route();const x=inspect(policy.container);
   assert.deepEqual(x.Mounts.map(({Source,Destination,RW})=>({Source,Destination,RW})),r.mounts);
   if(version==='new'){
    assert.deepEqual(x.HostConfig.CapDrop,['ALL']);assert.deepEqual(x.HostConfig.CapAdd.map(c=>c.replace(/^CAP_/,'')).sort(),[...policy.capAdd].sort());
    assert.match(docker('exec',policy.container,'cat','/proc/1/status'),/CapEff:\s+00000000200004eb/);
    for(const [f,h] of Object.entries(r.candidateHashes))assert.equal(hash(fs.readFileSync('/opt/utilibre/scripts/'+f)),h);
   }else assert(!x.HostConfig.CapDrop?.length);
   for(const other of r.others)assert.equal(inspect(other.name).Id,other.id,'Unrelated container changed');
  };
  if(r.status==='passed'){await gate('new');console.log('Already-correct release verified; no recreation.');}
  else{
   assert.equal(mode,'apply');assert.equal(r.status,'prepared');assert(Date.now()-Date.parse(r.date)<86400000);
   let rollback=false;
   await releaseGroup(g,{
    preflight:()=>{
     assert.equal(hash(JSON.stringify(config(g))),r.configSha256,'Compose drift');
     assert.equal(fs.readFileSync(g.files[0],'utf8'),originals[g.files[0]]);
     assert.equal(inspect(policy.container).Id,g.rows[0].oldContainerId);
     assert.equal(run('systemctl',['list-units','--state=running','--no-legend','utilibre*backup*.service']),'','Backup running');
     const d=fs.statfsSync('/');assert(d.bavail*d.bsize>8*1024**3);
    },save,
    recreate:()=>{
     if(!rollback){
      const candidate=fs.readFileSync(root+'/candidate-compose.yaml');assert.equal(hash(candidate),r.candidateComposeSha256);atomic(g.files[0],candidate);
      for(const f of artifactFiles)atomic('/opt/utilibre/scripts/'+f,fs.readFileSync(repo+'deployment/utilibre/scripts/'+f));
      assert.equal(hash(JSON.stringify(config(g))),r.configSha256,'Unexpected resolved configuration change');
     }
     return recreateExistingGroup(g);
    },gate,
    rollbackPins:()=>{rollback=true;for(const [p,data] of Object.entries(originals)){if(data===null){if(fs.existsSync(p))fs.unlinkSync(p);}else atomic(p,data);}}
   });
   r.status='passed';r.completedAt=new Date().toISOString();r.containerId=inspect(policy.container).Id;save();
   console.log('FreshRSS capabilities and core backup helpers deployed; health, privacy headers and unchanged other containers verified.');
  }
 }
}finally{unlock();}
