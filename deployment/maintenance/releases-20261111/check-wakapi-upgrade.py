"""Reuse the native account fixture against a synthetic old-to-new SQLite store.

No production content, account, credentials, relay, email or external network.
The preserved old database is a restore input, not an automatic live rollback.
"""
import hashlib
import json
import os
from pathlib import Path
import secrets
import sqlite3
import subprocess
import tempfile

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance/upgrade-closure-20261111/wakapi')
OLD = 'sha256:b3d3d5ebf2416f31617a1163873f0c392e7a8ca1dc2a3e46a78f0b2e3b1457dc'
NEW = json.loads((ROOT/'image.json').read_text())['imageId']
fixture = Path(__file__).resolve().parent.parent/'go-leaf-final/check-wakapi.py'
assert hashlib.sha256(fixture.read_bytes()).hexdigest() == 'd7694bd2e6693454f52e7f82825061fbb41b2a9f2cff21cc4d8adc8df17e15b9'
directory = Path(tempfile.mkdtemp(prefix='migration-', dir=ROOT))
data = directory/'data'; data.mkdir(); os.chown(data, 65532, 65532)
env = {**os.environ, 'UTILIBRE_FIXTURE_PASSWORD': secrets.token_urlsafe(30), 'UTILIBRE_FIXTURE_SALT': secrets.token_hex(24)}
def replace(text, before, after):
    assert text.count(before) == 1, before
    return text.replace(before, after)
def run(image, phase):
    script = fixture.read_text()
    script = replace(script, "IMAGE = 'utilibre-wakapi:2.18.1-healthcheck-security-20261011'", 'IMAGE = '+repr(image))
    script = replace(script, "NAME = 'maintenance-wakapi-native'", "NAME = 'maintenance-wakapi-2182-native'")
    script = replace(script, "OUT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output/wakapi-native.json')", 'OUT = Path('+repr(str(directory/(phase+'.json')))+')')
    script = replace(script, "'/tmp/fictional.db'", "'/data/fictional.db'")
    script = replace(script, "'--pids-limit','128']", "'--pids-limit','128','-v',"+repr(str(data)+':/data')+"]")
    script = replace(script, 'secrets.token_hex(24)', "os.environ['UTILIBRE_FIXTURE_SALT']")
    script = replace(script, 'secrets.token_urlsafe(30)', "os.environ['UTILIBRE_FIXTURE_PASSWORD']")
    if phase != 'old':
        start = script.index("    response=session.post(BASE+'/signup'")
        end = script.index("    response=session.post(BASE+'/login'", start)
        script = script[:start] + '    # Existing synthetic account must survive the native migration.\n' + script[end:]
    path = directory/(phase+'.py'); path.write_text(script)
    with (directory/(phase+'.log')).open('xb') as log:
        subprocess.run(['python3',str(path)],env=env,check=True,stdout=log,stderr=log,timeout=150)
    result = json.loads((directory/(phase+'.json')).read_text())
    assert result['passed'] and result['imageId'] == image
    return result
old = run(OLD, 'old')
db = data/'fictional.db'
with sqlite3.connect(db) as connection:
    before = connection.execute('SELECT entity, project, user_id FROM heartbeats ORDER BY id').fetchall()
    assert before and all(row[0] == 'fictional.py' for row in before)
    with sqlite3.connect(directory/'before.sqlite') as backup: connection.backup(backup)
new = run(NEW, 'new')
again = run(NEW, 'reopen')
rollback = run(OLD, 'old-after-migration')
forward = run(NEW, 'forward-again')
with sqlite3.connect(db) as connection:
    assert connection.execute('PRAGMA integrity_check').fetchone() == ('ok',)
    after = connection.execute('SELECT entity, project, user_id FROM heartbeats ORDER BY id').fetchall()
    assert after[:len(before)] == before and len(after) == len(before)+4
    indexes = [r[1] for r in connection.execute('PRAGMA index_list(heartbeats)')]
    assert 'idx_user_project_time' in indexes
with sqlite3.connect(directory/'before.sqlite') as backup:
    assert backup.execute('PRAGMA integrity_check').fetchone() == ('ok',)
    assert backup.execute('SELECT entity, project, user_id FROM heartbeats ORDER BY id').fetchall() == before
report = {'passed':True,'oldImage':OLD,'imageId':NEW,'syntheticOldAccountMigration':True,'heartbeatPreserved':True,'nativeIndexMigration':True,'reloadPersistence':True,'syntheticBackupReadable':True,'previousBinaryReadsMigratedStore':True,'nativeAccountAndHealthChecks':5,'network':'none','productionChanged':False,'evidence':str(directory),'limitation':'Production OIDC provider and real account contents were not exercised.'}
(ROOT/'migration.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
