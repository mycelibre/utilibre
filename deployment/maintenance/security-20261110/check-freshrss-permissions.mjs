// Ordinary functional checks only; no production accounts, mounts or Internet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
process.umask(0o077);
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const policy=JSON.parse(fs.readFileSync(new URL('./freshrss-permissions.json',import.meta.url)));
const out=path.resolve(process.argv[2]||'');
assert(process.argv.length===3 && path.isAbsolute(process.argv[2]) && !fs.existsSync(out),'Provide a new absolute private evidence directory');
fs.mkdirSync(out,{recursive:true,mode:0o700});
const run=(cmd,args,opts={})=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout:90000,maxBuffer:2*1024**2,stdio:['pipe','pipe','pipe'],...opts}).trim();
const docker=(...args)=>run('docker',args);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const username='utilibrerestore123456789abc',password='Fictional-local-only-2026';
const results=[];
const inputs=['deployment/maintenance/security-20261110/freshrss-permissions.json','deployment/maintenance/security-20261110/check-freshrss-permissions.mjs','deployment/utilibre/tests/freshrss-ordinary.php','deployment/utilibre/tests/check-freshrss-restored-browser.mjs','deployment/pack/freshrss-start.sh','deployment/pack/freshrss-privacy.conf'];
const inputHashes=Object.fromEntries(inputs.map(f=>[f,createHash('sha256').update(fs.readFileSync(path.join(repo,f))).digest('hex')]));
assert.equal(docker('image','inspect','--format','{{.Id}}',policy.image),policy.image);
for(const mode of ['baseline','restricted']){
 const dir=path.join(out,mode);fs.mkdirSync(dir,{mode:0o700});
 const name=`utilibre-freshrss-permissions-${mode}-${process.pid}`,network=name+'-net';
 let created=false,netCreated=false,bridge;
 const exec=(...args)=>docker('exec',name,...args);
 try{
  assert.equal(docker('ps','-aq','--filter','name=^/'+name+'$'),'');
  docker('network','create','--internal',network);netCreated=true;
  const caps=mode==='restricted'?['--cap-drop','ALL',...policy.capAdd.flatMap(c=>['--cap-add',c])]:[];
  docker('run','-d','--name',name,'--init','--network',network,'--cpus','1','--memory','512m','--pids-limit','128','--log-driver','none','--security-opt','no-new-privileges:true',...caps,
   '--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/var/www/FreshRSS/data:rw,size=64m,mode=0770','--tmpfs','/var/www/FreshRSS/extensions:rw,size=16m,mode=0770',
   '-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','TZ=UTC','-e','CRON_MIN=13,43','-e','FRESHRSS_ENV=silent','-e','COPY_LOG_TO_SYSLOG=Off','-e','COPY_SYSLOG_TO_STDERR=Off','-e','INTERNAL_HOST_ALLOWLIST=127.0.0.1:8000',
   '-e',`FRESHRSS_INSTALL=--default-user ${username} --db-type sqlite --auth-type form --environment silent --language en --base-url http://127.0.0.1:33291 --disable-update true`,
   '-e',`FRESHRSS_USER=--user ${username} --password ${password} --language en --no-default-feeds`,
   '-v',path.join(repo,'deployment/pack/freshrss-start.sh')+':/privacy/freshrss-start.sh:ro',
   '-v',path.join(repo,'deployment/pack/freshrss-privacy.conf')+':/etc/apache2/utilibre-privacy.conf:ro',
   '-v',path.join(repo,'deployment/utilibre/tests/freshrss-ordinary.php')+':/check.php:ro',
   policy.image,'/bin/sh','/privacy/freshrss-start.sh');created=true;
  let ready=false;
  for(let n=0;n<40;n++){
   try{exec('php','-r',"$s=file_get_contents('http://127.0.0.1/i/?c=auth&a=login');if(!str_contains($s,'password'))exit(1);");ready=true;break;}catch{await delay(500);}
  }
  assert(ready,'Native entrypoint and Apache must become ready');
  const fixtureResult=JSON.parse(docker('exec','-u','www-data',name,'php','/check.php'));
  assert.equal(fixtureResult.saveAndExportPassed,true);
  const inspected=JSON.parse(docker('inspect',name))[0];
  const ip=inspected.NetworkSettings.Networks[network].IPAddress;
  bridge=cp.spawn('socat',['TCP4-LISTEN:33291,bind=127.0.0.1,reuseaddr,fork,max-children=16','TCP4:'+ip+':80'],{stdio:'ignore'});
  await delay(300);assert(bridge.exitCode===null,'Disposable browser port is occupied');
  const fixture={username,password,feedId:fixtureResult.feedId,feedName:'Fictional permission test feed',title:'Fictional café'};
  const browser=label=>{
   fs.writeFileSync(path.join(dir,'fixture.json'),JSON.stringify(fixture));
   run('node',[path.join(repo,'deployment/utilibre/tests/check-freshrss-restored-browser.mjs'),path.join(dir,'fixture.json'),path.join(dir,label+'.png'),path.join(dir,label+'.json')]);
  };
  browser('browser-save');
  exec('sh','-c','mkdir /tmp/feed');
  const feed='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Fictional permission test feed</title><link>https://example.invalid/</link><description>Fictional only</description><item><guid>urn:fixture:cron</guid><title>Fictional cron article</title><link>https://example.invalid/cron</link><description>Ordinary refresh check</description><pubDate>'+new Date().toUTCString()+'</pubDate></item></channel></rss>';
  run('docker',['exec','-i',name,'sh','-c','cat > /tmp/feed/feed.xml'],{input:feed});
  docker('exec','-d','-u','www-data',name,'php','-S','127.0.0.1:8000','-t','/tmp/feed');
  // Disposable syslog capture diagnoses native cron/PAM; never mounted live.
  docker('exec','-d',name,'php','-r',"$s=socket_create(AF_UNIX,SOCK_DGRAM,0);if(!socket_bind($s,'/dev/log'))exit(1);while(socket_recv($s,$b,65536,0)>0)file_put_contents('/tmp/cron-system.log',$b.PHP_EOL,FILE_APPEND);");
  const cron=`* * * * * . /var/www/FreshRSS/Docker/env.txt; su www-data -s /bin/sh -c 'php /var/www/FreshRSS/cli/actualize-user.php --user ${username} --feed-id ${fixture.feedId} && printf passed > /tmp/cron-passed' > /tmp/cron-check.log 2>&1\n`;
  run('docker',['exec','-i',name,'crontab','-'],{input:cron});
  let cronPassed=false;
  for(let n=0;n<70;n++){
   try{assert.equal(exec('cat','/tmp/cron-passed'),'passed');cronPassed=true;break;}catch{await delay(1000);}
  }
  assert(cronPassed,'Actual cron/PAM user switch and local feed refresh must succeed');
  fixture.title='Fictional cron article';browser('browser-cron');
  exec('crontab','-r');
  exec('sh','-c','. /etc/apache2/envvars && apache2 -k graceful -c "Include /etc/apache2/utilibre-privacy.conf"');
  await delay(750);browser('browser-graceful');
  const processes=docker('top',name,'-eo','pid,uid,gid,comm');
  assert.match(processes,/\b33\s+33\s+apache2/);
  const capabilities=exec('sh','-c',"awk '/^Cap(Eff|Bnd):/{print}' /proc/1/status");
  if(mode==='restricted'){
   assert.deepEqual(inspected.HostConfig.CapDrop,['ALL']);
   assert.deepEqual(inspected.HostConfig.CapAdd.map(c=>c.replace(/^CAP_/,'' )).sort(),[...policy.capAdd].sort());
   assert.match(capabilities,/CapEff:\s+00000000200004eb/);
  }
  assert.equal(exec('sh','-c','find /var/log/apache2 -type f -size +0c -print'),'');
  docker('stop','--time','15',name);
  const stopped=JSON.parse(docker('inspect',name))[0].State;
  assert.equal(stopped.ExitCode,0,'Native graceful stop must not need SIGKILL');
  results.push({mode,passed:true,image:policy.image,capabilities,webWorkersUid:33,checks:['native entrypoint and account creation','save fictional article','native OPML export','browser login and stored article','actual cron with PAM user switch','local-only feed refresh and browser read','Apache graceful reload','graceful container stop','no persisted Apache request log','browser requests limited to fixture origin']});
  fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(results.at(-1),null,2)+'\n');
  console.log(`${mode}: ordinary FreshRSS checks passed`);
 }catch(error){
  let diagnostic=String(error)+'\n'+String(error.stdout||'')+String(error.stderr||'');
  if(created){try{diagnostic+='\n'+exec('sh','-c','cat /tmp/cron-check.log /tmp/cron-system.log /proc/1/loginuid 2>/dev/null; crontab -l; ps -eo uid,gid,comm');}catch{}}
  fs.writeFileSync(path.join(dir,'failure.log'),diagnostic);throw Error('FreshRSS check failed; private diagnostic: '+dir+'/failure.log');
 }finally{
  if(bridge){bridge.kill();await delay(150);}
  if(created)docker('rm','-f','-v',name);
  if(netCreated)docker('network','rm',network);
 }
}
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,date:new Date().toISOString(),inputHashes,results,productionChanged:false,network:'isolated internal Docker network; loopback fixture feed only',limits:{cpu:1,memoryMiB:512,pids:128},limitations:['Synthetic SQLite account; production uses PostgreSQL, which this permission-only change does not reconfigure.','No real upstream feeds, email or vulnerability reproduction.','Capability reduction does not repair ACL callers.']},null,2)+'\n');
