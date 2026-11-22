"""Explicit bounded primary-data download; no scanning or review approval.

Only missing CVE records listed in the local request manifest are requested.
The Git commit is immutable. No retries, mutable branch resolution or provider
probes; unavailable records stay explicit. An offline reviewer follows later.
"""
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.request

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert sys.argv[1:] == ['--download']
selection = ROOT / 'primary/missing-header-records.json'
inputs = json.loads(selection.read_text())
commit = inputs['commit']
assert re.fullmatch('[a-f0-9]{40}', commit)
ids = inputs['ids']
assert ids == sorted(set(ids)) and 0 < len(ids) <= 450
assert all(re.fullmatch(r'CVE-\d{4}-\d{4,8}', n) for n in ids)
cache = ROOT.parent / ('headers-review-' + commit) / 'cna'
assert cache.is_dir()
report = ROOT / 'primary/missing-header-download.json'
assert not report.exists(), 'Preserve the completed request budget'

def acquire(identifier):
    _, year, number = identifier.split('-')
    url = f'https://raw.githubusercontent.com/CVEProject/cvelistV5/{commit}/cves/{year}/{number[:-3]}xxx/{identifier}.json'
    file = cache / (identifier + '.json')
    try:
        existing = file.exists()
        if existing:
            data = file.read_bytes()
        else:
            with urllib.request.urlopen(url, timeout=15) as response:
                assert response.url == url and response.status == 200
                data = response.read(250001)
        assert len(data) <= 250000
        record = json.loads(data)
        assert record['cveMetadata']['cveId'] == identifier
        if not existing:
            file.write_bytes(data)
        return {'id': identifier, 'url': url, 'sha256': hashlib.sha256(data).hexdigest(),
                'status': 'cached' if existing else 'downloaded'}
    except urllib.error.HTTPError as error:
        return {'id': identifier, 'url': url, 'status': 'unavailable', 'httpStatus': error.code}
    except Exception as error:
        return {'id': identifier, 'url': url, 'status': 'unavailable', 'error': type(error).__name__}

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    rows = list(pool.map(acquire, ids))
value = {'date': datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'selectionSha256': hashlib.sha256(selection.read_bytes()).hexdigest(),
         'commit': commit, 'maximumRequests': len(ids), 'concurrency': 2,
         'records': rows, 'approval': False}
report.write_text(json.dumps(value, indent=2) + '\n')
print(json.dumps({'downloaded': sum(r['status'] == 'downloaded' for r in rows),
                  'cached': sum(r['status'] == 'cached' for r in rows),
                  'unavailable': sum(r['status'] == 'unavailable' for r in rows)}))
