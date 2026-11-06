#!/usr/bin/env python3
"""Finite, offline release-source assessment; no builds or production changes.

Consumes the recorded upstream inputs in a private staging directory. Raw reports
stay beside (not inside) the candidate trees. A source scan is not runtime or
behavioral clearance. Uses the existing Trivy binary and a preserved database.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path(sys.argv[1]).resolve()
scanner = Path('/opt/utilibre/maintenance/bin/trivy')
assert hashlib.sha256(scanner.read_bytes()).hexdigest() == '93f9da8e4ba5e0c1c76d8234ed2494cf9afb0a96fd21953e424bb795f3299b8e'
assert (root / 'scan-cache/db/trivy.db').is_file()
rows = []
for record in sorted(root.glob('*-input.json')):
    item = json.loads(record.read_text())
    source = root / item['id']
    assert source.parent == root and source.is_dir()
    out = root / (item['id'] + '-source-scan.json')
    row = {'id': item['id'], 'revision': item['commit'], 'report': out.name}
    args = ['unshare', '--net', '--', str(scanner), 'fs', '--config', '/dev/null',
            '--ignorefile', '/dev/null', '--cache-dir', str(root / 'scan-cache'),
            '--scanners', 'vuln', '--skip-db-update', '--skip-java-db-update',
            '--skip-check-update', '--skip-version-check', '--skip-vex-repo-update',
            '--disable-telemetry', '--offline-scan', '--timeout', '3m',
            '--skip-dirs', '**/node_modules', '--skip-dirs', '**/.git',
            '--format', 'json', '--list-all-pkgs', '--output', str(out), str(source)]
    try:
        with out.with_suffix('.log').open('w') as log:
            subprocess.run(args, check=True, stdout=log, stderr=log, timeout=200)
        result = json.loads(out.read_text())
        parts = result.get('Results', [])
        row['coverage'] = sorted({p['Type'] for p in parts if p.get('Packages')})
        row['status'] = 'assessed' if row['coverage'] else 'no-supported-input-extracted'
        row['findings'] = {level: sum(v['Severity'] == level for p in parts for v in p.get('Vulnerabilities', []))
                           for level in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']}
    except (subprocess.SubprocessError, ValueError, KeyError, OSError) as error:
        row['status'] = 'incomplete'
        row['error'] = type(error).__name__
    rows.append(row)
    (root / 'source-assessment.json').write_text(json.dumps(rows, indent=2) + '\n')
    print(item['id'], row['status'], row.get('findings', {}), flush=True)
