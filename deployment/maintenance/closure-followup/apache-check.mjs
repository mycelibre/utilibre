import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',stage=JSON.parse(fs.readFileSync(dir+'/apache-stage.json'));
const name='maintenance-apache-freshrss-20261012';let created=false;
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
try{
 assert.equal(docker('ps','-aq','--filter','name=^/'+name+'$'),'');
 docker('run','-d','--name',name,'--network','none','--cpus','1','--memory','512m','--pids-limit','128','--log-driver','none','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/var/www/FreshRSS/data:rw,size=64m,mode=1777','-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','FRESHRSS_ENV=silent','-e','COPY_LOG_TO_SYSLOG=Off','-e','COPY_SYSLOG_TO_STDERR=Off','-v',path.resolve('deployment/pack/freshrss-start.sh')+':/privacy/freshrss-start.sh:ro','-v',path.resolve('deployment/pack/freshrss-privacy.conf')+':/etc/apache2/utilibre-privacy.conf:ro','-v',path.resolve('deployment/maintenance/xml-final/freshrss.php')+':/check.php:ro','--entrypoint','sleep',stage.candidate,'420');created=true;
 const exec=(...args)=>docker('exec',name,...args),cli=(...args)=>exec('php','/var/www/FreshRSS/cli/'+args.shift(),...args);
 cli('prepare.php');cli('do-install.php','--default-user','fictional','--db-type','sqlite','--auth-type','form','--environment','silent','--disable-update','true');cli('create-user.php','--user','fictional','--password','Fictional-not-production-2026','--no-default-feeds');
 assert(exec('php','/check.php').includes('FRESHRSS_NATIVE_PASSED'));
 exec('chown','-R','www-data:www-data','/var/www/FreshRSS/data');
 docker('exec','-d',name,'sh','/privacy/freshrss-start.sh');
 let ready=false;
 for(let i=0;i<30;i++){try{assert(exec('php','-r',`$s=file_get_contents('http://127.0.0.1/i/?c=auth&a=login');if($s===false||strpos($s,'FreshRSS')===false||strpos($s,'password')===false)exit(1);echo 'HTTP_LOGIN_PASSED';`).includes('HTTP_LOGIN_PASSED'));ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}assert(ready,'Actual Apache/PHP login response required');
 exec('sh','-c','. /etc/apache2/envvars && apache2 -t -c "Include /etc/apache2/utilibre-privacy.conf"'); // Native exit status; Apache prints its success text on stderr.
 const logs=exec('sh','-c','find /var/log/apache2 -type f -size +0c -print');assert.equal(logs,'','No synthetic request logs persisted');
 fs.writeFileSync(dir+'/apache-native.json',JSON.stringify({date:new Date().toISOString(),imageId:stage.imageId,passed:true,fictionalFeedPersistence:true,nativeOpmlExport:true,actualApachePhpLoginPage:true,existingPrivacyStartup:true,network:'none',productionChanged:false,limitations:'Synthetic native storage/export and HTTP login page; not production email, remote feed retrieval or a browser login session.'},null,2)+'\n');
 console.log('FreshRSS Apache/PHP response, fictional feed storage and OPML export passed.');
}catch(e){fs.writeFileSync(dir+'/apache-native-error.log',String(e.stdout||'')+String(e.stderr||'')+String(e));throw Error('Apache native gate failed; private diagnostic retained');}
finally{if(created)docker('rm','-f','-v',name);}
