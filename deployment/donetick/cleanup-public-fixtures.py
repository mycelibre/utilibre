#!/usr/bin/env python3
"""Remove only native deletion's empty circles from this exact fictional lifecycle."""
import json,pathlib,sqlite3,requests
out=pathlib.Path('/opt/utilibre/reports/donetick-public-20261009');ids=json.loads((out/'cleanup-identifiers.json').read_text());assert len(ids)==2
with sqlite3.connect('/opt/utilibre/donetick/data/donetick.db') as db:
 db.execute('BEGIN IMMEDIATE')
 tables=[r[0]for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
 for r in ids:
  assert r['username'] in ['utilibre-donetick-public-20261009-a','utilibre-donetick-public-20261009-b']
  assert db.execute('SELECT COUNT(*) FROM users WHERE id=? OR username=?',(r['id'],r['username'])).fetchone()[0]==0
  circle=db.execute('SELECT name FROM circles WHERE id=?',(r['circleID'],)).fetchone()
  assert circle==("Fictional public chore tester "+r['username'][-1]+"'s circle",)
  for table in tables:
   assert table.replace('_','').isalnum()
   fields={v[1]for v in db.execute('PRAGMA table_info("'+table+'")')}
   if table=='sync_cursors':
    assert fields=={'id','circle_id','entity_type','max_version'}
    continue
   if 'circle_id' in fields:assert db.execute('SELECT COUNT(*) FROM "'+table+'" WHERE circle_id=?',(r['circleID'],)).fetchone()[0]==0,table
  db.execute('DELETE FROM sync_cursors WHERE circle_id=?',(r['circleID'],))
  db.execute('DELETE FROM circles WHERE id=? AND name=?',(r['circleID'],circle[0]))
 db.commit()
d=json.loads((out/'native-data-private.json').read_text());r=requests.get('https://chores.utilibre.org/api/v1/assets/'+d['attachment']['sign'],timeout=15);assert r.status_code==404
(out/'fixture-cleanup.json').write_text(json.dumps({'nativeAccountsDeleted':2,'emptyFictionalCirclesRemoved':2,'fictionalCircleSyncCountersRemoved':True,'onlyExactRecordedIdentifiers':True,'oldSignedAttachmentNow404':True},indent=2));print('Only the two proven-empty fictional circle rows removed; deleted attachment returns404.')
