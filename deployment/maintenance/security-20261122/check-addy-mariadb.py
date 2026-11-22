"""Run Addy's existing synthetic native tests on the exact client update."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
assert sys.argv[1:] == []
HERE = Path(__file__).resolve().parent
OUT = Path('/var/lib/utilibre-maintenance/security-20261122/addy-mariadb/addy-mariadb')
SOURCE = HERE.parent / 'php-20261022/check-native.mjs'
code = SOURCE.read_text()
old = "const dir=(httpClient?"
start = code.index(old)
end = code.index(',b=JSON.parse', start)
code = code[:start] + 'const dir=' + json.dumps(str(OUT)) + code[end:]
old_import = "from './specs.mjs'"
assert code.count(old_import) == 1
code = code.replace(old_import, 'from ' + json.dumps((SOURCE.parent / 'specs.mjs').as_uri()))
adapter = OUT / 'addy-native.mjs'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node', str(adapter), 'addy'],
               cwd=HERE.parents[2], check=True, timeout=300)
build = json.loads((OUT / 'build.json').read_text())
proof = json.loads((OUT / 'application.json').read_text())
assert proof['passed'] and proof['imageId'] == build['imageId']
for image in [build['base'], build['imageId']]:
    output = subprocess.check_output(['docker', 'run', '--rm', '--network', 'none',
        '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
        '--memory', '256m', '--cpus', '1', '--pids-limit', '32', '--log-driver', 'none',
        '--entrypoint', 'mariadb', image, '--version'], timeout=30, text=True)
    expected = '11.4.12' if image == build['base'] else '11.4.14'
    assert expected in output, output
proof['clientVersionChecks'] = ['11.4.12 predecessor', '11.4.14 candidate']
proof['sourceSha256'] = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
proof['adapterSha256'] = hashlib.sha256(adapter.read_bytes()).hexdigest()
proof['limitations'].append('No live database connection or email sent')
(OUT / 'application.json').write_text(json.dumps(proof, indent=2) + '\n')
print('Addy native tests and both offline MariaDB CLI versions passed')
