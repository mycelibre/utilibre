#!/usr/bin/env python3
"""Record actual bundle membership beside an npm audit; do not hide audit findings."""
import json
import subprocess
from pathlib import Path

source = Path('/opt/utilibre/src/planka-projects/client')
report = Path('/opt/utilibre/reports/planka-fork-20261009')
audit_run = subprocess.run(['npm', 'audit', '--omit=dev', '--json'], cwd=source,
                           stdout=subprocess.PIPE, check=False)
assert audit_run.returncode in [0, 1]
audit = json.loads(audit_run.stdout)
assert 'vulnerabilities' in audit and 'metadata' in audit
(report / 'client-audit-after.json').write_bytes(audit_run.stdout)
files = subprocess.check_output(['docker', 'exec', 'utilibre-projects-pilot-app-1',
    'sh', '-c', 'find /app/public/static/js -name "*.map"'], text=True).splitlines()
sources = []
for filename in files:
    source_map = json.loads(subprocess.check_output(
        ['docker', 'exec', 'utilibre-projects-pilot-app-1', 'cat', filename]))
    sources.extend(source_map.get('sources', []))
found = []
for name, finding in audit['vulnerabilities'].items():
    hits = [item for item in sources if f'node_modules/{name}/' in item]
    if hits:
        found.append({'package': name, 'severity': finding['severity'],
            'via': finding['via'], 'sampleSources': hits[:2]})
lock = json.loads((source / 'package-lock.json').read_text())
result = {
    'checkedAt': '2026-10-09',
    'image': subprocess.check_output(['docker', 'inspect', 'utilibre-projects-pilot-app-1',
                                     '--format', '{{.Image}}'], text=True).strip(),
    'auditedPackageTotals': audit['metadata']['vulnerabilities'],
    'selectedVersions': {path: value['version'] for path, value in lock['packages'].items()
                         if any(path.endswith('/' + name) for name in ['react-router', 'react-router-dom', 'parseuri'])},
    'bundledAuditedPackages': found,
    'sourceCount': len(sources),
    'scope': 'Source-map membership and dependency advisories; manually review inputs and prebundled code. Not a universal security guarantee.',
}
(report / 'client-bundled-advisories-after.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
