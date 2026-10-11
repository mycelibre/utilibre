// Same-engine rehearsal using only generated accounts and disposable databases.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,statfs} from 'node:fs/promises';
process.umask(0o077);
const base='mariadb:12.2@sha256:6a4c4bbf0447c2247801309513fcc0dd17c3f35390368139ce419387fdd1144d';
const image='utilibre-mariadb:12.2.2-openssl-security-20261011';
const directory='/var/lib/utilibre-maintenance/vendor-final-20261011';
await mkdir(directory,{recursive:true,mode:0o700});
const space=await statfs(directory);assert(space.bavail*space.bsize>=8*1024**3,'8 GiB recovery floor');
const names=['maintenance-mariadb-vendor-source','maintenance-mariadb-vendor-restore'];
const password=randomBytes(24).toString('hex');
function docker(args,input){return execFileSync('docker',args,{input,encoding:'utf8',timeout:90000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe']});}
const inspect=image=>JSON.parse(docker(['image','inspect',image]))[0];
const before=inspect(base),after=inspect(image);
for(const key of ['User','Env','Cmd','Entrypoint','WorkingDir','ExposedPorts','Volumes','Healthcheck'])assert.deepEqual(after.Config[key],before.Config[key],'Native configuration drift: '+key);
const engineHash=image=>docker(['run','--rm','--network','none','--read-only','--user','root','--memory','128m','--cpus','.5','--pids-limit','64','--log-driver','none','--entrypoint','bash',image,'-o','pipefail','-c',"{ dpkg-query -L mariadb-server mariadb-server-core mariadb-client mariadb-client-core; find /usr/local/bin -type f; } | sort -u | while IFS= read -r p; do if test -f \"$p\"; then sha256sum \"$p\"; fi; done | sha256sum"]).trim().split(/\s/)[0];
const hash=engineHash(base);assert.match(hash,/^[a-f0-9]{64}$/);assert.equal(engineHash(image),hash,'Engine/entrypoint changed');
const sql=(name,query,user='root')=>docker(['exec','-i','-e','MYSQL_PWD='+password,name,'mariadb','--protocol=TCP','--host=127.0.0.1','--user='+user,'--batch','--skip-column-names','--default-character-set=utf8mb4'],query);
const report={checkedAt:new Date().toISOString(),status:'running',deployed:false,image,imageId:after.Id,baseId:before.Id,engineSha256:hash,addedBytes:after.Size-before.Size,nativeConfigurationUnchanged:true};
try{
 for(const name of names){
  docker(['run','-d','--name',name,'--network','none','--cpus','.75','--memory','512m','--pids-limit','96','--security-opt','no-new-privileges:true','--log-driver','none','--tmpfs','/var/lib/mysql:rw,size=320m','--tmpfs','/run/mysqld:rw,size=8m','--tmpfs','/tmp:rw,size=16m','-e','MARIADB_ROOT_PASSWORD='+password,image,'mariadbd','--bind-address=127.0.0.1','--innodb-buffer-pool-size=32M','--max-connections=10','--general-log=0','--slow-query-log=0']);
  let ready=false;for(let i=0;i<90;i++){try{if(sql(name,'SELECT 1;').trim()==='1'){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}assert(ready,'Native isolated initialization');
  assert.equal(sql(name,'SELECT VERSION();').trim(),'12.2.2-MariaDB-ubu2404');
 }
 sql(names[0],`CREATE DATABASE fictional CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
 CREATE TABLE fictional.samples(id INT PRIMARY KEY,label VARCHAR(120) NOT NULL,n DECIMAL(8,2),doc JSON);
 INSERT INTO fictional.samples VALUES(1,'Ficción — prueba',12.34,'{"safe":true}');
 CREATE USER 'fictional'@'127.0.0.1' IDENTIFIED BY '${password}';
 GRANT SELECT,INSERT,UPDATE ON fictional.* TO 'fictional'@'127.0.0.1';`);
 assert.equal(sql(names[0],"SELECT CONCAT(label,'|',n,'|',JSON_VALUE(doc,'$.safe')) FROM fictional.samples;",'fictional').trim(),'Ficción — prueba|12.34|1');
 sql(names[0],"START TRANSACTION; UPDATE fictional.samples SET n=99 WHERE id=1; ROLLBACK;",'fictional');
 assert.equal(sql(names[0],'SELECT n FROM fictional.samples;','fictional').trim(),'12.34');
 assert.throws(()=>sql(names[0],'SELECT User FROM mysql.user;','fictional'),'Least-privilege account must be denied system users');
 const tls=sql(names[0],"SHOW SESSION STATUS LIKE 'Ssl_cipher';",'fictional').trim().split(/\s+/).slice(1).join(' ');assert(tls,'Native authenticated TCP session must use TLS');
 const dump=docker(['exec','-e','MYSQL_PWD='+password,names[0],'mariadb-dump','--user=root','--protocol=TCP','--host=127.0.0.1','--single-transaction','--databases','fictional']);
 assert(dump.length>100&&dump.length<1024**2);sql(names[1],dump);
 assert.equal(sql(names[1],"SELECT CONCAT(label,'|',n,'|',JSON_VALUE(doc,'$.safe')) FROM fictional.samples;").trim(),'Ficción — prueba|12.34|1');
 Object.assign(report,{status:'passed',engineVersion:'12.2.2-MariaDB-ubu2404',nativeAuthenticatedWriteRead:true,transactionRollback:true,leastPrivilegeDenied:true,tlsCipher:tls,syntheticDumpBytes:Buffer.byteLength(dump),syntheticDumpSha256:createHash('sha256').update(dump).digest('hex'),secondInstanceRestore:true,limits:'Two fresh network-none databases; no production mounts, data or mail. Not an Addy end-to-end mail/alias test or production-data restore.'});
}catch(error){await writeFile(directory+'/mariadb-error.txt',String(error.stderr||error.message),{mode:0o600});throw Error('Isolated MariaDB gate failed; private diagnostic '+directory+'/mariadb-error.txt');}
finally{for(const name of names)try{docker(['rm','-f','-v',name]);}catch{} }
report.cleanedUp=true;await writeFile(directory+'/mariadb.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
