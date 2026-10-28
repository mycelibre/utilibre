// Isolated native identity rehearsal. The legacy profile restores a private dump;
// the DRF profile uses a fresh DB and fictional credentials. No live DB writes.
import assert from 'node:assert/strict';
import {execFileSync as exec} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,openSync,closeSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const profile=process.argv.includes('--oauth-oct28')?'oauth':process.argv.includes('--msgpack-oct28')?'msgpack':'drf',drf=process.argv.includes('--drf-oct28')||['msgpack','oauth'].includes(profile),spec=drf?JSON.parse(readFileSync(new URL('./security-20261028/'+profile+'-inputs.json',import.meta.url))).rows.find(s=>s.key==='authentik'):null;
const dir=drf?'/var/lib/utilibre-maintenance/security-20261028/'+profile+'/authentik':'/var/lib/utilibre-maintenance/auth-python-20261011';mkdirSync(dir,{mode:0o700,recursive:true});
const docker=args=>exec('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});
const db='utilibre-auth-python-stage-db',app='utilibre-auth-python-stage';
const image=drf?spec.candidate:'utilibre-authentik:2026.8.3-python-security-20261011';
const pg='postgres:16-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea';
let dbStarted=false,appStarted=false;
try{
 assert.equal(docker(['ps','-aq','--filter','name=^/'+db+'$']).trim(),'');
 assert.equal(docker(['ps','-aq','--filter','name=^/'+app+'$']).trim(),'');
 const live=JSON.parse(docker(['inspect','utilibre-identity-server-1']))[0];
 if(drf)assert.equal(live.Image,spec.base);else assert.equal(live.Config.Image,'ghcr.io/goauthentik/server:2026.8.3@sha256:ab9b4e8cc4ab3f8d1198d2db6aeea66bafea1963b3f2843589e0d163f97d9849');
 const file=dir+'/identity.dump';
 if(!drf){const fd=openSync(file,'w',0o600);try{exec('docker',['exec','utilibre-identity-postgresql-1','pg_dump','-U','authentik','-d','authentik','-Fc'],{stdio:['ignore',fd,'pipe'],timeout:120000});}finally{closeSync(fd);}}
 docker(['run','-d','--name',db,'--network','none','--log-driver','none','--memory','512m','--cpus','1','--tmpfs','/var/lib/postgresql/data:rw,nosuid,size=384m','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_USER=authentik','-e','POSTGRES_DB=authentik',pg]);dbStarted=true;
 let ready=false;for(let i=0;i<40;i++){try{docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','authentik']);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,1000));}assert(ready);
 if(!drf)exec('docker',['exec','-i',db,'pg_restore','--exit-on-error','--no-owner','-U','authentik','-d','authentik'],{input:readFileSync(file),timeout:120000,stdio:['pipe','ignore','pipe']});
 const env=drf?{AUTHENTIK_SECRET_KEY:randomBytes(60).toString('base64url'),AUTHENTIK_POSTGRESQL__USER:'authentik',AUTHENTIK_POSTGRESQL__NAME:'authentik',AUTHENTIK_DISABLE_UPDATE_CHECK:'true',AUTHENTIK_DISABLE_STARTUP_ANALYTICS:'true',AUTHENTIK_ERROR_REPORTING__ENABLED:'false',UTILIBRE_SECURITY_FRESH_FIXTURE:'yes'}:Object.fromEntries(live.Config.Env.map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)]}));
 Object.assign(env,{AUTHENTIK_POSTGRESQL__HOST:'127.0.0.1',AUTHENTIK_POSTGRESQL__PASSWORD:'',AUTHENTIK_POSTGRESQL__PORT:'5432',AUTHENTIK_LOG_LEVEL:'error',UTILIBRE_SECURITY_DISPOSABLE:'yes'});
 docker(['run','-d','--name',app,'--network','container:'+db,'--log-driver','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','1536m','--pids-limit','256','--tmpfs','/tmp:rw,nosuid,size=64m,mode=1777','--tmpfs','/data:rw,nosuid,size=32m,uid=1000,gid=1000',...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),'--entrypoint','sleep',image,'300']);appStarted=true;
 if(drf)docker(['exec',app,spec.python,'-B','-m','lifecycle.migrate']);
 const result=exec('docker',['exec','-i',app,'ak','shell','-c','import sys; exec(sys.stdin.read())'],{input:Buffer.concat([readFileSync('deployment/maintenance/check-auth-python.py'),Buffer.from('\n'),...(profile==='oauth'?[readFileSync('deployment/maintenance/security-20261028/oauth-auth-consumer.py')]:[])]),encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']});
 assert(result.includes('UTILIBRE_NATIVE_AUTH_PASSED'));if(profile==='oauth')assert(result.includes('UTILIBRE_OAUTH1_CONSUMER_PASSED'));
 const record={date:new Date().toISOString(),status:'passed',image,newImage:docker(['image','inspect','--format','{{.Id}}',image]).trim(),oldImage:live.Image,oldRef:live.Config.Image,checks:result.split('\n').find(s=>s.startsWith('UTILIBRE_NATIVE_AUTH_PASSED')),freshSyntheticDatabase:drf,...(profile==='oauth'?{nativeOAuth1ConsumerPassed:true}:{}),network:'none; application shares only disposable PostgreSQL network namespace',limit:'Native component and OAuth endpoint checks; not a full browser MFA or external OIDC relying-party journey.'};
 writeFileSync(dir+'/stage.json',JSON.stringify(record,null,2),{mode:0o600});console.log(record.checks);
}catch(error){writeFileSync(dir+'/stage-error.log',String(error.stderr||'Assertion or staging failure; no environment dumped.'),{mode:0o600});throw Error('Identity candidate failed; inspect private stage-error.log. Production unchanged.');}
finally{if(appStarted)docker(['rm','-f',app]);if(dbStarted)docker(['rm','-f',db]);}
