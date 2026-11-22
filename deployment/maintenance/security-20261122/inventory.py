"""Read-only, all-severity checkpoint using the existing queue's decision rule.

Private output only; never changes decisions, services, or scanner exclusions.
Package-target observations are not counts of distinct exploitable defects.
"""
import collections
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122'
SEVERITIES = ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')


def checkpoint(label):
    if label not in ('before', 'after'):
        raise ValueError('Use before or after')
    target = OUT / label
    target.mkdir(parents=True, exist_ok=False)
    now = datetime.now(timezone.utc)
    identities = {}
    for filename in ('security.json', 'security-queue.json', 'security-decisions.json'):
        data = (ROOT / filename).read_bytes()
        (target / filename).write_bytes(data)
        identities[filename] = hashlib.sha256(data).hexdigest()
    queue = json.loads((target / 'security-queue.json').read_text())
    scan = json.loads((target / 'security.json').read_text())
    assert scan['status'] == 'checked' and queue['status'] == 'current'
    assert queue['scanDate'] == scan['completedAt']
    pending = []
    for item in queue['items']:
        expiry = datetime.fromisoformat(item.get('decision', {}).get('expiresAt', '1970-01-01T00:00:00Z').replace('Z', '+00:00'))
        if not (item['status'] in ('mitigated', 'not-affected') and expiry > now):
            pending.append(item)
    groups = collections.defaultdict(list)
    for item in pending:
        groups[(item['scope'], item['type'], item['package'], item['installed'], item.get('fixed'))].append(item)
    records = []
    for key, items in groups.items():
        records.append(dict(zip(('scope', 'type', 'package', 'installed', 'fixed'), key)) | {
            'counts': {s: sum(i['severity'] == s for i in items) for s in SEVERITIES},
            'advisories': sorted({i['id'] for i in items}),
            'artifacts': sorted({i['artifact'] for i in items}),
            'keys': sorted(i['key'] for i in items),
            'status': 'not-assessed',
        })
    records.sort(key=lambda r: (*(-r['counts'][s] for s in SEVERITIES), r['package'], r['installed']))
    result = {
        'schemaVersion': 1, 'date': now.isoformat(), 'scanDate': scan['completedAt'],
        'inputSha256': identities, 'totalObservations': len(queue['items']),
        'pending': {s: sum(i['severity'] == s for i in pending) for s in SEVERITIES},
        'groups': len(records), 'distinctAdvisories': len({i['id'] for i in pending}),
        'productionChanged': False, 'decisionsChanged': False,
    }
    (target / 'groups.json').write_text(json.dumps(records, indent=2) + '\n')
    (target / 'summary.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    assert len(sys.argv) == 2
    checkpoint(sys.argv[1])
