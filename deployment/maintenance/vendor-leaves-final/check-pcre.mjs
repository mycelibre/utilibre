// Existing application fixtures, no production data and no outbound network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
process.umask(0o077);
const root='/home/ubuntu/freetools/deployment',dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011';
const stage=JSON.parse(fs.readFileSync(dir+'/pcre-stage.json'));assert.equal(stage.status,'passed');
const docker=(args)=>execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});
const results=[];
for(const r of stage.rows){
 const name='maintenance-pcre-app-'+r.kind,checks=[];
 try{
  assert.equal(docker(['image','inspect',r.candidate,'--format','{{.Id}}']).trim(),r.candidateId);
  docker(['run','-d','--name',name,'--network','none','--read-only','--cpus','1','--memory','512m','--pids-limit','96','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true',
   '--tmpfs','/tmp:rw,size=96m,mode=1777','--tmpfs','/data:rw,size=128m,mode=1777','--tmpfs','/app/storage:rw,size=32m,uid=1000,gid=1000','--tmpfs','/app/.user:rw,size=32m,uid=1000,gid=1000',
   '-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','DATA_PATH=/data','-e','STORAGE_PATH=/data','-e','SECRET_KEY=fictional-native-gate-only-not-production','-e','REGISTER_ENABLE=false','-e','ADMIN_EMAIL=fictional@example.invalid',
   '-e','ENABLE_DAILY_BACKUP=false','-e','HABITS_STORAGE=DATABASE','-e','DATABASE_URL=sqlite+aiosqlite:////app/.user/habits.db',
   '--mount','type=bind,src='+root+',dst=/fixture,readonly',...(r.kind==='priviblur'?['--mount','type=bind,src='+root+'/community/priviblur.toml,dst=/priviblur/config.toml,readonly']:[]),...(r.kind==='family-chess'?['-e','PYTHONPATH=/app','-e','ALLOWED_HOSTS=chess.utilibre.org','-e','CSRF_TRUSTED_ORIGINS=https://chess.utilibre.org']:[]),'--entrypoint','sleep',r.candidate,'420']);
  const run=(command,...args)=>docker(['exec',name,command,...args]);
  if(r.kind==='freshrss'){
   const cli=(...a)=>run('php','/var/www/FreshRSS/cli/'+a.shift(),...a);
   cli('prepare.php');cli('do-install.php','--default-user','fictional','--db-type','sqlite','--auth-type','form','--environment','silent','--disable-update','true');
   cli('create-user.php','--user','fictional','--password','Fictional-only-not-production-2026','--no-default-feeds');
   assert.match(run('php','/fixture/maintenance/xml-final/freshrss.php'),/FRESHRSS_NATIVE_PASSED/);
   checks.push('fresh SQLite account; synthetic native RSS/article/OPML storage and export');
  }else if(r.kind==='family-chess'){
   assert.match(run('python','-B','/fixture/family-chess/check-native.py'),/two legal moves/);checks.push('two players; CSRF/turn/seat denial; legal moves; SQLite reopen; fixture expiry');
  }else if(r.kind==='unfurl'){
   assert.match(run('python','-B','/fixture/unfurl/check-native.py'),/PASS real fictional/);checks.push('loopback HEAD-only redirects; no cookies/auth; ten-request bound');
  }else if(r.kind==='trip'){
   assert.match(run('python','-B','-c',`from fastapi.testclient import TestClient
from trip.main import app
with TestClient(app) as c:
 assert c.get('/api/info').status_code==200
 assert c.get('/api/trips').status_code in (401,403)
print('TRIP_NATIVE_PASSED')`),/TRIP_NATIVE_PASSED/);checks.push('fresh native SQLite startup; info route; unauthenticated private-trip denial');
  }else if(r.kind==='beaverhabits'){
   assert.match(run('python','-B','-c',`from beaverhabits.main import app
from fastapi.testclient import TestClient
assert '/auth/login' in app.openapi()['paths']
with TestClient(app) as c:
 assert c.get('/users/me').status_code==401
print('BEAVER_NATIVE_PASSED')`),/BEAVER_NATIVE_PASSED/);checks.push('native app/import and login routing; in-memory SQLite');
  }else if(r.kind==='13ft'){
   assert.match(run('python','-B','-c',`import sys;sys.path.insert(0,'/upstream/app')
from portable import app
with app.test_client() as c:
 r=c.get('/');assert r.status_code==200 and b'http' in r.data
print('READER_NATIVE_PASSED')`),/READER_NATIVE_PASSED/);checks.push('native Flask landing response with no external retrieval');
  }else if(r.kind==='priviblur'){
   assert.match(run('python','-B','-c',`from src.server import app
assert len(app.router.routes)>5
print('PRIVIBLUR_NATIVE_PASSED')`),/PRIVIBLUR_NATIVE_PASSED/);checks.push('native Sanic routes/templates imports; no upstream Tumblr query');
  }else if(r.kind==='breezewiki'){
   assert.match(run('racket','--version'),/Racket/);
   assert.match(run('python','-B','-c',`import importlib.util
s=importlib.util.spec_from_file_location('transport','/app/utilibre-transport.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
assert m.checked_url('https://fictional.fandom.com/wiki/Test')
try:m.checked_url('http://127.0.0.1/private')
except (ValueError,PermissionError):pass
else:raise AssertionError('Internal address permitted')
print('BREEZE_NATIVE_PASSED')`),/BREEZE_NATIVE_PASSED/);checks.push('native Racket runtime; private-transport URL allowlist/rejection');
  }else if(r.kind==='radicale'){
   assert.match(run('python','-B','-m','radicale','--version'),/\d+\.\d+/);checks.push('native CalDAV application startup/version');
  }else if(r.kind==='public-egress'){
   for(const live of ['utilibre-13ft-proxy-1','utilibre-trip-proxy-1','utilibre-wallabag-proxy-1','utilibre-records-egress-1','utilibre-unfurl-proxy-1']){
    const x=JSON.parse(docker(['inspect',live]))[0];const conf=x.Mounts.find(m=>m.Destination==='/etc/squid/squid.conf').Source;
    docker(['run','--rm','--network','none','--read-only','--cpus','1','--memory','128m','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--tmpfs','/tmp:rw,size=16m,mode=1777','--mount','type=bind,src='+conf+',dst=/etc/squid/squid.conf,readonly','--entrypoint','/opt/squid/sbin/squid',r.candidate,'-k','parse','-f','/etc/squid/squid.conf']);
   }checks.push('all five unchanged native Squid privacy/egress configurations parse');
  }
  results.push({kind:r.kind,imageId:r.candidateId,passed:true,checks,checkedAt:new Date().toISOString()});console.log(r.kind+': native gate passed');
 }catch(e){fs.writeFileSync(dir+'/'+r.kind+'-native-error.log',String(e.stdout||'')+String(e.stderr||'')+String(e));throw Error(r.kind+' native gate failed; private diagnostic retained');}
 finally{try{docker(['rm','-f',name]);}catch{}}
}
fs.writeFileSync(dir+'/pcre-native.json',JSON.stringify({status:'passed',completedAt:new Date().toISOString(),network:'none',rows:results,limitation:'Synthetic component/application gates; no real user data, accounts, device coverage or upstream proxy success inferred.'},null,2)+'\n');
