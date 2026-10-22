// Reuse the full-build/immutable-base strategy from next-leaves-final.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='/home/ubuntu/freetools',source='/opt/utilibre/community-src/biblioreads-utilibre-p1',dir='/var/lib/utilibre-maintenance/security-20261022/biblioreads';
const base='sha256:528889b6b04905f3407d87848e5bd721a3420a9db267a1d879b2fa8305773947',commit='9508abc64c6b35eef366e041fef47554f0ee888a';
const compiler='node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1',resolve=process.argv.includes('--resolve');
assert(process.argv.slice(2).every(a=>a==='--resolve'));process.umask(0o077);fs.mkdirSync(dir,{recursive:true,mode:0o700});
const run=(p,a,opts={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...opts})}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('BiblioReads build failed; private diagnostic retained');}};
assert.equal(run('git',['-C',source,'rev-parse','HEAD']).trim(),commit);assert.equal(run('docker',['inspect','--format','{{.Image}}','utilibre-biblioreads-biblioreads-1']).trim(),base);
const space=fs.statfsSync('/');assert(space.bavail*space.bsize>8*1024**3);
// Preserve the reviewed source's own build-time public settings, not runtime
// credentials. No production .env or Docker socket enters the build container.
const df=fs.readFileSync(root+'/deployment/community/Dockerfile.biblioreads','utf8');
const envBlock=df.match(/ENV NEXT_PUBLIC_HOST_URL[\s\S]*?(?=\nRUN)/)[0].replace(/^ENV /,'').replace(/\\\n\s*/g,' ');
const values=[...envBlock.matchAll(/([A-Z_]+)=("[^"]*"|[^\s]+)/g)].map(([,k,v])=>k+'='+v.replace(/^"|"$/g,''));assert.equal(values.length,15);
const log=run('docker',['run','--rm','--name','maintenance-biblioreads-oct22','--cpus','2','--memory','4g','--memory-swap','4g','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=3g','--tmpfs','/tmp:rw,size=32m','-v',source+':/source:ro','-v',root+'/deployment/maintenance/security-20261022:/recipe:ro','-v',dir+':/output','-v',dir+':/lock:ro','-e','RESOLVE_LOCK='+(resolve?'1':'0'),...values.flatMap(v=>['-e',v]),compiler,'sh','/recipe/build-biblioreads.sh'],{timeout:20*60*1000});
fs.writeFileSync(dir+(resolve?'/resolve.log':'/build.log'),log);
const sha=x=>createHash('sha256').update(x).digest('hex');
if(resolve){const a=JSON.parse(fs.readFileSync(source+'/package-lock.json')),b=JSON.parse(fs.readFileSync(dir+'/package-lock.json'));const changed=Object.keys(b.packages).filter(k=>JSON.stringify(a.packages[k])!==JSON.stringify(b.packages[k])),removed=Object.keys(a.packages).filter(k=>!(k in b.packages));fs.writeFileSync(dir+'/lock-diff.json',JSON.stringify({changed,removed},null,2));console.log(JSON.stringify({changed,removed}));}
else{const r={date:new Date().toISOString(),passed:true,base,sourceCommit:commit,compiler,next:'15.5.28',dompurify:'3.4.17',sourcePatchSha256:sha(run('git',['-C',source,'diff','HEAD','--binary'])),lockSha256:sha(fs.readFileSync(dir+'/package-lock.json')),archiveSha256:sha(fs.readFileSync(dir+'/app.tar.gz')),unitTestsAndFullBuild:true};fs.writeFileSync(dir+'/build.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));}
