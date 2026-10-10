import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {access,mkdtemp,mkdir,readFile,writeFile,chown,rm} from 'node:fs/promises';
process.umask(0o077);
const snapshot=process.argv[2];
assert.match(snapshot||'',/^\/opt\/utilibre\/(?:wallabag-backups|pack-backups)\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
await access(snapshot+'/COMPLETE');
execFileSync('sha256sum',['-c','SHA256SUMS'],{cwd:snapshot,stdio:'ignore'});
const temp=await mkdtemp('/opt/utilibre/wallabag-restore-');
try {
  await mkdir(temp+'/db',{mode:0o700});
  execFileSync('openssl',['cms','-decrypt','-binary','-inform','DER','-in',snapshot+'/wallabag.sqlite.cms','-inkey','/opt/utilibre/pack-backup-key/private.pem','-out',temp+'/db/wallabag.sqlite'],{stdio:'ignore'});
  for(const p of [temp,temp+'/db',temp+'/db/wallabag.sqlite'])await chown(p,4007,4007);
  const config=JSON.parse(execFileSync('docker',['inspect','utilibre-wallabag-app-1'],{encoding:'utf8'}))[0];
  const env=config.Config.Env.filter(e=>!e.startsWith('APP_SECRET='));
  assert(env.every(e=>/^[A-Za-z_][A-Za-z0-9_]*=/.test(e)&&!/[\r\n]/.test(e)));
  await writeFile(temp+'/runtime.env',env.join('\n')+'\n',{mode:0o600,flag:'wx'});
  const code=(await readFile(new URL('./check-restored.php',import.meta.url),'utf8')).replace(/^<\?php/,'');
  const result=execFileSync('docker',['run','--rm','-i','--network=none','--read-only','--user=4007:4007','--memory=384m','--cpus=0.75','--pids-limit=32','--cap-drop=ALL','--security-opt=no-new-privileges','--log-driver=none','--env-file=/opt/utilibre/pack-secrets/wallabag.env',`--env-file=${temp}/runtime.env`,'--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777','--tmpfs=/app/var:rw,nosuid,nodev,size=64m,uid=4007,gid=4007,mode=0700','-v',`${temp}:/app/data`,'--entrypoint=php',config.Image,'-r',code],{input:await readFile('/opt/utilibre/pack-secrets/wallabag-smoke.json'),encoding:'utf8'});
  console.log(result.trim());
} finally {
  assert.match(temp,/^\/opt\/utilibre\/wallabag-restore-[A-Za-z0-9]+$/);
  await rm(temp,{recursive:true});
}
