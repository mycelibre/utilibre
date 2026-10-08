// Isolated restore rehearsal. No production table or live file is overwritten.
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm, access} from 'node:fs/promises';
import assert from 'node:assert/strict';
process.umask(0o077);
const snapshot=process.argv[2];
if(!/^\/opt\/utilibre\/pack-backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(snapshot||''))throw Error('Pass one exact completed pack snapshot directory.');
await access(`${snapshot}/COMPLETE`);
const checks=await readFile(`${snapshot}/SHA256SUMS`,'utf8');
assert.equal(checks.trim().split('\n').length,4);
assert.ok(checks.trim().split('\n').every(row=>/^[a-f0-9]{64}  (?:forms.dump|forms-files.tar.gz|cryptpad.tar.gz|private-config.tar.gz)\.cms$/.test(row)));
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
} finally {
  if(created)command(['utilibre-pack-forms-db-1','dropdb','-U','forms',db]);
  if(!/^\/opt\/utilibre\/pack-restore-[A-Za-z0-9]+$/.test(temp))throw Error('Unexpected rehearsal directory; refusing cleanup.');
  await rm(temp,{recursive:true});
}
