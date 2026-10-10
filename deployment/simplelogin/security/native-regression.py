"""Networkless fictional-data check; run only against the disposable security DB."""
import csv, io, json, os, re, secrets, smtplib, subprocess, time, urllib.request
assert os.environ['DB_URI'].startswith('postgresql+psycopg2://postgres@127.0.0.1:5432/simplelogin')
assert os.environ['URL'] == 'https://simplelogin.example.invalid'
from server import create_app
from app.models import User, Alias, CustomDomain, File, BatchImport, DomainDeletedAlias
from app.db import Session
from app.import_utils import import_from_csv
from app.alias_delete import perform_alias_deletion
app = create_app()
app.config['TESTING'] = True
assert User.query().count() == 0
password = secrets.token_urlsafe(30)
user = User.create(email='curator@example.org', name='Fictional museum curator', password=password, activated=True, notification=False)
Session.commit()
uid=user.id
CustomDomain.create(user_id=uid,domain='museum.example.org',ownership_verified=True,verified=True,commit=True)
file=File.create(path='/fictional-security-csv',commit=True)
batch=BatchImport.create(user_id=uid,file_id=file.id,commit=True)
import_from_csv(batch,user,['alias,note,mailboxes','exhibition@museum.example.org,Fictional exhibition,curator@example.org'])
Session.commit()
alias=Alias.get_by(email='exhibition@museum.example.org')
assert alias and alias.user_id == uid and alias.note == 'Fictional exhibition'
client=app.test_client()
# Native OAuth CORS permits bearer-token clients, not cookie credentials.
origin = 'https://client.example.invalid'
r = client.options('/oauth/userinfo', base_url=os.environ['URL'], headers={'Origin': origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Authorization'})
assert r.status_code == 200 and r.headers.get('Access-Control-Allow-Origin') == origin
assert r.headers.get('Access-Control-Allow-Credentials') != 'true'
r = client.get('/oauth/userinfo', base_url=os.environ['URL'], headers={'Origin': origin, 'Authorization': 'Bearer fictional-invalid-token'})
assert r.status_code == 400 and r.json == {'error': 'Invalid access token'}
r = client.get('/auth/login', base_url=os.environ['URL'], headers={'Origin': origin})
assert 'Access-Control-Allow-Origin' not in r.headers
print(json.dumps({'native_oauth_cors_preflight': True, 'invalid_bearer_denied': True, 'no_cors_cookie_credentials': True, 'login_not_cross_origin': True}))
def token(path):
 r=client.get(path,base_url=os.environ['URL'])
 assert r.status_code == 200, (path,r.status_code)
 m=re.search(rb'name="csrf_token"[^>]*value="([^"]+)"',r.data)
 assert m, path
 return m.group(1).decode()
csrf=token('/auth/login')
r=client.post('/auth/login',base_url=os.environ['URL'],data={'email':'curator@example.org','password':password,'csrf_token':csrf})
assert r.status_code == 302,(r.status_code,r.data[:100])
csrf=token('/dashboard/enter_sudo')
r=client.post('/dashboard/enter_sudo',base_url=os.environ['URL'],data={'password':password,'csrf_token':csrf})
assert r.status_code == 302
r=client.get('/dashboard/alias_export',base_url=os.environ['URL'])
assert r.status_code == 200 and r.mimetype == 'text/csv', (r.status_code,r.data[:100])
rows=list(csv.DictReader(io.StringIO(r.data.decode())))
row=next(x for x in rows if x['alias']=='exhibition@museum.example.org')
assert row['note']=='Fictional exhibition' and row['mailboxes']=='curator@example.org'
import runpy
runpy.run_path('/verification/runtime-regression.py')['run']()
# Leave the fixture present for a separate native dump/restore check.
print(json.dumps({'native_password_login_csrf':True,'native_sudo_csrf':True,'native_import_function':True,'native_csv_export':True,'fixture_users':User.query().count(),'fixture_aliases':Alias.query().count()}))
processes=[]
try:
 processes.append(subprocess.Popen(['/code/.venv/bin/gunicorn','wsgi:app','-b','127.0.0.1:7777','-w','1','--timeout','30','--log-level','warning'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL))
 processes.append(subprocess.Popen(['/code/.venv/bin/python','email_handler.py','--port','20381'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL))
 deadline=time.monotonic()+90
 web=False;smtp=False
 while time.monotonic()<deadline:
  if not web:
   try:
    with urllib.request.urlopen('http://127.0.0.1:7777/auth/login',timeout=2) as r: web=r.status==200
   except Exception: pass
  if not smtp:
   try:
    with smtplib.SMTP('127.0.0.1',20381,timeout=2) as s:
     assert s.ehlo('fixture.example.invalid')[0]==250
     assert s.noop()[0]==250
     smtp=True
   except Exception: pass
  if web and smtp: break
  time.sleep(1)
 assert web and smtp,(web,smtp)
 print(json.dumps({'gunicorn_native_login_http':web,'native_smtp_ehlo_noop':smtp,'smtp_data_sent':False}))
finally:
 for p in processes: p.terminate()
 for p in processes:
  try: p.wait(timeout=10)
  except subprocess.TimeoutExpired: p.kill(); p.wait()
