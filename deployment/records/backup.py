#!/usr/bin/env python3
"""Consistent saved-account snapshots. Temporary sharing data is not included."""
import datetime,hashlib,json,os,pathlib,shutil,subprocess,tarfile
os.umask(0o077)
repo=pathlib.Path(__file__).resolve().parents[2]
root=pathlib.Path('/opt/utilibre/records')
if shutil.disk_usage(root).free < 5*1024**3:
    raise SystemExit('Backup deferred: less than 5 GiB free. Previous snapshots preserved.')
compose=['docker','compose','-f',str(repo/'deployment/records/compose.yaml')]
running=subprocess.check_output(compose+['ps','--status','running','--services'],text=True).split()
apps=[name for name in ['grist','candlr','bookplate'] if name in running]
out=root/'backups'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
out.mkdir(mode=0o700)
try:
    if apps: subprocess.run(compose+['stop','-t','30']+apps,check=True,stdout=subprocess.DEVNULL)
    with (out/'bookplate.dump').open('wb') as target:
        subprocess.run(compose+['exec','-T','db','pg_dump','-U','bookplate','-d','bookplate','-Fc'],check=True,stdout=target)
    with tarfile.open(out/'saved-work-and-config.tar.gz','w:gz') as archive:
        for name in ['grist','candlr','bookplate']:
            archive.add(root/'data'/name,arcname='data/'+name)
        for path in (root/'private').glob('*.env'):
            archive.add(path,arcname='private/'+path.name)
        archive.add(repo/'deployment/records',arcname='deployment/records')
        archive.add(repo/'deployment/grist/custom.css',arcname='deployment/grist/custom.css')
    hashes={}
    for path in out.iterdir():
        with path.open('rb') as stream: hashes[path.name]=hashlib.file_digest(stream,'sha256').hexdigest()
    (out/'SHA256.json').write_text(json.dumps(hashes,indent=2)+'\n')
    print(out)
finally:
    if apps: subprocess.run(compose+['start']+apps,check=True,stdout=subprocess.DEVNULL)
