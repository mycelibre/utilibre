import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,copyFileSync,statfsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
process.umask(0o077);
const recipe=fileURLToPath(new URL('.',import.meta.url));
const directory='/var/lib/utilibre-maintenance/sqlite-final-20261011';
const builder='node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20';
const reuse=process.argv[2]==='--packages-ready';
assert(!process.argv[2]||reuse);
mkdirSync(directory,{recursive:true,mode:0o700});
function space(reserve=8){const s=statfsSync(directory);assert(s.bavail*s.bsize>=reserve*1024**3,'Preserve 8GiB disk recovery floor');}
function docker(args,timeout=120000){try{return execFileSync('docker',args,{encoding:'utf8',timeout,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});}catch(e){writeFileSync(directory+'/build-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Isolated SQLite build failed; private code-only diagnostic retained');}}
space();
if(!reuse){
 space(8.6);
 docker(['run','--rm','--name','maintenance-sqlite-build','--cpus','1','--memory','2g','--memory-swap','2g','--pids-limit','128','--log-driver','none',
  '--tmpfs','/work:rw,exec,nosuid,nodev,size=1100m','--tmpfs','/var/lib/apt/lists:rw,nosuid,nodev,size=128m','--tmpfs','/var/cache/apt:rw,nosuid,nodev,size=192m',
  '--mount','type=bind,src='+recipe.replace(/\/$/,'')+',dst=/recipe,readonly','--mount','type=bind,src='+directory+',dst=/out','--entrypoint','sh',builder,
  '-c','sh /recipe/prepare.sh > /out/prepare.log 2>&1 && sh /recipe/compile.sh > /out/compile.log 2>&1'],1800000);
}
assert.match(readFileSync(directory+'/prepare.log','utf8'),/Good signature from "Laszlo Boszormenyi/);
assert.match(readFileSync(directory+'/compile.log','utf8'),/COMPILED/);
const tests=readFileSync(directory+'/distinct-tests.log','utf8');
for(let n=1;n<=5;n++)assert.match(tests,new RegExp('distinct-10\\.'+n+'[^\\n]*Ok'));
const rows=JSON.parse(readFileSync(recipe+'images.json'));
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
for(const row of rows){
 space();assert.equal(JSON.parse(docker(['image','inspect',row.base]))[0].Id,row.baseId);
 const context=directory+'/'+row.kind;mkdirSync(context+'/packages',{recursive:true});
 for(const pkg of ['libsqlite3-0',...(row.cli?['sqlite3']:[])])copyFileSync(directory+'/'+pkg+'_3.40.1-2+deb12u2+utilibre1_amd64.deb',context+'/packages/'+pkg+'.deb');
 if(row.kind==='kuma'){
  const jwt='/var/lib/utilibre-maintenance/host-final-20261011/python3-jwt_2.15.1-1_all.deb';
  assert.equal(sha(jwt),'e2bdfe81e1c0c45866e37e1a2f2fd190fcec24f8c5fc083e994733b0f915b1af');
  copyFileSync(jwt,context+'/packages/python3-jwt.deb');row.pyjwt='2.15.1-1';row.pyjwtPackageSha256=sha(jwt);
 }
 docker(['build','--pull=false','--network=none','-f',recipe+'Dockerfile','--build-arg','BASE='+row.base,'--build-arg','RESTORE_USER='+row.user,'-t',row.candidate,context]);
 assert.equal(JSON.parse(docker(['image','inspect',row.base]))[0].Id,row.baseId,'Base tag changed during build');
 row.candidateId=JSON.parse(docker(['image','inspect',row.candidate]))[0].Id;
 console.log('Staged native SQLite-only layer: '+row.kind);
}
writeFileSync(directory+'/build.json',JSON.stringify({date:new Date().toISOString(),status:'built-not-runtime-tested',deployed:false,builder,
 version:'3.40.1-2+deb12u2+utilibre1',upstreamCommit:'b816ca9994e03a8bc829b49452b8158a731e81a9',
 patchSha256:sha(directory+'/applied.patch'),libraryPackageSha256:sha(directory+'/libsqlite3-0_3.40.1-2+deb12u2+utilibre1_amd64.deb'),
 cliPackageSha256:sha(directory+'/sqlite3_3.40.1-2+deb12u2+utilibre1_amd64.deb'),rows},null,2)+'\n');
