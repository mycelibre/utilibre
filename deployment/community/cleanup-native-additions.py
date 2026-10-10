"""Remove the exact disposable identities created by public OIDC smoke tests."""
from pathlib import Path
import requests,sqlite3,json,re,subprocess
report=Path('/opt/utilibre/reports/new-services-20261009')
# Opengist: native self-service deletion with current synthetic cookie and CSRF.
state=json.loads((report/'opengist-browser-state.json').read_text());s=requests.Session();s.headers['Host']='snippets.utilibre.org'
for c in state['cookies']:
 if c['domain']=='snippets.utilibre.org':s.cookies.set(c['name'],c['value'])
db=sqlite3.connect('file:/opt/utilibre/community-data/opengist/opengist.db?mode=ro',uri=True);row=db.execute('select id,is_admin from users where username=?',('opengist-oidc-check',)).fetchone();assert row and row[1]==0;assert db.execute('select count(*) from gists where user_id=?',(row[0],)).fetchone()[0]==0;db.close()
r=s.get('http://10.10.1.43:3191/-/settings');assert r.status_code==200;csrf=re.search(r'name="_csrf" value="([^"]+)"',r.text).group(1);r=s.delete('http://10.10.1.43:3191/-/settings/account',headers={'X-CSRF-Token':csrf},allow_redirects=False);assert r.status_code==302
# linkding: native admin ORM deletion, verified fictional identifier and no real bookmarks.
code="from django.contrib.auth.models import User; from bookmarks.models import Bookmark; u=User.objects.get(username='utilibre-check-a',email='utilibre-check-a@utilibre.org'); assert not u.is_superuser; assert not Bookmark.objects.filter(owner=u).exists(); u.delete(); print('Synthetic linkding identity removed.')"
subprocess.run(['docker','exec','utilibre-linkding-linkding-1','python','manage.py','shell','-c',code],check=True,stdout=subprocess.DEVNULL)
# Vikunja: native operator CLI, exact synthetic username/email.
db=sqlite3.connect('file:/opt/utilibre/community-data/vikunja/vikunja.db?mode=ro',uri=True);row=db.execute('select id from users where username=? and email=?',('utilibre-check-a','utilibre-check-a@utilibre.org')).fetchone();assert row;db.close()
subprocess.run(['docker','exec','utilibre-vikunja-vikunja-1','/app/vikunja/vikunja','user','delete',str(row[0]),'--now','--confirm'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
# ByteStash: invoke its native administration repository only for the QA identity.
code="import {initializeDatabase,getDb,shutdownDatabase} from './src/config/database.js';import adminRepository from './src/repositories/adminRepository.js';initializeDatabase();const db=getDb();const u=db.prepare('SELECT id,email FROM users WHERE username=?').get('utilibrechecka');if(!u||u.email!=='utilibre-check-a@utilibre.org')throw Error('Not the synthetic identity');const snippets=db.prepare('SELECT title FROM snippets WHERE user_id=?').all(u.id);if(snippets.length!==2||snippets.some(s=>s.title!=='Fictional revised snippet'))throw Error('Unexpected fixtures');await adminRepository.deleteUser(u.id);if(db.prepare('SELECT id FROM users WHERE id=?').get(u.id))throw Error('Deletion failed');shutdownDatabase();"
with (report/'bytestash-cleanup.log').open('w') as log:subprocess.run(['docker','exec','-i','utilibre-bytestash-bytestash-1','node','--input-type=module'],input=code,text=True,check=True,stdout=log,stderr=log)
(report/'native-public-cleanup.json').write_text(json.dumps({'opengist':True,'linkding':True,'vikunja':True,'bytestash':True,'onlyVerifiedSyntheticIdentities':True},indent=2));print('All four native public-test identities and fictional ByteStash copies removed.')
