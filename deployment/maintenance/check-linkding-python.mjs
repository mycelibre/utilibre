// Reuse the native Linkding regression against an isolated copy of its backup.
import assert from 'node:assert/strict';
import {execFileSync as exec} from 'node:child_process';
import {mkdirSync,mkdtempSync,readdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
const dir='/var/lib/utilibre-maintenance/linkding-python-20261011';mkdirSync(dir,{recursive:true,mode:0o700});
const scratch=mkdtempSync(dir+'/restore-'),name='utilibre-linkding-python-stage',image=process.argv[2]||'utilibre-linkding:1.47.0-python-security-20261011';
assert(['utilibre-linkding:1.47.0-python-security-20261011','utilibre-linkding:1.47.0-python-security-20261011-p2'].includes(image));
const docker=args=>exec('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});
let started=false;
try{
 assert.equal(docker(['ps','-aq','--filter','name=^/'+name+'$']).trim(),'');
 const live=JSON.parse(docker(['inspect','utilibre-linkding-linkding-1']))[0];
 assert(['utilibre-linkding:debian-security-20261011','utilibre-linkding:1.47.0-python-security-20261011'].includes(live.Config.Image));
 const backup='/opt/utilibre/community-backups/'+readdirSync('/opt/utilibre/community-backups').filter(x=>/^linkding-\d{8}T\d{6}Z$/.test(x)).sort().at(-1);
 exec('sha256sum',['-c','SHA256SUMS'],{cwd:backup,stdio:'pipe'});
 exec('tar',['-xzf',backup+'/data.tar.gz','-C',scratch],{stdio:'pipe'});
 const data=scratch+'/linkding';exec('chown',['-R','33:33',data]);
 const mount=live.Mounts.find(x=>x.Destination==='/etc/linkding/bookmarks/settings/custom.py');assert(mount&&!mount.RW);
 docker(['run','-d','--name',name,'--network','none','--log-driver','none','--read-only','--user','33:33','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--pids-limit','128','--tmpfs','/tmp:rw,nosuid,size=32m,mode=1777',...live.Config.Env.flatMap(e=>['-e',e]),'-v',data+':/etc/linkding/data','-v',mount.Source+':'+mount.Destination+':ro',image]);started=true;
 let ready=false;for(let i=0;i<50;i++){try{docker(['exec',name,'curl','-fsS','http://127.0.0.1:9090/health']);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,1000));}assert(ready);
 const result=exec('docker',['exec','-i',name,'python','manage.py','shell','-c','import sys; exec(sys.stdin.read())'],{input:readFileSync('deployment/community/linkding-native-check.py'),encoding:'utf8',timeout:120000,maxBuffer:2*1024**2});
 const checks=JSON.parse(result.trim().split('\n').at(-1));assert(checks.nativeApiCreate&&checks.htmlExportImportRoundTrip&&checks.anonymousDenied);
 writeFileSync(dir+(image.endsWith('-p2')?'/stage-p2.json':'/stage.json'),JSON.stringify({date:new Date().toISOString(),status:'passed',image,newImage:docker(['image','inspect','--format','{{.Id}}',image]).trim(),oldImage:live.Image,oldRef:live.Config.Image,backup,checks,network:'none; restored private copy; production records untouched'},null,2),{mode:0o600});
 console.log('Linkding native saved bookmark/export/import, privacy settings and anonymous denial passed on restored copy.');
}catch(error){writeFileSync(dir+'/stage-error.log',String(error.stderr||'Assertion failed; no environment dumped.'),{mode:0o600});throw Error('Linkding candidate failed; inspect private stage-error.log');}
finally{if(started)docker(['rm','-f',name]);rmSync(scratch,{recursive:true,force:true});}
