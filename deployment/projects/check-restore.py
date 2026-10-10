#!/usr/bin/env python3
"""Restore a real Projects backup into a disposable database and private directory."""
import datetime,hashlib,json,pathlib,subprocess,tarfile,tempfile
root=pathlib.Path('/opt/utilibre/projects');fixtures=json.loads((root/'private/native-fixtures.json').read_text());backup=sorted((root/'backups').iterdir())[-1]
manifest=json.loads((backup/'SHA256.json').read_text())
for name,digest in manifest.items():assert hashlib.sha256((backup/name).read_bytes()).hexdigest()==digest
cmd=['docker','exec','-i','utilibre-projects-db-1'];database='projects_restore_check'
subprocess.run(cmd+['createdb','-U','projects',database],check=True)
checks=[]
try:
 with (backup/'projects.dump').open('rb') as source:subprocess.run(cmd+['pg_restore','-U','projects','-d',database,'--no-owner','--no-privileges'],stdin=source,check=True)
 for table in ['project','board','list','card','task','attachment']:
  values=[subprocess.check_output(cmd+['psql','-U','projects','-d',db,'-Atc',f'SELECT count(*) FROM "{table}"']).strip() for db in ['projects',database]];assert values[0]==values[1]
 checks.append('Six native table counts matched the restored PostgreSQL database')
 for fixture in fixtures:
  ident=fixture['card']['id'];assert str(ident).isdigit()
  content=subprocess.check_output(cmd+['psql','-U','projects','-d',database,'-Atc',f"SELECT name || ':' || description FROM card WHERE id='{ident}'"],text=True)
  assert fixture['card']['name'] in content and fixture['card']['description'] in content
 checks.append('Both fictional card names and descriptions matched in the restored database')
 with tempfile.TemporaryDirectory(prefix='projects-restore-') as temp:
  with tarfile.open(backup/'uploads-and-private.tar.gz') as archive:archive.extractall(temp,filter='data')
  restored=list((pathlib.Path(temp)/'data/attachments').rglob('fictional.txt'));assert len(restored)==2
  assert all(p.read_bytes()==b'Fictional Projects recovery attachment.\n' for p in restored)
  assert (pathlib.Path(temp)/'private/runtime.env').is_file()
 checks.append('Separate file archive restored both fictional attachment byte strings and private settings')
finally:subprocess.run(cmd+['dropdb','-U','projects',database],check=True)
report={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'backup':backup.name,'checks':checks,'scope':'Native database/file recovery only; CSV is not importable as a full Projects backup'}
pathlib.Path('/opt/utilibre/reports/projects-launch-20261009/restore-check.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
