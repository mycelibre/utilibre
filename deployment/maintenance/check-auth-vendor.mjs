// Reuse the existing native auth/OAuth checks, but against a fresh synthetic DB.
// Never inspect/copy production environment, accounts, keys or PostgreSQL data.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
process.umask(0o077);
const image=process.argv[2]||'utilibre-authentik:2026.8.3-vendor-security-20261011';
assert(['utilibre-authentik:2026.8.3-vendor-security-20261011','utilibre-authentik:2026.8.3-vendor-security-20261011-language-20261011','utilibre-authentik:2026.8.3-xml-security-20261011'].includes(image),'Reviewed image only');
const db='maintenance-auth-vendor-db',app='maintenance-auth-vendor-app';
const dir='/var/lib/utilibre-maintenance/vendor-stage-20261011';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:8*1024**2});
try{
 await mkdir(dir,{recursive:true,mode:0o700});
 docker('run','-d','--name',db,'--network','none','--log-driver','none','--memory','512m','--cpus','1',
  '--pids-limit','128','--tmpfs','/var/lib/postgresql/data:rw,size=384m',
  '-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_USER=authentik','-e','POSTGRES_DB=authentik',
  'postgres:16-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea',
  'postgres','-c','listen_addresses=127.0.0.1','-c','max_wal_size=64MB','-c','min_wal_size=32MB');
 let ready=false;
 for(let n=0;n<60;n++){try{docker('exec',db,'pg_isready','-h','127.0.0.1','-U','authentik');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}
 assert(ready);
 const env={AUTHENTIK_POSTGRESQL__HOST:'127.0.0.1',AUTHENTIK_POSTGRESQL__PASSWORD:'',AUTHENTIK_POSTGRESQL__NAME:'authentik',
  AUTHENTIK_POSTGRESQL__USER:'authentik',AUTHENTIK_POSTGRESQL__SSLMODE:'disable',AUTHENTIK_SECRET_KEY:randomBytes(32).toString('base64url'),
  AUTHENTIK_LOG_LEVEL:'error',AUTHENTIK_ERROR_REPORTING__ENABLED:'false',AUTHENTIK_DISABLE_STARTUP_ANALYTICS:'true',
  AUTHENTIK_DISABLE_UPDATE_CHECK:'true',AUTHENTIK_OUTPOSTS__DISABLE_EMBEDDED_OUTPOST:'true',AUTHENTIK_OUTPOSTS__DISCOVER:'false',
  AUTHENTIK_EMAIL__HOST:'127.0.0.1',AUTHENTIK_EMAIL__PORT:'9',AUTHENTIK_EMAIL__TIMEOUT:'1',UTILIBRE_SECURITY_DISPOSABLE:'yes'};
 docker('run','-d','--name',app,'--network','container:'+db,'--log-driver','none','--read-only','--user','1000:1000',
  '--cap-drop','ALL','--security-opt','no-new-privileges:true','--cpus','1','--memory','1536m','--pids-limit','256',
  '--tmpfs','/tmp:rw,nosuid,size=64m,mode=1777','--tmpfs','/data:rw,nosuid,size=32m,uid=1000,gid=1000',
  ...Object.entries(env).flatMap(([key,value])=>['-e',key+'='+value]),'--entrypoint','sleep',image,'480');
 // This release requires its system migrations before Django migrate_schemas.
 docker('exec',app,'python','-m','lifecycle.migrate');
 const existing=await readFile(new URL('./check-auth-python.py',import.meta.url),'utf8');
 // The existing test asserts an owner exists. Seed a synthetic row in this
 // empty DB, not a clone of the real owner. No email or password is sent.
 const seed=`from authentik.core.models import User\nUser.objects.get_or_create(username='akadmin',defaults={'email':'admin@utilibre.org','is_active':True})\n`;
 const checks=`import urllib3, ssl\nfrom importlib.metadata import distribution\nassert urllib3.__version__=='2.8.0'\nassert str(distribution('urllib3').locate_file('urllib3')).startswith('/ak-root/.venv/')\nassert '+ak-fips' in ssl.OPENSSL_VERSION\n`;
 const output=execFileSync('docker',['exec','-i',app,'ak','shell','-c','import sys; exec(sys.stdin.read())'],
  {input:seed+checks+existing,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:180000,maxBuffer:4*1024**2});
 assert(output.includes('UTILIBRE_NATIVE_AUTH_PASSED'));
 const record={checkedAt:new Date().toISOString(),image,imageId:docker('image','inspect',image,'--format','{{.Id}}').trim(),
  network:'none; disposable PostgreSQL loopback only',blankDatabaseMigrations:true,syntheticOwnerOnly:true,
  nativePasswordAndTotpReplay:true,rsaAndEcdsaOAuthCodeExchange:true,jwks:true,audienceSignatureCodeReplayRejection:true,
  urllib3:'2.8.0',retainedUpstreamFipsOpenSsl:true,
  limitation:'Native Django component/endpoints; not browser MFA, upstream-provider login or external OIDC relying-party traversal.'};
 await writeFile(dir+(image.endsWith('-xml-security-20261011')?'/authentik-xml.json':image.endsWith('-language-20261011')?'/authentik-language.json':'/authentik.json'),JSON.stringify(record,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(record));
}catch(error){
 await writeFile(dir+'/authentik-stage-error.log',String(error.stderr||error),{mode:0o600});
 console.error('Fresh isolated Authentik candidate test failed; inspect its private stage error. No production state accessed.');process.exitCode=1;
}finally{
 for(const name of [app,db])try{docker('rm','-f',name);}catch{}
}
