"""Retained fixtures for the remaining libc consumers; no live data or providers."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

os.umask(0o077)
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/vendor-debian')
inputs = json.loads((HERE / 'debian-inputs.json').read_text())
node = '/root/.nvm/versions/node/v24.22.3/bin/node'
limits = ['--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '1', '--memory', '768m', '--memory-swap', '768m', '--pids-limit', '128', '--log-driver', 'none', '--tmpfs', '/tmp:rw,size=96m,mode=1777']
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

for key in sys.argv[1:]:
    row = next(r for r in inputs['rows'] if r['key'] == key)
    out = ROOT / key
    build = json.loads((out / 'build.json').read_text())
    scope = json.loads((out / 'scope.json').read_text())
    assert build['passed'] and scope['passed'] and build['imageId'] == scope['imageId']
    assert not (out / 'application.json').exists()
    image = build['imageId']
    original = None
    checks = []
    transcript = bytearray()

    def run(args, **kwargs):
        p = subprocess.run(args, capture_output=True, timeout=600, **kwargs)
        transcript.extend(p.stdout + p.stderr)
        (out / 'app-extra-run.log').write_bytes(transcript)
        assert p.returncode == 0, key + ': private native diagnostic retained'
        return p.stdout.decode().strip()

    if key == 'records-grist':
        original = HERE.parent / 'sandbox-final/check-grist.mjs'
        tag = 'utilibre-grist:1.7.21-libc-20261122'
        run(['docker', 'tag', image, tag])
        result = run([node, str(original), tag])
        native = json.loads(result.splitlines()[-1])
        assert native['passed'] and native['imageId'] == image
        checks = ['Native private documents, formula sandbox, API access boundaries, synthetic export/restore']
    elif key == 'kitchenowl-app':
        original = HERE.parent / 'releases-20261111/check-kitchenowl-upgrade.py'
        code = original.read_text()
        old = "r=pathlib.Path('/var/lib/utilibre-maintenance/held-upgrades-20261111/kitchenowl')"
        assert code.count(old) == 1
        code = code.replace(old, 'r=pathlib.Path(' + repr(str(out)) + ')')
        old = "old=json.load(open(r/'baseline.json'))['imageId'];new=json.load(open(r/'startup-final-image.json'))['imageId']"
        assert code.count(old) == 1
        code = code.replace(old, 'old=' + repr(build['base']) + ';new=' + repr(image))
        adapter = out / 'kitchenowl-native.py'
        adapter.write_text(code)
        run(['python3', str(adapter)])
        native = json.loads((out / 'migration-native/result.json').read_text())
        assert native['passed'] and native['imageId'] == image
        checks = ['Native two-household import/export, synthetic old/new data retention, restore and rollback']
    elif key == 'family-chess-app':
        original = REPO / 'deployment/family-chess/check-native.py'
        answer = run(['docker', 'run', '--rm', '-i', *limits, '-e', 'SECRET_KEY=fictional-libc-test-only', '-e', 'ALLOWED_HOSTS=chess.utilibre.org', '--tmpfs', '/data:rw,size=32m,uid=10001,gid=10001', '--entrypoint', 'python', image, '-B', '-'], input=original.read_bytes())
        native = json.loads(answer.splitlines()[-1])
        assert len(native['passed']) >= 10
        checks = native['passed']
    elif key == 'expanded-penpot-backend':
        original = HERE.parent / 'security-20261103/check-penpot.mjs'
        code = original.read_text()
        old = "const root='/var/lib/utilibre-maintenance/security-20261103/'+profile;"
        assert code.count(old) == 1
        code = code.replace(old, 'const root=' + json.dumps(str(ROOT)) + ';')
        old = "const inputs=JSON.parse(fs.readFileSync(new URL('./'+profile+'-inputs.json',import.meta.url)));"
        assert code.count(old) == 1
        code = code.replace(old, 'const inputs=' + json.dumps(inputs) + ';')
        code = code.replace("for(const role of ['backend','exporter'])", "for(const role of ['backend'])")
        code = code.replace("key='debian-expanded-penpot-'+role", "key='expanded-penpot-'+role")
        code = code.replace('import.meta.url', json.dumps(original.as_uri()))
        adapter = out / 'penpot-native.mjs'
        adapter.write_text(code)
        run([node, str(adapter)])
        native = json.loads((out / 'application.json').read_text())
        assert native['passed'] and native['imageId'] == image
        (out / 'application.json').rename(out / 'application-native.json')
        checks = ['System/private raster output parity, native codec set, TTF/OTF/WOFF/WOFF2 roundtrips']
    elif key == 'calendar-radicale':
        original = REPO / 'deployment/calendar/check-dav.py'
        name = 'utilibre-libc-radicale-fixture'
        assert run(['docker', 'ps', '-aq', '--filter', 'name=^/' + name + '$']) == ''
        conf = (REPO / 'deployment/calendar/radicale.conf').read_text().replace('0.0.0.0:5232', '127.0.0.1:5232').replace('/run/radicale/users', '/tmp/users').replace('/var/lib/radicale/collections', '/tmp/collections')
        seed = 'import json,pathlib,bcrypt\np=pathlib.Path("/tmp")\nusers={n:"fictional-only-local-fixture-2026" for n in ("utilibre-fixture-a","utilibre-fixture-b")}\n(p/"credentials.json").write_text(json.dumps(users))\n(p/"users").write_text("".join(n+":"+bcrypt.hashpw(v.encode(),bcrypt.gensalt()).decode()+"\\n" for n,v in users.items()))\n(p/"config").write_text(' + repr(conf) + ')\n'
        try:
            run(['docker', 'run', '-d', '--name', name, *limits, '--entrypoint', 'python', image, '-c', 'import time;time.sleep(300)'])
            run(['docker', 'exec', '-i', name, 'python', '-B', '-'], input=seed.encode())
            run(['docker', 'exec', '-d', name, 'python', '-m', 'radicale', '--config', '/tmp/config'])
            ready = 'import urllib.request,time\nfor n in range(40):\n try:\n  assert urllib.request.urlopen("http://127.0.0.1:5232/.web/",timeout=2).status==200;break\n except Exception:\n  if n==39:raise\n  time.sleep(.25)\n'
            run(['docker', 'exec', '-i', name, 'python', '-B', '-'], input=ready.encode())
            run(['docker', 'exec', '-i', '-e', 'CALENDAR_TEST_FIXTURES=/tmp/credentials.json', '-e', 'CALENDAR_TEST_URL=http://127.0.0.1:5232/', name, 'python', '-B', '-'], input=original.read_bytes())
        finally:
            run(['docker', 'rm', '-f', '-v', name])
        native = {'passed': True, 'network': 'none; container loopback only'}
        checks = ['Two synthetic accounts: calendar/contact create, export/import, unauthorized denial and delete']
    elif key == 'unfurl-proxy':
        original = REPO / 'deployment/unfurl/squid.conf'
        for candidate in (build['base'], image):
            run(['docker', 'run', '--rm', *limits, '--user', '0', '-v', str(original) + ':/fixture.conf:ro', '--entrypoint', '/opt/squid/sbin/squid', candidate, '-k', 'parse', '-f', '/fixture.conf'])
        native = {'passed': True, 'configurationParseOnly': True}
        checks = ['Native libc fixture and unchanged Squid configuration parse; new transfer test not claimed']
    else:
        raise ValueError('Unsupported fixture ' + key)
    proof = {'passed': True, 'date': datetime.now(timezone.utc).isoformat(), 'base': build['base'], 'imageId': image,
             'fixture': str(original.relative_to(REPO)), 'fixtureSha256': sha(original), 'native': native, 'checks': checks,
             'scopeSha256': sha(out / 'scope.json'), 'productionChanged': False,
             'limitations': 'Only the listed native synthetic checks; no new physical-device or external-provider verification.'}
    (out / 'application.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(key + ': native consumer checks passed', flush=True)
