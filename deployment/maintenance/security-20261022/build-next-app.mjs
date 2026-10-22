import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='/home/ubuntu/freetools',output='/var/lib/utilibre-maintenance/security-20261022',key=process.argv[2],resolve=process.argv.includes('--resolve');
assert(['rallly','spliit'].includes(key)&&process.argv.slice(3).every(f=>f==='--resolve'));
const specs={
 rallly:{source:JSON.parse(fs.readFileSync(output+'/rallly/source-path.json')).src,commit:'4b61a00b1abcbe480d6b3992b5d98b01754e90c6',base:'sha256:8328589dc8b274ffc20834978d8ba27d819a21f6f0685a37aa568549ce982485',container:'utilibre-community-rallly-1'},
 spliit:{source:'/opt/utilibre/community-src/spliit-utilibre-1.29.0-p1',commit:'d3b1e1e6787ffe13c6dfe0b6a2fcfc403d81686a',base:'sha256:ba07130dc83b69f81a8711bdb9031556d1407cca4e8e4e85459072825e7a5250',container:'utilibre-spliit-app-1'},
},s=specs[key],dir=output+'/'+key;
process.umask(0o077);fs.mkdirSync(dir,{recursive:true,mode:0o700});
const run=(exe,args,opts={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...opts});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': isolated build failed; private evidence retained');}};
assert.equal(run('docker',['inspect','--format','{{.Image}}',s.container]).trim(),s.base);
if(key==='spliit')assert.equal(run('git',['-C',s.source,'rev-parse','HEAD']).trim(),s.commit);
const free=fs.statfsSync('/');assert(free.bavail*free.bsize>8*1024**3);
// The reviewed runtime supplies the exact Node/libc/OpenSSL combination;
// dependency writes remain in /work, never in its immutable application tree.
const compiler=s.base;
const cpus=fs.readFileSync('/proc/self/status','utf8').match(/^Cpus_allowed_list:\s*(.+)$/m)[1];assert(/^0-(?:[2-9]|\d{2,})$/.test(cpus),'Review affinity on another host');
// Rallly's compiler exceeded the tmpfs + process memory budget. Use a private
// disposable disk workspace instead, with a disk floor and a bounded process.
const scratch=key==='rallly'?fs.mkdtempSync(dir+'/build-work-'):null;
const work=scratch?['-v',scratch+':/work']:['--tmpfs','/work:rw,exec,size=4g'];
const memory=key==='rallly'?'8g':'6g';
const args=['run','--rm','--name','maintenance-next-'+key,'--user','0','--cpus','2','--cpuset-cpus','0,1','--memory',memory,'--memory-swap',memory,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none',...work,'--tmpfs','/tmp:rw,exec,size=128m','-v',s.source+':/source:ro','-v',root+'/deployment/maintenance/security-20261022:/recipe:ro','-v',root+'/deployment/maintenance/language-final/app-leaves:/privacy:ro','-v',dir+':/output','-v',dir+':/lock:ro','-e','APPLICATION='+key,'-e','RESOLVE_LOCK='+(resolve?'1':'0'),'--entrypoint','sh',compiler,'/recipe/build-next-app.sh'];
try{
 const file=fs.openSync(dir+(resolve?'/resolve.log':'/build.log'),'w',0o600),child=cp.spawn('docker',args,{stdio:['ignore',file,file]});
 let stopped=false;const stop=()=>{if(stopped)return;stopped=true;cp.spawn('docker',['stop','--time','5','maintenance-next-'+key],{stdio:'ignore'});};
 const timer=setTimeout(stop,25*60*1000),watch=setInterval(()=>{const f=fs.statfsSync('/');if(f.bavail*f.bsize<8*1024**3||fs.fstatSync(file).size>8*1024**2)stop();},1000);
 const code=await new Promise(r=>child.once('exit',r));clearTimeout(timer);clearInterval(watch);fs.closeSync(file);assert.equal(code,0,key+': build failed; bounded private log retained');assert.equal(stopped,false);
}finally{if(scratch){assert(scratch.startsWith(dir+'/build-work-'));fs.rmSync(scratch,{recursive:true,force:true});}}
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
if(resolve)console.log(key+': frozen candidate lock prepared for review');
else{const r={date:new Date().toISOString(),passed:true,...s,compiler,next:'16.4.1',archiveSha256:hash(dir+'/app.tar.gz'),lockSha256:hash(dir+'/'+(key==='rallly'?'pnpm-lock.yaml':'package-lock.json')),fullBuildAndUnitTests:true,productionChanged:false};fs.writeFileSync(dir+'/client-build.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));}
