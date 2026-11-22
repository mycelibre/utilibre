"""Retained native application fixtures for the four signed SASL candidates."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/sasl')
inputs = json.loads((HERE / 'sasl-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
node = '/root/.nvm/versions/node/v24.22.3/bin/node'
assert 1 <= len(sys.argv[1:]) <= 4 and len(set(sys.argv[1:])) == len(sys.argv[1:])
for key in sys.argv[1:]:
    row = next(r for r in inputs['rows'] if r['key'] == key)
    out = ROOT / 'vendor-debian' / key
    build = json.loads((out / 'build.json').read_text())
    consumer = json.loads((out / 'consumer.json').read_text())
    scope = json.loads((out / 'scope.json').read_text())
    assert all(v['passed'] and v['imageId'] == build['imageId'] for v in (consumer, scope))
    assert not (out / 'application.json').exists()
    if key == 'community-rssbridge':
        command = ['python3', str(HERE / 'sasl-runtime.py'), 'check', key]
        original = HERE / 'check-debian.py'
        code = original.read_text()
    else:
        original = HERE.parent / 'openssl-bookworm-followup' / ('rallly-check.mjs' if key == 'community-rallly' else 'app-checks.mjs')
        code = original.read_text()

        def replace(old, new):
            global code
            assert code.count(old) == 1, (key, old)
            code = code.replace(old, new)

        if key == 'community-rallly':
            # This existing synthetic database must be local. Do not let the
            # retained Docker fixture perform an implicit registry download.
            subprocess.run(['docker', 'image', 'inspect', '--format', '{{.Id}}',
                            'postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73'],
                           check=True, capture_output=True, timeout=20)
            replace("const dir='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012/images/rallly';", 'const dir=' + json.dumps(str(out)) + ';')
            replace("from '../../../portal/node_modules/playwright-core/index.mjs'", 'from ' + json.dumps((HERE.parents[2] / 'portal/node_modules/playwright-core/index.mjs').as_uri()))
            replace(" page.on('request',r=>", " await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==base){outside.add(url.origin);return route.abort();}return route.continue();});\n page.on('request',r=>")
            command = [node, str(out / 'native-app.mjs')]
        else:
            short = {'community-uptime-kuma': 'kuma', 'gathio-postgres': 'gathio'}[key]
            replace("const dir='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012',here=new URL('.',import.meta.url).pathname;", 'const dir=' + json.dumps(str(ROOT)) + ',here=' + json.dumps(str(original.parent) + '/') + ';')
            replace("JSON.parse(fs.readFileSync(here+'specs.json'))", json.dumps([{'key': short, 'candidate': row['candidate']}]))
            replace("const out=dir+'/images/'+s.key,build=", 'const out=' + json.dumps(str(out)) + ',build=')
            if short == 'gathio':
                assert inputs['gathioPostgresVersion'].startswith('postgres (PostgreSQL) 17.11')
                # The October fixture certificate has expired. Keep that
                # failed attempt; create a new synthetic localhost certificate
                # without changing certificate validation or production keys.
                fixture = out / 'sdk-fixture'
                fixture.mkdir(mode=0o700)
                subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
                                '-days', '2', '-keyout', str(fixture / 'key.pem'),
                                '-out', str(fixture / 'cert.pem'), '-subj', '/CN=localhost',
                                '-addext', 'subjectAltName=DNS:localhost'],
                               check=True, capture_output=True, timeout=30)
                replace('src=/var/lib/utilibre-maintenance/closure-followup-20261012/curl-fixture,dst=/fixture,readonly',
                        'src=' + str(fixture) + ',dst=/fixture,readonly')
            command = [node, str(out / 'native-app.mjs'), short]
        (out / 'native-app.mjs').write_text(code)
    result = subprocess.run(command, capture_output=True, timeout=600)
    (out / 'native-app.log').write_bytes(result.stdout + result.stderr)
    assert result.returncode == 0, key + ': native application failure; private evidence retained'
    native = json.loads((out / 'application.json').read_text())
    assert native['passed'] and native['imageId'] == build['imageId']
    (out / 'application.json').rename(out / 'application-native.json')
    proof = {'passed': True, 'date': native.get('completedAt') or native['date'], 'base': row['base'],
             'imageId': build['imageId'], 'originalSha256': sha(original),
             'adapterSha256': hashlib.sha256(code.encode()).hexdigest(),
             'nativeSha256': sha(out / 'application-native.json'),
             'consumerSha256': sha(out / 'consumer.json'), 'scopeSha256': sha(out / 'scope.json'),
             'productionChanged': False, 'network': 'isolated native fixtures; no production credentials or data'}
    if key == 'gathio-postgres':
        proof['syntheticCertificateSha256'] = sha(out / 'sdk-fixture/cert.pem')
    (out / 'application.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(key + ': retained native application and runtime checks passed', flush=True)
