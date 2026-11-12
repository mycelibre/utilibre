// Native format-2 portability test. Synthetic local files and local SFTP subprocess;
// no network connection, Storage Box credentials or production snapshots.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
process.umask(0o077);
const candidate='/var/lib/utilibre-maintenance/host-tools-20261112/restic-candidate/restic';
const root=fs.mkdtempSync('/var/lib/utilibre-maintenance/host-tools-20261112/restic-portability-');
const password=path.join(root,'password');fs.writeFileSync(password,randomBytes(48).toString('hex'));
const input=path.join(root,'fictional');fs.mkdirSync(input);fs.mkdirSync(input+'/empty');
fs.writeFileSync(input+'/fictional-ñ.txt','Fictional backup: ficción ñ\n',{mode:0o640});
fs.chmodSync(input+'/fictional-ñ.txt',0o640);
fs.symlinkSync('fictional-ñ.txt',input+'/relative-link');
fs.mkdirSync(input+'/temporary');fs.writeFileSync(input+'/temporary/excluded.txt','not retained');
const env={PATH:'/usr/bin:/bin',HOME:root,GOMAXPROCS:'2'};
function run(binary,repo,...args){
 return cp.execFileSync(binary,['--no-cache','--password-file',password,'-r',repo,...args],{cwd:root,env,encoding:'utf8',timeout:90000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']});
}
function backup(binary,repo,extra=[]){
 const raw=run(binary,repo,...extra,'backup','fictional','--exclude','fictional/temporary','--json','--quiet');
 return raw.trim().split('\n').map(x=>JSON.parse(x)).find(x=>x.message_type==='summary').snapshot_id;
}
function restore(binary,repo,id,label,extra=[]){
 const dest=path.join(root,label);run(binary,repo,...extra,'restore',id,'--target',dest,'--verify','--quiet');
 const dir=path.join(dest,'fictional');
 assert.equal(fs.readFileSync(dir+'/fictional-ñ.txt','utf8'),fs.readFileSync(input+'/fictional-ñ.txt','utf8'));
 assert.equal(fs.statSync(dir+'/fictional-ñ.txt').mode&0o777,0o640);
 assert(fs.statSync(dir+'/empty').isDirectory());assert.equal(fs.readlinkSync(dir+'/relative-link'),'fictional-ñ.txt');
 assert(!fs.existsSync(dir+'/temporary'));
}
const old='/usr/bin/restic',repo=path.join(root,'repository');
run(old,repo,'init','--repository-version','2','--quiet');
const oldSnapshot=backup(old,repo);restore(candidate,repo,oldSnapshot,'new-reads-old');
fs.writeFileSync(input+'/second.txt','A second fictional snapshot\n');
const nextSnapshot=backup(candidate,repo);restore(old,repo,nextSnapshot,'old-reads-new');
run(candidate,repo,'check','--read-data');run(old,repo,'check','--read-data');
const sftp='sftp:local-fixture:'+path.join(root,'sftp-repository');
const localCommand=['-o','sftp.command=/usr/lib/openssh/sftp-server -e'];
run(candidate,sftp,...localCommand,'init','--repository-version','2','--quiet');
const transfer=backup(candidate,sftp,localCommand);restore(candidate,sftp,transfer,'sftp-restored',localCommand);
run(candidate,sftp,...localCommand,'check','--read-data');
const result={date:new Date().toISOString(),passed:true,binarySha256:createHash('sha256').update(fs.readFileSync(candidate)).digest('hex'),oldVersion:cp.execFileSync(old,['version'],{env,encoding:'utf8'}).trim(),newVersion:cp.execFileSync(candidate,['version'],{env,encoding:'utf8'}).trim(),checks:['new-restores-old','old-restores-new','both-read-complete-format-2-data','unicode-content','file-permissions','relative-symlink','empty-directory','temporary-content-excluded','local-openssh-sftp-backup-restore-check'],network:'disabled by caller; SFTP server is a local subprocess',remoteStorageBox:'not tested here'};
fs.writeFileSync(root+'/result.json',JSON.stringify(result,null,2)+'\n');
fs.writeFileSync('/var/lib/utilibre-maintenance/host-tools-20261112/restic-portability.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
