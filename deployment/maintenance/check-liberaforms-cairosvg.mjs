// No production network, data, account, key or mail configuration is mounted.
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
process.umask(0o077);
const image=process.argv[2]||'utilibre-liberaforms:4.11.1-cairosvg-security-20261011';
assert(['utilibre-liberaforms:4.11.1-cairosvg-security-20261011','utilibre-liberaforms:4.11.1-pcre-security-20261011','utilibre-liberaforms:4.11.1-pcre-security-20261011-language-20261011'].includes(image),'Reviewed image only');
const db='maintenance-forms-cairo-db',app='maintenance-forms-cairo-app';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:90000});
const bounded=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','384m','--cpus','0.75','--pids-limit','96','--log-driver','none'];
try{
 docker('run','-d','--name',db,'--network','none',...bounded,'--user','70:70',
  '--tmpfs','/var/lib/postgresql/data:rw,size=192m,uid=70,gid=70',
  '--tmpfs','/var/run/postgresql:rw,size=8m,uid=70,gid=70',
  '--tmpfs','/tmp:rw,size=8m,mode=1777','-e','POSTGRES_USER=forms',
  '-e','POSTGRES_DB=fictional_stage','-e','POSTGRES_HOST_AUTH_METHOD=trust',
  'postgres:17.11-alpine@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73',
  'postgres','-c','listen_addresses=127.0.0.1','-c','max_wal_size=64MB','-c','min_wal_size=32MB');
 let ready=false;
 for(let n=0;n<60;n++){try{docker('exec',db,'pg_isready','-U','forms','-d','fictional_stage');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}
 assert(ready,'Temporary database startup');
 const env={FLASK_CONFIG:'production',FLASK_DEBUG:'False',BASE_URL:'https://forms.example.invalid',ROOT_USER:'unused@example.invalid',
  DEFAULT_LANGUAGE:'en-US',DEFAULT_TIMEZONE:'UTC',DB_HOST:'127.0.0.1',DB_NAME:'fictional_stage',DB_USER:'forms',DB_PASSWORD:'',
  SECRET_KEY:randomBytes(32).toString('base64url'),CRYPTO_KEY:randomBytes(32).toString('base64url')+'=',SESSION_TYPE:'sqlalchemy',
  TOKEN_EXPIRATION:'86400',TMP_DIR:'/tmp',LOG_DIR:'/tmp/logs',LOG_LEVEL:'CRITICAL',E2EE_MODE:'REQUIRED',
  ENABLE_UPLOADS:'False',ENABLE_REMOTE_STORAGE:'False',ENABLE_CONFIRMATION_EMAIL:'False',ENABLE_RSS_FEED:'False',
  ENABLE_LDAP:'False',ENABLE_PROMETHEUS_METRICS:'False',TOTAL_UPLOADS_LIMIT:'0 MB',DEFAULT_USER_UPLOADS_LIMIT:'0 MB',
  MAX_MEDIA_SIZE:'262144',MAX_ATTACHMENT_SIZE:'0',SECONDS_TO_POST:'0',RATELIMIT_STORAGE_URI:'memory://',
  RATELIMIT_PER_MINUTE:'100',RATELIMIT_PER_SECOND:'100'};
 docker('run','-d','--name',app,'--network','container:'+db,...bounded,
  '--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/app/uploads:rw,size=24m,uid=4002,gid=4002',
  ...Object.entries(env).flatMap(([key,value])=>['-e',key+'='+value]),image,'sleep','180');
 const code=await readFile(new URL('./check-liberaforms-cairosvg.py',import.meta.url),'utf8');
 const output=execFileSync('docker',['exec','-i',app,'python','-'],{input:code,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:90000});
 const result=JSON.parse(output.trim().split('\n').at(-1));
 const report={checkedAt:new Date().toISOString(),image,imageId:docker('image','inspect',image,'--format','{{.Id}}').trim(),network:'none, shared loopback only',blankDatabase:true,...result};
 await mkdir('/var/lib/utilibre-maintenance/vendor-stage-20261011',{recursive:true,mode:0o700});
 await writeFile('/var/lib/utilibre-maintenance/vendor-stage-20261011/'+(image.endsWith('-language-20261011')?'liberaforms-language':image.includes('-pcre-')?'liberaforms-pcre':'liberaforms')+'.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(report));
}catch(error){
 console.error(error.stderr?.toString()||String(error));process.exitCode=1;
}finally{
 for(const name of [app,db])try{docker('rm','-f',name);}catch{}
}
