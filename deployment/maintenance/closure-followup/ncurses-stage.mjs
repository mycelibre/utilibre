// Exact, CLI-only package overlays. No production configuration/state access.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const here=fileURLToPath(new URL('.',import.meta.url)),dir='/var/lib/utilibre-maintenance/closure-followup-20261012';
const sha=b=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2);assert(args.every(x=>['trixie','bookworm'].includes(x)));
const specs=JSON.parse(fs.readFileSync(here+'ncurses-specs.json')).filter(s=>!args.length||args.includes(s.suite));
const docker=(a,input)=>{try{return cp.execFileSync('docker',a,{input,encoding:'utf8',timeout:240000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(dir+'/ncurses-stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Native terminal package stage failed; private evidence retained');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
const limits=['--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--pids-limit','64','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777'];
const run=(image,cmd,a=[])=>docker(['run','--rm',...limits,'--mount','type=bind,src='+here+',dst=/fixture,readonly','--entrypoint',cmd,image,...a]);
for(const s of specs){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 assert.equal(inspect(s.baseRef).Id,s.base);for(const name of s.containers)assert.equal(inspect(name).Image,s.base);
 const out=dir+'/ncurses/'+s.key;fs.mkdirSync(out+'/packages',{recursive:true});
 const version=s.suite==='trixie'?'6.5+20250216-2+dhi4':'6.4-4+utilibre1';
 const pkg=dir+(s.suite==='trixie'?'/ncurses-dhi/':'/ncurses-bookworm/')+'ncurses-bin_'+version+'_amd64.deb';
 const checksum=sha(fs.readFileSync(pkg));
 if(s.suite==='trixie'){
  assert.equal(checksum,'54821f5e17572f0badc7059efefb54fb54d9e8a28449274f478735314f22474d');
  const index=fs.readFileSync(dir+'/ncurses-dhi/package-index.txt','utf8');assert(index.includes('Version: '+version));assert(index.includes('SHA256: '+checksum));
 }else{
  // Compilation completed; its old post-build fixture omitted tic -x and lost
  // extended capabilities. Preserve that failed log. Require the exact retained
  // package/source bytes, signed source-index evidence and corrected native gate
  // below instead of rewriting the original result as a pass.
  assert.equal(checksum,'2c2f76d5a44273f095f505228294796401e79874dd240868aa8dcb7403dac8b1');
  for(const [file,hash] of [
   ['ncurses_6.4-4+utilibre1.dsc','7c81ab3d7b62b0cb935cb3e78563ad0013f0080978ee98e6e4d77fbf9fe7237c'],
   ['ncurses_6.4-4+utilibre1.debian.tar.xz','51a399f91a4a2a0d7e885ea8756df7bd2565e3ce1c3c4f436b91e2c3d0dd6e2c'],
   ['ncurses_6.4.orig.tar.gz','6931283d9ac87c5073f30b6290c4c75f21632bb4fc3603ac8100812bed248159'],
  ])assert.equal(sha(fs.readFileSync(dir+'/ncurses-bookworm/'+file)),hash);
  assert(fs.readFileSync(dir+'/ncurses-bookworm/build.log','utf8').includes('dpkg-genchanges --build=any'));
  assert(fs.readFileSync(dir+'/ncurses-bookworm/source-authentication.log','utf8').includes('ncurses'));
 }
 const control=fs.mkdtempSync('/dev/shm/utilibre-ncurses-control-');
 try{cp.execFileSync('dpkg-deb',['-e',pkg,control]);assert(fs.readdirSync(control).every(n=>['control','md5sums'].includes(n)),'Unexpected maintainer script');}finally{fs.rmSync(control,{recursive:true});}
 fs.copyFileSync(pkg,out+'/packages/ncurses-bin.deb');
 const before=inspect(s.base);
 docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',s.candidate,out]);
 const after=inspect(s.candidate),normalize=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(normalize(after.Config),normalize(before.Config));
 assert.equal(run(s.candidate,'dpkg-query',['-W','-f=${Version}','ncurses-bin']),version);
 const manifest='for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql /priviblur /upstream /grist; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum';
 const fingerprint=run(s.base,'sh',['-ec',manifest]);assert.equal(run(s.candidate,'sh',['-ec',manifest]),fingerprint);
 // Existing core runtime libraries stay byte-identical, including tinfo/libc.
 const libs='find /usr/lib /lib -type f -name "*.so*" -exec sha256sum {} + | sort | sha256sum';
 const libraries=run(s.base,'sh',['-ec',libs]);assert.equal(run(s.candidate,'sh',['-ec',libs]),libraries);
 assert.match(run(s.candidate,'sh',['/fixture/ncurses-native.sh']),/NATIVE_TERMINAL_ROUNDTRIP_AND_LONG_SGR_PASSED/);
 const b={...s,date:new Date().toISOString(),version,packageSha256:checksum,imageId:after.Id,passed:true,configurationUnchanged:true,applicationSha256:fingerprint,librariesSha256:libraries,deployed:false};
 fs.writeFileSync(out+'/build.json',JSON.stringify(b,null,2)+'\n');
 fs.writeFileSync(out+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:after.Id,passed:true,nativeTerminalRoundTrip:true,longSgrInput:true,sharedLibrariesUnchanged:true,network:'none',limitations:'CLI/dependency-only overlay; unchanged application files and live readiness required, not new browser journeys for every application.'},null,2)+'\n');
 console.log(s.key+': native CLI, long-SGR boundary and unchanged app/library checks passed');
}
