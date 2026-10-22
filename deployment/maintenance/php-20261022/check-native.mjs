// Reuse application-owned regressions with fictional state and no networking.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import {output} from './specs.mjs';
process.umask(0o077);
const keys=process.argv.slice(2);assert(keys.length&&keys.every(k=>['translite','binternet','wallabag','addy'].includes(k)));
const common=['--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','384m','--memory-swap','384m','--cpus','1','--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777'];
for(const key of keys){
 const dir=output+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));
 assert(b.passed);assert.equal(cp.execFileSync('docker',['image','inspect','--format','{{.Id}}',b.candidate],{encoding:'utf8'}).trim(),b.imageId);
 let options=[],args=[],expected,checks,limitations;
 if(key==='translite'){
  args=['-d','apc.enable_cli=1','/app/tests/utilibre.php'];expected='25 URL/IP/cache checks passed';
  checks=['Native URL and address validation','Request-local translation memoization','No shared submitted-text cache','Language-list caching'];limitations=['No real translation provider queried'];
 }else if(key==='binternet'){
  args=['/app/tests/utilibre-http.php'];expected='22 Binternet URL/address checks passed.';
  checks=['Native accepted image URL','Malformed/credential/private-address rejection'];limitations=['No Pinterest media query','Onion container health checked at release; end-to-end Tor retrieval not retested'];
 }else if(key==='addy'){
  options=['-e','APP_ENV=testing','-e','APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=','-e','APP_URL=http://isolated.example.invalid','-e','SESSION_DRIVER=array','-e','MAIL_MAILER=array','-v',path.resolve('deployment/maintenance/php-20261022/addy.php')+':/check:ro'];args=['/check'];
  checks=['Native address validation','Native reply banner removal','Laravel encryption round-trip','MIME message construction','Native login HTTP kernel/form'];limitations=['No mail sent','No account/alias database writes','SMTP supervisor boundary verified separately at release'];
 }else{
  const env={UTILIBRE_ISOLATED_REGRESSION:'1',APP_ENV:'prod',APP_DEBUG:'0',APP_SECRET:'fictional-isolated-regression-not-a-production-secret',DATABASE_URL:'sqlite:////app/data/db/isolated-regression.sqlite',WALLABAG_BASE_URL:'http://isolated.example.invalid',MAILER_DSN:'null://null',SENTRY_DSN:'',WALLABAG_REGISTRATION_ENABLED:'0',WALLABAG_CONFIRMATION_ENABLED:'0',WALLABAG_CAPTCHA_ENABLED:'0',DEFAULT_LOCALE:'en',WALLABAG_TABLE_PREFIX:'wallabag_',WALLABAG_LOG_LEVEL:'error',WALLABAG_FROM_EMAIL:'fictional@example.invalid',WALLABAG_TWOFACTOR_SENDER:'fictional@example.invalid',WALLABAG_SERVER_NAME:'Isolated regression',WALLABAG_SITE_CONFIG_FOLDERS:'/app/vendor/j0k3r/graby-site-config',WALLABAG_USER_AGENT:'Isolated-regression-no-network',WALLABAG_ARTICLE_REPORTING_URL:'',WALLABAG_OAUTH_ACCESS_TOKEN_LIFETIME:'3600',WALLABAG_OAUTH_REFRESH_TOKEN_LIFETIME:'7200',WALLABAG_RABBITMQ_PREFETCH_COUNT:'1',RABBITMQ_URL:'amqp://unused:unused@127.0.0.1:1/unused',REDIS_URL:'redis://127.0.0.1:1'};
  options=['--user','4007:4007','--tmpfs','/app/var:rw,size=96m,uid=4007,gid=4007,mode=0700,noexec,nosuid','--tmpfs','/app/data:rw,size=16m,uid=4007,gid=4007,mode=0700,noexec,nosuid','-v',path.resolve('deployment/pack/wallabag/check-private-library.php')+':/check:ro',...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v])];args=['/check'];
  checks=['Two native accounts/login','Synthetic private article persistence/read','Native JSON export/reopen','Other-account and anonymous denial'];limitations=['BrowserKit test sessions, not physical browser','No external article retrieval','No schema upgrade or account recovery'];
 }
 const proofs=[];
 for(const id of [b.base,b.imageId]){
  let text;try{text=cp.execFileSync('docker',['run',...common,...options,'--entrypoint','php',id,...args],{encoding:'utf8',timeout:120000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error(key+': isolated native regression failed; private diagnostic retained');}
  if(['wallabag','addy'].includes(key)){const r=JSON.parse(text);assert(r.passed&&r.checks===(key==='wallabag'?26:8));proofs.push({imageId:id,...r});}else{assert.equal(text,expected);proofs.push({imageId:id,result:text});}
 }
 fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),imageId:b.imageId,passed:true,checks,proofs,network:'none',limitations},null,2)+'\n');
 console.log(key+': existing native regressions passed on maintained baseline and fixed candidate');
}
