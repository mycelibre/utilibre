// Reuses the completed MariaDB native transaction/permissions/TLS/restore fixture.
import fs from 'node:fs';import assert from 'node:assert/strict';import {randomBytes,createHash} from 'node:crypto';
import {root,read,run,inspect} from './ubuntu-common.mjs';
process.umask(0o077);
const dir=root+'/ubuntu-images/addy',stage=read(dir+'/stage.json');assert(!fs.existsSync(dir+'/application.json'));assert.equal(inspect(stage.candidate).Id,stage.image);
const docker=(args,input)=>run('docker',args,{input,encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe']});
const names=['maintenance-mount-mariadb-source','maintenance-mount-mariadb-restore'],password=randomBytes(24).toString('hex');
const sql=(name,query,user='root')=>docker(['exec','-i','-e','MYSQL_PWD='+password,name,'mariadb','--protocol=TCP','--host=127.0.0.1','--user='+user,'--batch','--skip-column-names','--default-character-set=utf8mb4'],query);
const report={date:new Date().toISOString(),imageId:stage.image,base:stage.base,passed:false};
try{
 for(const name of names){docker(['run','-d','--name',name,'--network','none','--cpus','.75','--memory','512m','--pids-limit','96','--security-opt','no-new-privileges:true','--log-driver','none','--tmpfs','/var/lib/mysql:rw,size=320m','--tmpfs','/run/mysqld:rw,size=8m','--tmpfs','/tmp:rw,size=16m','-e','MARIADB_ROOT_PASSWORD='+password,stage.image,'mariadbd','--bind-address=127.0.0.1','--innodb-buffer-pool-size=32M','--max-connections=10','--general-log=0','--slow-query-log=0']);let ready=false;for(let n=0;n<90;n++){try{if(sql(name,'SELECT 1;')==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);assert.equal(sql(name,'SELECT VERSION();'),'12.2.2-MariaDB-ubu2404');}
 sql(names[0],`CREATE DATABASE fictional CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE TABLE fictional.samples(id INT PRIMARY KEY,label VARCHAR(120) NOT NULL,n DECIMAL(8,2),doc JSON); INSERT INTO fictional.samples VALUES(1,'Ficción — prueba',12.34,'{"safe":true}'); CREATE USER 'fictional'@'127.0.0.1' IDENTIFIED BY '${password}'; GRANT SELECT,INSERT,UPDATE ON fictional.* TO 'fictional'@'127.0.0.1';`);
 const query="SELECT CONCAT(label,'|',n,'|',JSON_VALUE(doc,'$.safe')) FROM fictional.samples;",expected='Ficción — prueba|12.34|1';assert.equal(sql(names[0],query,'fictional'),expected);
 sql(names[0],'START TRANSACTION; UPDATE fictional.samples SET n=99 WHERE id=1; ROLLBACK;','fictional');assert.equal(sql(names[0],'SELECT n FROM fictional.samples;','fictional'),'12.34');
 let denied=false;try{sql(names[0],'SELECT User FROM mysql.user;','fictional');}catch(e){denied=/SELECT command denied|access denied/i.test(String(e.stderr));}assert(denied,'Exact native permission denial');
 const tls=sql(names[0],"SHOW SESSION STATUS LIKE 'Ssl_cipher';",'fictional').split(/\s+/).slice(1).join(' ');assert(tls);
 const dump=docker(['exec','-e','MYSQL_PWD='+password,names[0],'mariadb-dump','--user=root','--protocol=TCP','--host=127.0.0.1','--single-transaction','--databases','fictional']);assert(dump.length>100&&dump.length<1024**2);sql(names[1],dump);assert.equal(sql(names[1],query),expected);
 Object.assign(report,{passed:true,nativeAuthenticatedWriteRead:true,transactionRollback:true,leastPrivilegeDenied:true,tlsCipher:tls,syntheticDumpBytes:Buffer.byteLength(dump),syntheticDumpSha256:createHash('sha256').update(dump).digest('hex'),secondInstanceRestore:true});
}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stderr||e.stack));throw Error('Native DB gate failed; private diagnostics retained');}
finally{for(const name of names)try{docker(['rm','-f','-v',name]);}catch{}}
report.cleanedUp=true;report.limitations='Synthetic disconnected databases. No production-data restore, real email/alias operation or browser journey.';fs.writeFileSync(dir+'/application.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

