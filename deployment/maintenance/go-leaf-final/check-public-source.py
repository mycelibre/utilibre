"""Bounded public HTTPS archive-byte check, without persisting download copies."""
import hashlib
import json
from pathlib import Path
import sys
import time
import requests

ROOT=Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output')
if '--batch=security-20261024' in sys.argv:
    ROOT=Path('/var/lib/utilibre-maintenance/security-20261024/output')
allowed={'oauth2-proxy','mezzo','opengist','ntfy','vikunja','anubis','wakapi'}
report=ROOT/'public-source.json'
rows=json.loads(report.read_text()) if report.exists() else {}
session=requests.Session()
session.trust_env=False
for name in [a for a in sys.argv[1:] if a != '--batch=security-20261024']:
    assert name in allowed
    expected=json.loads((ROOT/(name+'-source-published.json')).read_text())
    assert expected['published'] is True
    url='https://tools.utilibre.org/utilibre-source/'+expected['archive']
    digest=hashlib.sha256()
    total=0
    started=time.monotonic()
    with session.get(url,stream=True,timeout=(10,30),allow_redirects=False) as response:
        assert response.status_code==200,(name,'HTTP',response.status_code)
        for chunk in response.iter_content(1024*1024):
            total+=len(chunk)
            assert total<=expected['bytes'] and time.monotonic()-started<90
            digest.update(chunk)
        actual=digest.hexdigest()
        assert total==expected['bytes'] and actual==expected['sha256'],(name,'Public archive differs from published source')
        rows[name]={'url':url,'imageId':expected['imageId'],'sha256':actual,'bytes':total,
                    'httpStatus':response.status_code,'cacheStatus':response.headers.get('CF-Cache-Status'),
                    'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'passed':True}
    report.write_text(json.dumps(rows,indent=2)+'\n')
    print(json.dumps(rows[name]))
