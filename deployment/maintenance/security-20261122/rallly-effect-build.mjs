// Isolated preparation only. The existing runtime and database are untouched.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root='/var/lib/utilibre-maintenance/security-20261122/rallly-effect';
const scratch='/opt/utilibre/temporary/security-rallly-effect-v4-20261122';
const image='sha256:03ba573731f9b4060ff0e68732ab04cf7ec635049bdb2cab6c1e5f5e6ed72660';
const source='/opt/utilibre/source-rallly-security-GJiJpU/rallly-utilibre.tar.gz';
const script=new URL('./rallly-effect-inner.sh',import.meta.url).pathname;
const font=new URL('../../community/rallly-inter-latin.woff2',import.meta.url).pathname;
const license=new URL('../../community/rallly-inter-OFL.txt',import.meta.url).pathname;
const phase=process.argv[2];
assert(['prepare','build'].includes(phase)&&process.argv.length===3);
process.umask(0o077);
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(name,args)=>cp.execFileSync(name,args,{encoding:'utf8',timeout:30000}).trim();
const free=p=>{const f=fs.statfsSync(p);return f.bavail*f.bsize;};
assert.equal(sha(source),'8046b45f519985bbf99c7386d8ff3880cd082824cc90b6d92729d50f811c8461');
assert.equal(sha(font),'c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4');
assert.equal(sha(license),'262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a');
assert.equal(run('docker',['image','inspect','--format','{{.Id}}',image]),image);
assert.equal(run('docker',['inspect','--format','{{.Image}}','utilibre-community-rallly-1']),image);
assert(free('/')>8.5*1024**3,'Root disk is below the preparation floor');
assert(free('/opt/utilibre/temporary')>5*1024**3,'Temporary disk lacks the bounded build budget');
fs.mkdirSync(root,{recursive:true,mode:0o700});
if(phase==='prepare'){
 assert(!fs.existsSync(scratch)&&!fs.existsSync(root+'/lock-hashes-v4.txt'));
 fs.mkdirSync(scratch,{mode:0o700});
}else{
 assert(fs.existsSync(scratch+'/prepared.tar.gz'));
 assert(fs.existsSync(root+'/lock-hashes-v4.txt'));
 const prep=JSON.parse(fs.readFileSync(root+'/prepare-v4.json'));
 assert.equal(prep.stageSha256,run('sha256sum',[scratch+'/prepared.tar.gz']).split(' ')[0]);
 assert(!fs.existsSync(root+'/app.tar.gz'));
}
const name='maintenance-rallly-effect-'+phase;
const args=['run','--rm','--name',name,'--user','0','--cpus','2','--cpuset-cpus','0,1',
 '--memory','14g','--memory-swap','14g','--pids-limit','256','--read-only','--cap-drop','ALL',
 '--security-opt','no-new-privileges','--log-driver','none','--network',phase==='prepare'?'bridge':'none',
 '--tmpfs','/tmp:rw,exec,size=128m','--tmpfs','/work:rw,exec,size=10g','-e','PHASE='+phase,'-v',scratch+':/stage',
 '-v',root+':/output','-v',source+':/input/rallly-utilibre.tar.gz:ro',
 '-v',font+':/input/inter-latin.woff2:ro','-v',license+':/input/Inter-OFL.txt:ro',
 '-v',script+':/recipe.sh:ro','--entrypoint','sh',image,'/recipe.sh'];
const fd=fs.openSync(root+'/'+phase+'-v4.log','wx',0o600);
const child=cp.spawn('docker',args,{stdio:['ignore',fd,fd]});
let stopped=false;
const stop=()=>{if(stopped)return;stopped=true;cp.spawnSync('docker',['stop','--time','5',name],{stdio:'ignore',timeout:15000});};
const timer=setTimeout(stop,30*60*1000);
const watch=setInterval(()=>{
 try{
  const used=run('du',['-sb',scratch]).split('\t')[0];
  const mem=Number(fs.readFileSync('/proc/meminfo','utf8').match(/^MemAvailable:\s+(\d+) kB/m)?.[1]||0)*1024;
  if(free('/')<8*1024**3||Number(used)>4.8*1024**3||mem<5*1024**3||fs.fstatSync(fd).size>8*1024**2)stop();
 }catch{stop();}
},5000);
const code=await new Promise(resolve=>child.once('exit',resolve));
clearTimeout(timer);clearInterval(watch);fs.closeSync(fd);
assert.equal(code,0,phase+' failed; inspect protected log and preserve partial evidence');
assert(!stopped,'Bounded build stopped on time, disk or log limit');
assert(free('/')>8*1024**3);
if(phase==='prepare'){
 const stage=scratch+'/prepared.tar.gz';assert(fs.statSync(stage).size>1024**2);
 fs.writeFileSync(root+'/prepare-v4.json',JSON.stringify({passed:true,stageSha256:run('sha256sum',[stage]).split(' ')[0],
  stageBytes:fs.statSync(stage).size,archiveSha256:sha(source),network:'package-downloads-only',
  productionChanged:false},null,2)+'\n',{flag:'wx',mode:0o600});
}else{
 const archive=root+'/app.tar.gz';assert(fs.statSync(archive).size>1024**2);
 fs.writeFileSync(root+'/build.json',JSON.stringify({passed:true,phase,sourceSha256:sha(source),
  applicationArchiveSha256:sha(archive),applicationArchiveBytes:fs.statSync(archive).size,
  lockSha256:fs.readFileSync(root+'/lock-hashes-v4.txt','utf8').trim().split('\n').find(x=>x.endsWith('  pnpm-lock.yaml')).split(' ')[0],baseImage:image,
  isolatedNetwork:'none',databaseTouched:false,productionChanged:false},null,2)+'\n',{flag:'wx',mode:0o600});
}
console.log('Rallly Effect '+phase+' passed; production unchanged');
