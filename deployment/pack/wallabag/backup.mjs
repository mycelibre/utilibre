// The existing pack backup schedule calls this optional native SQLite backup.
import {execFileSync,spawn} from 'node:child_process';
import {readFile,mkdir,writeFile,statfs} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {once} from 'node:events';
process.umask(0o077);
export async function backupWallabag(target) {
  if(!/^\/opt\/utilibre\/(?:pack-backups|wallabag-backups)\/[\dTZ.-]+\/wallabag\.sqlite\.cms$/.test(target))throw Error('Unexpected private snapshot path');
  const php=(await readFile(new URL('./snapshot.php',import.meta.url),'utf8')).replace(/^<\?php/,'');
  const source=spawn('docker',['exec','utilibre-wallabag-app-1','php','-r',php],{stdio:['ignore','pipe','ignore']});
  const sink=spawn('openssl',['cms','-encrypt','-aes-256-gcm','-binary','-outform','DER','-out',target,'/opt/utilibre/pack-backup-key/certificate.pem'],{stdio:['pipe','ignore','ignore']});
  const a=once(source,'exit'),b=once(sink,'exit');
  await pipeline(source.stdout,sink.stdin);
  const results=await Promise.all([a,b]);
  if(results.some(([code])=>code!==0))throw Error('Wallabag snapshot failed; incomplete generation retained privately');
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const root='/opt/utilibre/wallabag-backups';await mkdir(root,{recursive:true,mode:0o700});
  const disk=await statfs(root);if(disk.bavail*disk.bsize<5*1024**3)throw Error('Less than 5 GiB free; refusing new snapshot');
  const dir=`${root}/${new Date().toISOString().replace(/[:.]/g,'-')}`;
  await mkdir(dir,{mode:0o700});await backupWallabag(dir+'/wallabag.sqlite.cms');
  await writeFile(dir+'/SHA256SUMS',execFileSync('sha256sum',['wallabag.sqlite.cms'],{cwd:dir}),{mode:0o600,flag:'wx'});
  await writeFile(dir+'/COMPLETE','Encrypted local SQLite snapshot; restore verification separate.\n',{mode:0o600,flag:'wx'});
  console.log(dir);
}
