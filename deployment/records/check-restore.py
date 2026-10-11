#!/usr/bin/env python3
"""Restore a native snapshot into isolated scratch files and a disposable DB."""
import json,pathlib,sqlite3,subprocess,tarfile,tempfile,shutil
root=pathlib.Path('/opt/utilibre/records/backups')
snapshot=sorted(p for p in root.iterdir() if (p/'SHA256.json').is_file())[-1]
scratch=pathlib.Path(tempfile.mkdtemp(prefix='records-restore-',dir='/opt/utilibre'))
db='records_restore_check_20261011'
cmd=['docker','exec','-i','utilibre-records-db-1']
results=[];created=False
try:
    with tarfile.open(snapshot/'saved-work-and-config.tar.gz') as archive:
        archive.extractall(scratch,filter='data')
    for relative in ['data/candlr/candlr.db','data/grist/home.sqlite3']:
        with sqlite3.connect('file:'+str(scratch/relative)+'?mode=ro',uri=True) as conn:
            assert conn.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    for doc in (scratch/'data/grist/docs').glob('*.grist'):
        with sqlite3.connect('file:'+str(doc)+'?mode=ro',uri=True) as conn:
            assert conn.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
            assert conn.execute('select Total from Practice limit 1').fetchone()[0]==21
    with sqlite3.connect(scratch/'data/candlr/candlr.db') as conn:
        assert conn.execute("select count(*) from people where name='Fictional Sol Example'").fetchone()[0]>=1
    results.append('Restored Grist SQLite metadata/document/formula and Candlr SQLite contact verified')
    subprocess.run(cmd+['createdb','-U','bookplate',db],check=True);created=True
    with (snapshot/'bookplate.dump').open('rb') as stream:
        subprocess.run(cmd+['pg_restore','-U','bookplate','--no-owner','--exit-on-error','-d',db],stdin=stream,check=True)
    count=subprocess.check_output(cmd+['psql','-U','bookplate','-d',db,'-Atc',"select count(*) from book where title='Fictional Field Notes'"],text=True)
    assert int(count.strip())>=1
    results.append('Native PostgreSQL dump restored into isolated database; synthetic saved book found')
    print(json.dumps({'snapshot':snapshot.name,'results':results,'scope':'Synthetic data only; no production database overwritten'},indent=2))
finally:
    if created: subprocess.run(cmd+['dropdb','-U','bookplate',db],check=True)
    shutil.rmtree(scratch)
