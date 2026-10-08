// Native authorization check using two independent sessions and a disposable
// synthetic account. Does not change registration policy or send invitations.
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const code=`import json,sys,secrets,time
from wsgi import app
from bs4 import BeautifulSoup
from liberaforms.models.user import User
owner=json.loads(sys.stdin.readline())
name='pack_isolation_'+secrets.token_hex(6)
password=secrets.token_urlsafe(24)
with app.test_request_context():
 u=User(username=name,email=name+'@example.invalid',password=password,validated_email=True,role='editor')
 u.save()
try:
 for who,expected in [(owner,200),({'username':name,'password':password},302)]:
  with app.test_client() as c:
    time.sleep(1.1)
    r=c.get('/user/login',base_url='https://forms.utilibre.org')
    assert r.status_code==200, ('login GET',r.status_code)
    csrf=BeautifulSoup(r.data,'html.parser').find('input',{'name':'csrf_token'})['value']
    r=c.post('/user/login',base_url='https://forms.utilibre.org',data={**who,'csrf_token':csrf},headers={'Referer':'https://forms.utilibre.org/user/login'})
    assert r.status_code==302
    with c.session_transaction() as session:
     assert session.get('_user_id')
    r=c.get('/form/1/answers',base_url='https://forms.utilibre.org')
    assert r.status_code==expected, (expected,r.status_code,r.headers.get('Location'))
    if expected==302:
     assert r.headers.get('Location')=='/forms'
     assert b'FICTIONAL_PACK_CHECK' not in r.data
 print('Owner answer access: 200. Independent authenticated editor denied and redirected to /forms. No policy changes.')
finally:
 with app.test_request_context():
  u=User.find(username=name)
  assert u.username==name and not list(u.authored_forms)
  u.delete()
  print('Disposable synthetic account removed; existing accounts/data unchanged.')
`;
console.log(execFileSync('docker',['exec','-i','utilibre-pack-forms-app-1','python','-c',code],{input:await readFile('/opt/utilibre/pack-secrets/liberaforms-owner.json','utf8'),encoding:'utf8'}).trim());
