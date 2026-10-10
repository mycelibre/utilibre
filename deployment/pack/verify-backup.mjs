// Isolated restore rehearsal. No production table or live file is overwritten.
import {execFileSync} from 'node:child_process';
import {mkdtemp, mkdir, readFile, rm, access} from 'node:fs/promises';
import {pbkdf2Sync, timingSafeEqual} from 'node:crypto';
import assert from 'node:assert/strict';
process.umask(0o077);
const snapshot=process.argv[2];
if(!/^\/opt\/utilibre\/pack-backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(snapshot||''))throw Error('Pass one exact completed pack snapshot directory.');
await access(`${snapshot}/COMPLETE`);
const checks=await readFile(`${snapshot}/SHA256SUMS`,'utf8');
assert.ok([4,5].includes(checks.trim().split('\n').length));
assert.ok(checks.trim().split('\n').every(row=>/^[a-f0-9]{64}  (?:forms.dump|forms-files.tar.gz|cryptpad.tar.gz|private-config.tar.gz|wallabag.sqlite)\.cms$/.test(row)));
execFileSync('sha256sum',['-c','SHA256SUMS'],{cwd:snapshot,stdio:'ignore'});
const temp=await mkdtemp('/opt/utilibre/pack-restore-');
const db=`pack_restore_${Date.now()}`;
const command=(args,options={})=>execFileSync('docker',['exec',...args],{stdio:['pipe','pipe','pipe'],...options});
let created=false;
try {
  for(const name of ['forms.dump','forms-files.tar.gz','cryptpad.tar.gz','private-config.tar.gz']) {
    execFileSync('openssl',['cms','-decrypt','-binary','-inform','DER','-in',`${snapshot}/${name}.cms`,'-inkey','/opt/utilibre/pack-backup-key/private.pem','-out',`${temp}/${name}`],{stdio:'ignore'});
    if(name.endsWith('.tar.gz')) {
      const entries=execFileSync('tar',['-tzf',`${temp}/${name}`],{encoding:'utf8'}).trim().split('\n');
      assert.ok(entries.every(p=>!p.startsWith('/')&&!p.split('/').includes('..')));
      assert.ok(entries.length>0);
    }
  }
  if(await existsWallabag()) {
    execFileSync('openssl',['cms','-decrypt','-binary','-inform','DER','-in',`${snapshot}/wallabag.sqlite.cms`,'-inkey','/opt/utilibre/pack-backup-key/private.pem','-out',`${temp}/wallabag.sqlite`],{stdio:'ignore'});
    execFileSync('docker',['run','--rm','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--log-driver=none','--user=0:0','--memory=96m','--cpus=0.5','-v',`${temp}/wallabag.sqlite:/restore.sqlite:ro`,'--entrypoint=php','sha256:377062036d58e98a69df2de531499219703a7b0129d51077cbd56e4a42040c7a','-r','$d=new PDO("sqlite:/restore.sqlite");if($d->query("PRAGMA integrity_check")->fetchColumn()!=="ok")exit(1);if($d->query("SELECT count(*) FROM wallabag_user")->fetchColumn()<1)exit(2);'],{stdio:'ignore'});
    console.log('Encrypted Wallabag snapshot authenticated and restored SQLite integrity/account table passed; browser/MFA recovery is a separate dated check.');
  }
  command(['utilibre-pack-forms-db-1','createdb','-U','forms',db]);created=true;
  command(['-i','utilibre-pack-forms-db-1','pg_restore','-U','forms','-d',db,'--no-owner','--exit-on-error'],{input:await readFile(`${temp}/forms.dump`)});
  const owner=await readFile('/opt/utilibre/pack-secrets/liberaforms-owner.json','utf8');
  const code=`import json,sys
from wsgi import app
from bs4 import BeautifulSoup
from liberaforms.models.form import Form
from liberaforms.models.answer import Answer
owner=json.loads(sys.stdin.readline())
with app.test_client() as c:
 r=c.get('/user/login',base_url='https://forms.utilibre.org')
 csrf=BeautifulSoup(r.data,'html.parser').find('input',{'name':'csrf_token'})['value']
 r=c.post('/user/login',base_url='https://forms.utilibre.org',data={'username':owner['username'],'password':owner['password'],'csrf_token':csrf},headers={'Referer':'https://forms.utilibre.org/user/login'})
 assert r.status_code==302
 r=c.get('/form/1/answers',base_url='https://forms.utilibre.org')
 assert r.status_code==200
 with app.app_context():
  f=Form.find(id=1)
  a=Answer.find(id=1,form_id=1)
  assert f and f.is_e2ee and a
  assert 'FICTIONAL_PACK_CHECK' not in json.dumps(a.data)
print('Restored native login, authorized form access and encrypted synthetic answer passed.')
`;
  const result=command(['-i','-e',`DB_NAME=${db}`,'utilibre-pack-forms-app-1','python','-c',code],{input:owner+'\n',encoding:'utf8'});
  console.log(result.trim());
  // Extract to the private rehearsal directory, never over the live datastore.
  execFileSync('tar',['-xzf',`${temp}/cryptpad.tar.gz`,'-C',temp,'--no-same-owner'],{stdio:'ignore'});
  for(const path of ['blob','block','data','datastore'])await access(`${temp}/${path}`);
  console.log('All encrypted archives authenticated; CryptPad state extracted. Browser recovery of this copy is a separate gate.');
  await mkdir(`${temp}/config`,{mode:0o700});
  execFileSync('tar',['-xzf',`${temp}/private-config.tar.gz`,'-C',`${temp}/config`,'--no-same-owner'],{stdio:'ignore'});
  // Older snapshots predate root-config inclusion; newly created snapshots also
  // preserve portal configuration and stable signing keys inside encryption.
  if(await access(`${temp}/config/.env`).then(()=>true,()=>false)) {
    for(const file of ['compose.yaml','config','secrets'])await access(`${temp}/config/${file}`);
    console.log('Encrypted root configuration and secret directories restored; no values printed.');
  }
  const restoredOwner=JSON.parse(await readFile(`${temp}/config/pack-secrets/galene-owner.json`,'utf8'));
  const room=JSON.parse(await readFile(`${temp}/config/pack-data/galene/groups/community.json`,'utf8'));
  const password=room.users[restoredOwner.username].password;
  assert.equal(password.type,'pbkdf2');assert.equal(password.hash,'sha-256');
  assert(timingSafeEqual(pbkdf2Sync(restoredOwner.password,Buffer.from(password.salt,'hex'),password.iterations,32,'sha256'),Buffer.from(password.key,'hex')));
  assert.equal(room['max-clients'],4);assert.equal(room['allow-recording'],false);
  const turn=`${temp}/config/pack-data/galene-turn`;
  if(await access(`${turn}/settings.json`).then(()=>true,()=>false)) {
    const secret=(await readFile(`${temp}/config/pack-secrets/galene-turn-secret`,'utf8')).trim();
    assert.match(secret,/^[a-f0-9]{64}$/);
    const config=await readFile(`${turn}/turnserver.conf`,'utf8');
    assert(config.includes(`static-auth-secret=${secret}\n`));
    const ice=JSON.parse(await readFile(`${temp}/config/pack-data/galene/data/ice-servers.json`,'utf8'));
    assert(ice.some(server=>server.credential===secret));
    const cert=`${turn}/certs/fullchain.pem`,key=`${turn}/certs/privkey.pem`;
    execFileSync('openssl',['x509','-in',cert,'-checkhost','turn.utilibre.org','-noout'],{stdio:'ignore'});
    const certPublic=execFileSync('openssl',['x509','-in',cert,'-pubkey','-noout']);
    const keyPublic=execFileSync('openssl',['pkey','-in',key,'-pubout']);
    assert(certPublic.equals(keyPublic));
    await access(`${temp}/config/etc/letsencrypt/renewal/turn.utilibre.org.conf`);
    console.log('Restored Galene moderator verifier, room limits, TURN shared identity, TLS key pair and renewal configuration passed.');
  }
} finally {
  if(created)command(['utilibre-pack-forms-db-1','dropdb','-U','forms',db]);
  if(!/^\/opt\/utilibre\/pack-restore-[A-Za-z0-9]+$/.test(temp))throw Error('Unexpected rehearsal directory; refusing cleanup.');
  await rm(temp,{recursive:true});
}
async function existsWallabag(){return access(`${snapshot}/wallabag.sqlite.cms`).then(()=>true,()=>false);}
