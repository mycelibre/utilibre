"""Finite Nginx-only Addy correction through the retained package/release gates.

This deliberately does not mix the blocked PHP/ICU transition into a webserver
update. Mail delivery is never used as a synthetic test.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
out = ROOT / 'addy-nginx/addy'
mode = sys.argv[1:]
assert mode in (['prepare'], ['check'], ['scan'], ['release', 'check'], ['release', 'apply'], ['release', 'verify'])
name = {'prepare': 'prepare-nginx.py', 'check': 'check-nginx.py', 'scan': 'scan-nginx.py', 'release': 'release-nginx.py'}[mode[0]]
original = HERE / name
code = original.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, old
    code = code.replace(old, new)


if 'HERE = Path(__file__).resolve().parent' in code:
    replace('HERE = Path(__file__).resolve().parent', 'HERE = Path(' + repr(str(HERE)) + ')')
else:
    replace('HERE=Path(__file__).resolve().parent', 'HERE=Path(' + repr(str(HERE)) + ')')
code = code.replace("ROOT/'nginx'", "ROOT/'addy-nginx'")
code = code.replace("HERE/'nginx-inputs.json'", "HERE/'addy-nginx-inputs.json'")
if mode[0] == 'prepare':
    replace("assert 'nginx/1.30.' in info", "assert 'nginx/1.28.3' in info")
    replace("    oldconfig = json.loads", "    native(s['base'], 'sh', '-ec', 'test ! -e /var/www/localhost')\n    oldconfig = json.loads")
    # Alpine's install hook recreates two empty default web-root directories
    # omitted by Addy's image. Require them empty and restore the exact scope.
    replace(' rm -r /usr/lib/utilibre-vendor\n', ' rmdir /var/www/localhost/htdocs /var/www/localhost; rm -r /usr/lib/utilibre-vendor\n')
elif mode[0] == 'check':
    replace('spec.loader.exec_module(m)', "spec.loader.exec_module(m)\nm.INPUTS=json.loads((HERE/'addy-nginx-inputs.json').read_text())")
    # Use the image's named unprivileged Nginx user in the capability-free
    # syntax fixture; Addy's original directory ACLs belong to that account.
    replace("x['Config']['User'] or '101'", "'nginx'")
    replace("        args+=['--entrypoint','nginx',image,'-t']", "        args+=['--tmpfs','/run/nginx:rw,size=1m,mode=1777','--tmpfs','/var/log/nginx:rw,size=1m,mode=1777','--tmpfs','/var/lib/nginx/tmp:rw,size=8m,mode=1777','--entrypoint','nginx',image,'-e','/dev/stderr','-t']")
    for module in ('geoip', 'image_filter', 'js', 'xslt_filter'):
        replace('load_module /usr/lib/nginx/modules/ngx_http_' + module + '_module.so;\n', '')
    replace(",'four-dynamic-modules'", '')
elif mode[0] == 'scan':
    replace('ROOT=m.ROOT; inputs=m.INPUTS', "ROOT=m.ROOT; inputs=json.loads((HERE/'addy-nginx-inputs.json').read_text())")
else:
    replace("ROOT/'release-nginx-adapter-v3.mjs'", "ROOT/'release-addy-nginx-adapter.mjs'")
    replace("ROOT/'release-adapter.json'", "ROOT/'release-addy-nginx-adapter.json'")
adapter = ROOT / ('addy-v4-' + name)
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
sys.argv = [str(adapter), *(mode[1:] if mode[0] == 'release' else []), 'addy']
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})
if mode[0] == 'check':
    nginx_proof = json.loads((out / 'application.json').read_text())
    assert nginx_proof['passed']
    (out / 'application.json').rename(out / 'nginx-application.json')
    source = HERE.parent / 'php-20261022/check-native.mjs'
    native = source.read_text().replace("from './specs.mjs'", 'from ' + json.dumps((source.parent / 'specs.mjs').as_uri()))
    start = native.index('const dir=(httpClient?')
    end = native.index(',b=JSON.parse', start)
    native = native[:start] + 'const dir=' + json.dumps(str(out)) + native[end:]
    fixture = out / 'addy-native.mjs'
    fixture.write_text(native)
    subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node', str(fixture), 'addy'], check=True, timeout=300)
    application = json.loads((out / 'application.json').read_text())
    assert application['passed'] and application['imageId'] == nginx_proof['imageId']
    application['nginx'] = nginx_proof
    application['fixtureSha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
    application['adapterSha256'] = hashlib.sha256(fixture.read_bytes()).hexdigest()
    (out / 'application.json').write_text(json.dumps(application, indent=2) + '\n')
