// Invoke the existing source-checked recipes with separate acquisition/build phases.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);
const [phase,key]=process.argv.slice(2);assert(['download','build'].includes(phase)&&['yopass','fmd'].includes(key));
const root='/var/lib/utilibre-maintenance/security-20261028/go-runtime',here=new URL('../go-runtime-20261011/',import.meta.url).pathname;
const specs=JSON.parse(fs.readFileSync(new URL('./go-runtime-inputs.json',import.meta.url))),s=specs.rows.find(s=>s.key===key);
const compiler='golang:1.27.3-bookworm@sha256:e482b31b5d30c31f9e495f4b8cbdf41429b2d74955dfbcd9c0a904483d738390';
if(key==='fmd')cp.execFileSync('python3',[new URL('./prepare-fmd-assets.py',import.meta.url).pathname],{stdio:'pipe',timeout:60000});
const compilerTree='/dev/shm/maintenance-go12610-runtime';
if(key==='fmd'&&!fs.existsSync(compilerTree)){const id=cp.execFileSync('docker',['create','--entrypoint','/bin/true','sha256:5bba7feafd0a05a85a6454714b44e5909beebda3dfda1018bb0f4fd5acc66d1f'],{encoding:'utf8'}).trim();try{cp.execFileSync('docker',['cp',id+':/usr/local/go',compilerTree],{stdio:'ignore',timeout:180000});}finally{cp.execFileSync('docker',['rm',id],{stdio:'ignore'});}}
if(key==='fmd')assert(fs.readFileSync(compilerTree+'/VERSION','utf8').split('\n')[0]==='go1.26.10');
const source='/opt/utilibre/community-src/'+(key==='fmd'?'fmd-server':key),out=root+'/'+key;
assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>8*1024**3);
assert(!fs.existsSync(out+'/output/'+key+'-buildinfo.txt'),'Preserve completed build');
const args=['run','--rm','--name','maintenance-runtime-'+key,'--network',phase==='build'?'none':'bridge','--read-only','--cpus','2','--memory','4g','--memory-swap','4g','--pids-limit','256','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=3g','--tmpfs','/tmp:rw,exec,size=64m','-e','EXPECTED_GO='+s.compilerVersion,'-e','GO_PHASE='+phase,'-e','GOPATH=/work/gopath','-e','MODULE_CACHE=/modules','-v',out+'/cache:/modules'+(phase==='build'?':ro':''),'-v',out+'/output:/output','-v',source+':/source-git:ro','-v','/var/lib/utilibre-maintenance/go-runtime-20261011/input:/input:ro','-v',here+':/recipe:ro',...(key==='fmd'?['-v','/dev/shm/maintenance-fmd-embed-runtime:/web-assets:ro','-v',compilerTree+':/compiler:ro','-e','GOROOT=/compiler','-e','PATH=/compiler/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin']:[]),compiler,'sh','/recipe/build-'+key+'.sh'];
const fd=fs.openSync(out+'/'+phase+'.log','a',0o600),r=cp.spawnSync('docker',args,{stdio:['ignore',fd,fd],timeout:1800000});fs.closeSync(fd);assert.equal(r.status,0,key+' '+phase+' failed; private diagnostic retained');console.log(key+': '+phase+' passed');
