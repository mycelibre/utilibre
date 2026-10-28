// Reuse native Linkding checks: legacy private restore or DRF fresh synthetic DB.
import assert from 'node:assert/strict';
import {execFileSync as exec} from 'node:child_process';
import {mkdirSync,mkdtempSync,readdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
const drf=process.argv.includes('--drf-oct28'),spec=drf?JSON.parse(readFileSync(new URL('./security-20261028/drf-inputs.json',import.meta.url))).rows.find(s=>s.key==='linkding'):null;
const repeated=process.argv.includes('--verify-released');assert(!repeated||drf);
const dir=drf?'/var/lib/utilibre-maintenance/security-20261028/drf/linkding':'/var/lib/utilibre-maintenance/linkding-python-20261011';mkdirSync(dir,{recursive:true,mode:0o700});
const scratch=mkdtempSync(dir+'/restore-'),name='utilibre-linkding-python-stage',image=drf?spec.candidate:process.argv[2]||'utilibre-linkding:1.47.0-python-security-20261011';
assert(drf||['utilibre-linkding:1.47.0-python-security-20261011','utilibre-linkding:1.47.0-python-security-20261011-p2'].includes(image));
const docker=args=>exec('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});
let started=false;
try{
 assert.equal(docker(['ps','-aq','--filter','name=^/'+name+'$']).trim(),'');
 const live=JSON.parse(docker(['inspect','utilibre-linkding-linkding-1']))[0];
 if(repeated){const release=JSON.parse(readFileSync(dir+'/../release.json')),build=JSON.parse(readFileSync(dir+'/build.json'));assert(release.groups.some(g=>g.key==='linkding'&&g.status==='passed'&&g.rows.some(r=>r.newImage===build.imageId)));assert.equal(live.Image,build.imageId);}
 else if(drf)assert.equal(live.Image,spec.base);else assert(['utilibre-linkding:debian-security-20261011','utilibre-linkding:1.47.0-python-security-20261011'].includes(live.Config.Image));
 const backup=drf?null:'/opt/utilibre/community-backups/'+readdirSync('/opt/utilibre/community-backups').filter(x=>/^linkding-\d{8}T\d{6}Z$/.test(x)).sort().at(-1);
 if(!drf){exec('sha256sum',['-c','SHA256SUMS'],{cwd:backup,stdio:'pipe'});exec('tar',['-xzf',backup+'/data.tar.gz','-C',scratch],{stdio:'pipe'});}
 const data=scratch+'/linkding';if(drf)mkdirSync(data);exec('chown',['-R','33:33',data]);
 const mount=live.Mounts.find(x=>x.Destination==='/etc/linkding/bookmarks/settings/custom.py');assert(mount&&!mount.RW);
 const env=drf?Object.entries({LD_ENABLE_AUTH_PROXY:'False',LD_FAVICON_PROVIDER:'',LD_ENABLE_REFRESH_FAVICONS:'False',LD_ENABLE_SNAPSHOTS:'False',LD_DISABLE_ASSET_UPLOAD:'True',LD_DISABLE_BACKGROUND_TASKS:'True',LD_DISABLE_REQUEST_LOGS:'True',LD_ENABLE_OIDC:'True',LD_DISABLE_LOGIN_FORM:'True',OIDC_VERIFY_SSL:'True',OIDC_USE_PKCE:'True',OIDC_RP_CLIENT_ID:'fictional',OIDC_RP_CLIENT_SECRET:'fictional-only',OIDC_OP_AUTHORIZATION_ENDPOINT:'https://example.invalid/authorize',OIDC_OP_TOKEN_ENDPOINT:'https://example.invalid/token',OIDC_OP_USER_ENDPOINT:'https://example.invalid/userinfo',OIDC_OP_JWKS_ENDPOINT:'https://example.invalid/jwks'}).map(([k,v])=>k+'='+v):live.Config.Env;
 docker(['run','-d','--name',name,'--network','none','--log-driver','none','--read-only','--user','33:33','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--pids-limit','128','--tmpfs','/tmp:rw,nosuid,size=32m,mode=1777',...env.flatMap(e=>['-e',e]),'-v',data+':/etc/linkding/data','-v',mount.Source+':'+mount.Destination+':ro',image]);started=true;
 let ready=false;for(let i=0;i<50;i++){try{docker(['exec',name,'curl','-fsS','http://127.0.0.1:9090/health']);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,1000));}assert(ready);
 if(drf)docker(['exec',name,'python','manage.py','shell','-c','from bookmarks.models import GlobalSettings; g=GlobalSettings.get(); g.enable_link_prefetch=False; g.save()']);
 const result=exec('docker',['exec','-i',name,'python','manage.py','shell','-c','import sys; exec(sys.stdin.read())'],{input:readFileSync('deployment/community/linkding-native-check.py'),encoding:'utf8',timeout:120000,maxBuffer:2*1024**2});
 const checks=JSON.parse(result.trim().split('\n').at(-1));assert(checks.nativeApiCreate&&checks.htmlExportImportRoundTrip&&checks.anonymousDenied);
 writeFileSync(dir+(repeated?'/stage-followup.json':image.endsWith('-p2')?'/stage-p2.json':'/stage.json'),JSON.stringify({date:new Date().toISOString(),status:'passed',image,newImage:docker(['image','inspect','--format','{{.Id}}',image]).trim(),oldImage:drf?spec.base:live.Image,oldRef:drf?spec.oldRef:live.Config.Image,backup,checks,freshSyntheticDatabase:drf,network:drf?'none; fresh fictional database and credentials; read-only native custom settings':'none; restored private copy; production records untouched'},null,2),{mode:0o600});
 console.log('Linkding native saved bookmark/export/import, privacy settings and access isolation passed on '+(drf?'a fresh synthetic database.':'a restored copy.'));
}catch(error){writeFileSync(dir+'/stage-error.log',String(error.stderr||'Assertion failed; no environment dumped.'),{mode:0o600});throw Error('Linkding candidate failed; inspect private stage-error.log');}
finally{if(started)docker(['rm','-f',name]);rmSync(scratch,{recursive:true,force:true});}
