"""Finite Caddy dependency preparation; reuse existing native fixtures, no release."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone

os.umask(0o077)
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/xnet-caddy')
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
spec = read(HERE / 'xnet-caddy-inputs.json')
assert len(sys.argv) == 2 and sys.argv[1] in ('build', 'stage', 'native', 'scan')
phase = sys.argv[1]
assert os.statvfs(ROOT).f_bavail * os.statvfs(ROOT).f_frsize >= spec['limits']['minimumFreeBytes']

def execute(args, log, timeout=240, env=None):
    with log.open('x') as output:
        subprocess.run(args, stdout=output, stderr=output, timeout=timeout, check=True,
                       env=env, preexec_fn=lambda: os.umask(0o022))

def write(name, value):
    p = ROOT / name
    assert not p.exists(), 'Preserve evidence: ' + str(p)
    p.write_text(json.dumps(value, indent=2) + '\n')

def modules(text):
    return {p[1]: p[2] for line in text.splitlines()
            if len(p := line.split()) >= 3 and p[0] == 'dep'}

assert sha(ROOT / 'input/source.tar.gz') == spec['sourceArchiveSha256']
assert sha(ROOT / 'source-scope-verified.json') == spec['sourceScopeSha256']
source = read(ROOT / 'source-scope-verified.json')
assert source['passed']
for name, digest in source['after'].items():
    assert sha(ROOT / 'source' / name) == digest, name

if phase == 'build':
    assert not (ROOT / 'artifact/caddy').exists(), 'Preserve built artifact'
    original = REPO / spec['nativeRecipe']
    assert sha(original) == spec['nativeRecipeSha256']
    text = original.read_text()
    previous = 'b430516910839fbaf35c0a9e9df80d1e2e30aa792530293c39f4a97a1b2c9060'
    assert text.count(previous) == 1
    adapter = ROOT / 'compile-prepared.sh'
    expected = text.replace(previous, spec['sourceArchiveSha256'])
    if adapter.exists():
        assert adapter.read_text() == expected
    else:
        adapter.write_text(expected)
    assert sha(adapter) == spec['adapterSha256']
    # The prepared tree already contains the earlier JOSE/codec repairs. Their
    # original notices are retained; the compiler updates current module locks.
    notices = ROOT / 'artifact/notices'
    notices.mkdir(parents=True, exist_ok=True)
    prior = Path('/var/lib/utilibre-maintenance/security-20261028/codec-caddy/artifact/notices')
    for f in ('jose-v3.patch', 'go-jose-v3-LICENSE', 'go-jose-v4-LICENSE', 'compress-LICENSE'):
        shutil.copy2(prior / f, notices / f)
    execute(['docker', 'run', '--rm', '--name', 'maintenance-caddy-xnet-compiler',
        '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
        '--log-driver', 'none', '--cpus', '1', '--memory', '2g', '--memory-swap', '2g', '--pids-limit', '128',
        '--tmpfs', '/work:rw,exec,size=1800m', '--tmpfs', '/tmp:rw,exec,size=32m',
        '-v', str(ROOT / 'input') + ':/input:ro', '-v', str(adapter) + ':/compile.sh:ro',
        '-v', str(ROOT / 'artifact') + ':/out', '-e', 'EXPECTED_GO=1.26.10',
        '-e', 'CADDY_NET_REVIEW=0', '-e', 'UTILIBRE_CADDY_JOSE=0', '-e', 'UTILIBRE_CADDY_CODEC=0',
        spec['compiler'], 'sh', '/compile.sh'], ROOT / 'compile.log', timeout=1200)
    write('compile-result.json', {'passed': True, 'exitCode': 0})
elif phase == 'stage':
    assert read(ROOT / 'compile-result.json')['passed']
    loader = importlib.util.spec_from_file_location('image_scope', HERE / 'zlib-check.py')
    common = importlib.util.module_from_spec(loader)
    loader.loader.exec_module(common)
    old = Path('/var/lib/utilibre-maintenance/security-20261028/codec-caddy/artifact/notices/build-info.txt').read_text()
    fresh = (ROOT / 'artifact/notices/build-info.txt').read_text()
    assert fresh.splitlines()[0] == '/out/caddy: go1.26.10'
    expected = modules(old)
    for name, (before, after) in spec['moduleChanges'].items():
        if name in expected:
            assert expected[name] == before
            expected[name] = after
    assert modules(fresh) == expected, 'Unexpected compiled module delta'
    rows = []
    for s in spec['rows']:
        before = common.export_manifest(s['base'])
        binary = s['binary'].lstrip('/')
        assert before[binary]['sha256'] == s['oldBinarySha256']
        stage = ROOT / s['key']
        stage.mkdir()
        shutil.copy2(ROOT / 'artifact/caddy', stage / 'caddy')
        shutil.copytree(ROOT / 'artifact/notices', stage / 'notices')
        (stage / 'Dockerfile').write_text('FROM ' + s['base'] + '\nCOPY --chown=0:0 caddy ' + s['binary'] + '\nCOPY --chown=0:0 notices/ /usr/local/share/utilibre-caddy-security/\n')
        execute(['docker', 'build', '--network', 'none', '--pull=false', '-t', s['candidate'], str(stage)],
                stage / 'image-build.log', env={**os.environ, 'DOCKER_BUILDKIT': '0'})
        base, candidate = [json.loads(common.run(['docker', 'image', 'inspect', v]))[0]
                           for v in (s['base'], s['candidate'])]
        assert base['Config'] == candidate['Config']
        after = common.export_manifest(candidate['Id'])
        changed = sorted(p for p in before.keys() | after.keys() if before.get(p) != after.get(p))
        allowed = {binary} | {'usr/local/share/utilibre-caddy-security/' + p.name
                             for p in (ROOT / 'artifact/notices').iterdir() if p.is_file()}
        assert set(changed) <= allowed and binary in changed, changed
        assert before[binary]['mode'] == after[binary]['mode'] == 0o755
        assert after[binary]['sha256'] == sha(ROOT / 'artifact/caddy')
        proof = {**s, 'passed': True, 'imageId': candidate['Id'], 'candidateId': candidate['Id'],
                 'changedFiles': changed, 'configurationUnchanged': True,
                 'allUnrelatedImageFilesUnchanged': True, 'scopeCheckerSha256': sha(__file__),
                 'exporterSha256': sha(HERE / 'zlib-check.py'), 'binarySha256': after[binary]['sha256']}
        (stage / 'build.json').write_text(json.dumps(proof, indent=2) + '\n')
        rows.append(proof)
    write('build.json', {'date': datetime.now(timezone.utc).isoformat(), 'passed': True,
                        'binarySha256': sha(ROOT / 'artifact/caddy'), 'rows': rows, 'deployed': False})
elif phase == 'native':
    build = read(ROOT / 'build.json')
    adapters = []
    def adapt(name, replacements):
        p = REPO / name
        assert sha(p) == spec['fixtures'][name]
        code = p.read_text()
        for old, new in replacements:
            assert code.count(old) == 1, (name, old)
            code = code.replace(old, new)
        out = ROOT / p.name
        assert not out.exists()
        out.write_text(code)
        adapters.append({'fixture': name, 'originalSha256': sha(p), 'adapterSha256': sha(out)})
        return out
    recipes = str(REPO / 'deployment/maintenance/caddy-security') + '/'
    native = REPO / 'deployment/maintenance/caddy-security/check.mjs'
    old_expectation = next(line for line in native.read_text().splitlines() if line.startswith(' const expected=versions(original)'))
    mapping = json.dumps(spec['moduleChanges'])
    check = adapt('deployment/maintenance/caddy-security/check.mjs', [
        ("const recipe=fileURLToPath(new URL('.',import.meta.url));", 'const recipe=' + json.dumps(recipes) + ';'),
        ('/var/lib/utilibre-maintenance/security-20261028/codec-caddy', str(ROOT)),
        (old_expectation, ' const updates=' + mapping + ";const expected=versions(original).map(line=>{const p=line.split('\\t');if(updates[p[1]]){assert.equal(p[2],updates[p[1]][0]);p[2]=updates[p[1]][1];}return p.join('\\t');});"),
        ("if(netReview)assert(versions(candidate).includes('dep\\tgolang.org/x/net\\tv0.60.0'));", "if(netReview)assert(versions(candidate).includes('dep\\tgolang.org/x/net\\tv0.62.0'));"),
    ])
    execute(['node', str(check), '--codec'], ROOT / 'native.log', timeout=600)
    wishlist = adapt('deployment/maintenance/check-wishlist-esbuild.mjs', [
        ('../../portal/node_modules/playwright/index.mjs', str(REPO / 'portal/node_modules/playwright/index.mjs')),
        ('utilibre-wishlist:caddy-codec-security-20261028', next(s['candidate'] for s in spec['rows'] if s['kind'] == 'wishlist')),
        ('/var/lib/utilibre-maintenance/security-20261028/codec-caddy', str(ROOT)),
    ])
    execute(['node', str(wishlist), '--codec'], ROOT / 'wishlist-native.log', timeout=240)
    newsletters = adapt('deployment/maintenance/caddy-security/check-newsletters.mjs', [
        ('../../../portal/node_modules/playwright/index.mjs', str(REPO / 'portal/node_modules/playwright/index.mjs')),
        ("const recipe=fileURLToPath(new URL('.',import.meta.url));", 'const recipe=' + json.dumps(recipes) + ';'),
        ('/var/lib/utilibre-maintenance/security-20261028/codec-caddy', str(ROOT)),
    ])
    execute(['node', str(newsletters), '--codec'], ROOT / 'newsletters-native.log', timeout=240)
    write('native.json', {'passed': True, 'adapters': adapters, 'productionChanged': False,
                         'network': 'none; isolated internal application fixtures',
                         'limitations': 'Synthetic accounts and SMTP only; no production email or data.'})
else:
    # Existing scanner, fixed database, no suppression or network refresh.
    db = Path('/var/cache/utilibre-security/db/trivy.db')
    digest = sha(db)
    for row in read(ROOT / 'build.json')['rows']:
        d = ROOT / row['key']
        results = []
        for label, image in [('before', row['base']), ('after', row['imageId'])]:
            execute(['unshare', '--net', '--', '/opt/utilibre/maintenance/bin/trivy', 'image',
                '--config', '/dev/null', '--ignorefile', '/dev/null', '--cache-dir', '/var/cache/utilibre-security',
                '--scanners', 'vuln', '--skip-db-update', '--skip-java-db-update', '--skip-check-update',
                '--skip-version-check', '--skip-vex-repo-update', '--disable-telemetry', '--offline-scan',
                '--timeout', '3m', '--image-src', 'docker', '--format', 'json', '--list-all-pkgs',
                '--output', str(d / (label + '-scan.json')), image], d / (label + '-scan.log'))
            raw = read(d / (label + '-scan.json'))
            assert raw['Metadata']['ImageID'] == image
            results.append({(v['VulnerabilityID'], v['PkgName'], v['InstalledVersion'], v['Severity'])
                for r in raw.get('Results', []) for v in r.get('Vulnerabilities', [])})
        before, after = results
        assert sha(db) == digest
        assert any(f[0] == spec['advisory'] for f in before)
        assert not any(f[0] == spec['advisory'] for f in after)
        assert not any(f[3] in ('HIGH', 'CRITICAL') for f in after - before)
        proof = {'passed': True, 'base': row['base'], 'imageId': row['imageId'],
                 'date': datetime.now(timezone.utc).isoformat(), 'databaseSha256': digest,
                 'targetedFindingRemoved': True, 'newHighCritical': 0,
                 'removedFindings': sorted(before - after), 'newFindings': sorted(after - before),
                 'remainingHigh': sum(f[3] == 'HIGH' for f in after),
                 'remainingCritical': sum(f[3] == 'CRITICAL' for f in after),
                 'rawEvidence': {label: sha(d / (label + '-scan.json')) for label in ('before', 'after')}}
        (d / 'scan-gate.json').write_text(json.dumps(proof, indent=2) + '\n')
print('Caddy x/net ' + phase + ' passed; no production activation')
