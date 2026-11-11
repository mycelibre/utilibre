// Finite source-tree activation; reuse the established lock and rollback driver.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync, spawn} from 'node:child_process';
import {once} from 'node:events';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';
import {releaseGroup, checkExistingGroup, recreateExistingGroup} from '../language-final/release.mjs';

assert.deepEqual(process.argv.slice(2), ['--apply']);
process.umask(0o077);
const repo='/home/ubuntu/freetools', root='/var/lib/utilibre-maintenance/held-upgrades-20261111/cryptpad';
const current='/opt/utilibre/src/cryptpad', incoming=root+'/activation-source', previous=root+'/previous-source';
const spec=JSON.parse(fs.readFileSync(new URL('./cryptpad-upgrade.json',import.meta.url)));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(c,a)=>execFileSync(c,a,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:8*1024**2});
const docker=(...a)=>run('docker',a), inspect=n=>JSON.parse(docker('inspect',n))[0];
const revision=p=>run('git',['-C',p,'rev-parse','HEAD']).trim();
assert.equal(spec.approval,'approved-exact-tested-candidate');
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');process.on('exit',unlock);
for(const [file,hash] of Object.entries(spec.evidence)){
 assert(!file.startsWith('/')&&!file.split('/').includes('..'));assert.equal(sha(root+'/'+file),hash,file);
}
for(const [file,hash] of Object.entries(spec.recipes)){
 assert(file.startsWith('deployment/')&&!file.split('/').includes('..'));assert.equal(sha(repo+'/'+file),hash,file);
}
const proof=JSON.parse(fs.readFileSync(root+'/source-identity.json'));
assert(proof.passed&&proof.officeAssetsUnchanged&&proof.customizationAndVendoredRepairUnchanged);
assert.equal(proof.sourceRevision,spec.revision);
for(const file of spec.native){const p=JSON.parse(fs.readFileSync(root+'/'+file));assert(p.completed&&p.disposableStateRemoved);assert.equal(p.sourcePin,spec.revision);assert.equal(p.runtimeImage,spec.runtimeImage);}
const age=Date.now()-Date.parse(spec.databaseUpdatedAt);assert(age>=0&&age<48*3600000,'Refresh the advisory assessment before activation');
const scan=JSON.parse(fs.readFileSync(root+'/candidate-scan.json'));assert(scan.Results.some(x=>x.Packages?.length));
assert(!scan.Results.some(x=>(x.Vulnerabilities||[]).some(v=>['CRITICAL','HIGH'].includes(v.Severity))));
for(const [name,hash] of Object.entries(proof.configSha256))assert.equal(sha(repo+'/deployment/pack/cryptpad/'+name),hash);
const x=inspect('utilibre-pack-cryptpad-cryptpad-1');assert.equal(x.Image,spec.runtimeImage);
const l=x.Config.Labels,g={project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),before:[],rows:[{name:x.Name.slice(1),service:'cryptpad',oldImage:x.Image,newImage:x.Image,oldContainerId:x.Id,oldRestartCount:x.RestartCount}]};
const publicCheck=()=>{for(const origin of ['https://pad.utilibre.org','https://sandbox-pad.utilibre.org'])run('curl',['--fail','--silent','--show-error','--max-time','20',origin+'/']);assert.equal(revision(current),spec.revision);};
if(revision(current)===spec.revision){await checkExistingGroup(g,'new');publicCheck();console.log('CryptPad exact source revision already active; no restart');process.exit(0);}
assert.equal(revision(current),spec.oldRevision);assert.equal(revision(root+'/source'),spec.revision);
assert(!fs.existsSync(incoming)&&!fs.existsSync(previous),'Preserve prior activation state; do not overwrite it');
const disk=fs.statfsSync(root);assert(disk.bavail*disk.bsize>8*1024**3,'Insufficient free space; preserve existing backups');
run('cp',['-a','--reflink=auto',root+'/source',incoming]);
run('python3',[repo+'/deployment/maintenance/releases-20261111/check-cryptpad-tree.py',current,proof.oldTreeSha256]);
run('python3',[repo+'/deployment/maintenance/releases-20261111/check-cryptpad-tree.py',incoming,proof.treeSha256]);
const archive=root+'/before-upgrade.cms';assert(!fs.existsSync(archive));
const cert='/opt/utilibre/pack-backup-key/certificate.pem',key='/opt/utilibre/pack-backup-key/private.pem';assert(fs.existsSync(cert)&&fs.existsSync(key));
async function backup(){
 const a=spawn('tar',['-czf','-','-C','/opt/utilibre/pack-data/cryptpad','blob','block','data','datastore'],{stdio:['ignore','pipe','ignore'],timeout:120000});
 const b=spawn('openssl',['cms','-encrypt','-aes-256-gcm','-binary','-outform','DER','-out',archive,cert],{stdio:['pipe','ignore','ignore'],timeout:120000});
 const ae=once(a,'exit'),be=once(b,'exit');await pipeline(a.stdout,b.stdin);const [[ac],[bc]]=await Promise.all([ae,be]);assert(ac===0&&bc===0);
 const c=spawn('openssl',['cms','-decrypt','-binary','-inform','DER','-in',archive,'-inkey',key],{stdio:['ignore','pipe','ignore'],timeout:120000});
 const d=spawn('tar',['-tzf','-'],{stdio:['pipe','ignore','ignore'],timeout:120000});const ce=once(c,'exit'),de=once(d,'exit');await pipeline(c.stdout,d.stdin);const [[cc],[dc]]=await Promise.all([ce,de]);assert(cc===0&&dc===0,'Encrypted native backup validation failed');
}
let switched=false;
const record={oldRevision:spec.oldRevision,newRevision:spec.revision,runtimeImage:spec.runtimeImage,previousSource:previous,backup:archive};
await releaseGroup(g,{
 save:async()=>fs.writeFileSync(root+'/release.json',JSON.stringify({...record,status:g.status,rollback:g.rollback},null,2)+'\n'),
 preflight:async()=>{assert.equal(inspect(x.Name.slice(1)).Id,x.Id);assert.equal(revision(current),spec.oldRevision);},
 recreate:async()=>{
  if(!g.rollback){docker('stop','--time','30',x.Name.slice(1));await backup();fs.renameSync(current,previous);try{fs.renameSync(incoming,current);switched=true;}catch(e){fs.renameSync(previous,current);throw e;}}
  await recreateExistingGroup(g);
 },
 gate:async version=>{await checkExistingGroup(g,version);if(version==='new')publicCheck();else assert.equal(revision(current),spec.oldRevision);},
 rollbackPins:async()=>{if(switched){docker('stop','--time','30',x.Name.slice(1));fs.renameSync(current,incoming);fs.renameSync(previous,current);}/* Restore code only; never silently restore account data. */}
});
console.log('CryptPad upgraded; native backup, exact source, health and both public origins verified');
