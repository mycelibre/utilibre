#!/usr/bin/env python3
"""Read-only native SQLite snapshot; no credentials or row values in stdout."""
import hashlib, json, os, pathlib, sqlite3, sys
os.umask(0o077)
root=pathlib.Path('/var/lib/utilibre-maintenance/security-20261110/kuma-without-apprise')
assert sys.argv[1:] in [['before'],['after'],['inspect']]
mode=sys.argv[1]
db=sqlite3.connect('file:/opt/utilibre/community-data/kuma/kuma.db?mode=ro',uri=True)
assert db.execute('pragma quick_check').fetchone()[0]=='ok'
configs=[json.loads(r[0]) for r in db.execute('select config from notification')]
assert all(c.get('type')!='apprise' for c in configs), 'Configured Apprise provider requires a separate migration'
if mode=='before':
    backup=root/'operator-state-before.sqlite'
    assert not backup.exists(), 'Never overwrite the original recovery snapshot'
    with sqlite3.connect(backup) as saved: db.backup(saved)
result={'integrity':'ok','appriseChannels':0,'tables':{}}
for table in ['user','notification','monitor','monitor_notification','tag','monitor_tag','group','monitor_group','status_page','status_page_cname']:
    columns=[r[1] for r in db.execute('pragma table_info("'+table+'")') if r[1]!='dns_last_result']
    rows=db.execute('select '+','.join('"'+c+'"' for c in columns)+' from "'+table+'"').fetchall()
    serialized=sorted(json.dumps(r,ensure_ascii=True,separators=(',',':')) for r in rows)
    result['tables'][table]={'rows':len(rows),'sha256':hashlib.sha256(json.dumps(serialized).encode()).hexdigest()}
if mode!='inspect': (root/('state-'+mode+'.json')).write_text(json.dumps(result,indent=2)+'\n')
if mode=='after': assert result==json.loads((root/'state-before.json').read_text()), 'Saved account/monitor/status-page state changed'
print(json.dumps(result))
