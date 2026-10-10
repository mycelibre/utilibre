"""Retire only the exact disposable native Vikunja QA identity and its fixtures."""
from pathlib import Path
import json,sqlite3,subprocess
root=Path('/opt/utilibre/reports/new-services-20261009');fixture=json.loads((root/'vikunja-fixture.json').read_text());uid=fixture['userId']
db=sqlite3.connect('file:/opt/utilibre/community-data/vikunja/vikunja.db?mode=ro',uri=True)
row=db.execute('SELECT username,email FROM users WHERE id=?',(uid,)).fetchone();assert row==('utilibre-check-a','utilibre-check-a@utilibre.org'),row
db.close()
r=subprocess.run(['docker','exec','utilibre-vikunja-vikunja-1','/app/vikunja/vikunja','user','delete',str(uid),'--now','--confirm'],capture_output=True,text=True)
(root/'vikunja-cleanup.log').write_text(r.stdout+r.stderr);assert r.returncode==0
db=sqlite3.connect('file:/opt/utilibre/community-data/vikunja/vikunja.db?mode=ro',uri=True);assert db.execute('SELECT COUNT(*) FROM users WHERE id=?',(uid,)).fetchone()[0]==0;db.close()
(root/'vikunja-cleanup.json').write_text(json.dumps({'nativeUserDeletion':True,'syntheticUserId':uid,'realUsersTouched':False}));print('Native deletion removed only the verified fictional Vikunja identity.')
