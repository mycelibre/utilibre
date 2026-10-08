// Native pg_dump/tar, encrypted by OpenSSL CMS AES-256-GCM. No content logging.
// The decryption key remains outside snapshots. These are LOCAL backups, not DR.
import {execFileSync, spawn} from 'node:child_process';
import {mkdir, access, writeFile, statfs} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {once} from 'node:events';
process.umask(0o077);
const root='/opt/utilibre/pack-backups', keyRoot='/opt/utilibre/pack-backup-key';
await mkdir(root,{recursive:true,mode:0o700});
await mkdir(keyRoot,{recursive:true,mode:0o700});
const key=`${keyRoot}/private.pem`, cert=`${keyRoot}/certificate.pem`;
const exists=async path=>access(path).then(()=>true,()=>false);
if(!await exists(key) && !await exists(cert)) {
  execFileSync('openssl',['req','-x509','-newkey','rsa:3072','-sha256','-nodes','-keyout',key,'-out',cert,'-subj','/CN=Utilibre local backup encryption','-days','3650'],{stdio:'ignore'});
}
if(!await exists(key)||!await exists(cert))throw Error('Backup key pair incomplete; do not regenerate it over existing backups.');
const disk=await statfs(root);if(disk.bavail*disk.bsize<5*1024**3)throw Error('Less than 5 GiB free; existing backups preserved.');
const target=`${root}/${new Date().toISOString().replace(/[:.]/g,'-')}`;
await mkdir(target,{mode:0o700});
async function encrypt(name,command,args){
  const source=spawn(command,args,{stdio:['ignore','pipe','ignore']});
  const sink=spawn('openssl',['cms','-encrypt','-aes-256-gcm','-binary','-outform','DER','-out',`${target}/${name}`,cert],{stdio:['pipe','ignore','ignore']});
  const sourceExit=once(source,'exit'), sinkExit=once(sink,'exit');
  await pipeline(source.stdout,sink.stdin);
  const [[a],[b]]=await Promise.all([sourceExit,sinkExit]);
  if(a!==0||b!==0)throw Error(`Backup failed: ${name}; incomplete generation retained for inspection.`);
}
await encrypt('forms.dump.cms','docker',['exec','utilibre-pack-forms-db-1','pg_dump','-U','forms','-d','forms','-Fc']);
await encrypt('forms-files.tar.gz.cms','tar',['-czf','-','-C','/opt/utilibre/pack-data/liberaforms','uploads']);
const pad='utilibre-pack-cryptpad-cryptpad-1';
execFileSync('docker',['pause',pad],{stdio:'ignore'});
try { await encrypt('cryptpad.tar.gz.cms','tar',['-czf','-','-C','/opt/utilibre/pack-data/cryptpad','blob','block','data','datastore']); }
finally { execFileSync('docker',['unpause',pad],{stdio:'ignore'}); }
await encrypt('private-config.tar.gz.cms','tar',['-czf','-','-C','/opt/utilibre','pack-secrets','pack-data/galene','-C','/home/ubuntu/freetools','deployment/pack']);
const names=['forms.dump.cms','forms-files.tar.gz.cms','cryptpad.tar.gz.cms','private-config.tar.gz.cms'];
await writeFile(`${target}/SHA256SUMS`,execFileSync('sha256sum',names,{cwd:target}),{mode:0o600,flag:'wx'});
await writeFile(`${target}/COMPLETE`,'Local encrypted snapshot; restore verification is separate.\n',{mode:0o600,flag:'wx'});
console.log(target);
