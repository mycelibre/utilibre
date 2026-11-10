"""Finite binary-only preparation using existing offline build/native fixtures."""
import collections
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
ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/xnet')
loader = importlib.util.spec_from_file_location('image_scope', HERE / 'zlib-check.py')
common = importlib.util.module_from_spec(loader)
loader.loader.exec_module(common)
sha = lambda p: common.sha(Path(p).read_bytes())
read = lambda p: json.loads(Path(p).read_text())
assert len(sys.argv) == 3 and sys.argv[1] in ('safetwitch', 'galene')
key, phase = sys.argv[1:]
assert phase in ('stage', 'native', 'scan')
manifest = read(HERE / 'xnet-inputs.json')
spec = next(s for s in manifest['rows'] if s['key'] == key)
directory = ROOT / key
compiled = read(directory / 'compiled.json')
assert compiled['passed'] and compiled['base'] == spec['base']
assert sha(directory / key) == compiled['binarySha256']
assert sha(directory / 'source-proof.json') == spec['sourceProofSha256']
assert os.statvfs(ROOT).f_bavail * os.statvfs(ROOT).f_frsize >= manifest['execution']['minimumFreeBytes']

def execute(args, log, timeout=240, env=None):
    with log.open('x') as output:
        subprocess.run(args, stdout=output, stderr=output, timeout=timeout, check=True,
                       env=env, preexec_fn=lambda: os.umask(0o022))

def write(name, value):
    path = directory / name
    assert not path.exists(), 'Preserve completed evidence: ' + str(path)
    path.write_text(json.dumps(value, indent=2) + '\n')

if phase == 'stage':
    before = common.export_manifest(spec['base'])
    path = spec['binary'].lstrip('/')
    old = before[path]
    assert old['sha256'] == spec['oldBinarySha256'] and old['type'] == '0'
    stage = directory / 'image'
    stage.mkdir()
    shutil.copyfile(directory / key, stage / 'binary')
    (stage / 'binary').chmod(old['mode'])
    (stage / 'Dockerfile').write_text('FROM ' + spec['base'] + '\nCOPY --chown=' +
        str(old['uid']) + ':' + str(old['gid']) + ' binary ' + spec['binary'] + '\n')
    execute(['docker', 'build', '--network', 'none', '--pull=false', '-t', spec['candidate'], str(stage)],
            directory / 'image-build.log', env={**os.environ, 'DOCKER_BUILDKIT': '0'})
    base, new = [json.loads(common.run(['docker', 'image', 'inspect', i]))[0]
                 for i in [spec['base'], spec['candidate']]]
    assert base['Config'] == new['Config']
    after = common.export_manifest(new['Id'])
    changed = sorted(p for p in before.keys() | after.keys() if before.get(p) != after.get(p))
    assert changed == [path], changed
    assert after[path]['sha256'] == compiled['binarySha256']
    for field in ('type', 'mode', 'uid', 'gid', 'link'):
        assert before[path][field] == after[path][field]
    write('build.json', {**compiled, 'imageId': new['Id'], 'configurationUnchanged': True,
          'changedFiles': [spec['binary']], 'allOtherFilesUnchanged': True,
          'imageEntries': len(after), 'scopeCheckerSha256': sha(__file__),
          'exporterSha256': sha(HERE / 'zlib-check.py'), 'deployed': False})
else:
    build = read(directory / 'build.json')
    assert build['scopeCheckerSha256'] == sha(__file__)
    if phase == 'native':
        pins = read(HERE / 'zlib-inputs.json')['consumerFixtureHashes']
        adapters = []
        def adapt(relative, replacements):
            original = (HERE / relative).resolve()
            assert sha(original) == pins[relative]
            code = original.read_text()
            for old, new in replacements:
                assert code.count(old) == 1, (relative, old)
                code = code.replace(old, new)
            output = directory / original.name
            assert not output.exists()
            output.write_text(code)
            adapters.append({'fixture': relative, 'fixtureSha256': sha(original),
                             'adapter': str(output), 'adapterSha256': sha(output)})
            return output
        if key == 'safetwitch':
            script = adapt('../go-final/check-native.mjs', [
                ('/var/lib/utilibre-maintenance/security-20261109/musl', str(ROOT)),
                ("safetwitch:'reader-evaluation-safetwitch-backend'", "safetwitch:'safetwitch'")])
            execute(['node', str(script), '--musl-nov9', key], directory / 'native.log')
            result = read(directory / 'application.json')
            assert result['passed'] and result['imageId'] == build['imageId']
            assert result['variants'][0] == result['variants'][1]
        else:
            child = adapt('../../pack/check-galene-lifecycle.mjs', [
                ('/var/lib/utilibre-maintenance/security-20261109/musl/pack-galene-galene/', str(directory) + '/'),
                ('../../portal/node_modules/playwright-core/index.mjs', '/home/ubuntu/freetools/portal/node_modules/playwright-core/index.mjs')])
            script = adapt('../go-final/check-galene.mjs', [
                (r'\/musl\/pack-galene-galene\/', r'\/xnet\/galene\/'),
                ('deployment/pack/check-galene-lifecycle.mjs', str(child))])
            for label, image in [('before', spec['base']), ('after', build['imageId'])]:
                output = directory / label
                output.mkdir()
                execute(['node', str(script), '--image-id', image, '--output', str(output)],
                        directory / (label + '-native.log'))
                result = read(output / 'galene-native.json')
                assert result['status'] == 'passed' and result['imageId'] == image
                assert result['isolatedTwoClientMedia'] and result['nativeScreenShareAndStop'] and result['guestRejoin']
        write('native.json', {'passed': True, 'base': spec['base'], 'imageId': build['imageId'],
            'adapters': adapters, 'fixtureScope': 'Only private evidence paths/import resolution adapted; native checks unchanged.',
            'network': 'internal; no upstream requests', 'productionChanged': False,
            'limitation': 'Linux/same-host fixtures; no real devices, public upstream content or restrictive-network relay verification.'})
    else:
        db = Path('/var/cache/utilibre-security/db/trivy.db')
        database = sha(db)
        for label, image in [('before', spec['base']), ('after', build['imageId'])]:
            execute(['unshare', '--net', '--', '/opt/utilibre/maintenance/bin/trivy', 'image',
                '--config', '/dev/null', '--ignorefile', '/dev/null', '--cache-dir', '/var/cache/utilibre-security',
                '--scanners', 'vuln', '--skip-db-update', '--skip-java-db-update', '--skip-check-update',
                '--skip-version-check', '--skip-vex-repo-update', '--disable-telemetry', '--offline-scan',
                '--timeout', '3m', '--image-src', 'docker', '--format', 'json', '--list-all-pkgs',
                '--output', str(directory / (label + '-scan.json')), image], directory / (label + '-scan.log'))
        assert sha(db) == database
        old, new = [read(directory / (label + '-scan.json')) for label in ('before', 'after')]
        assert old['Metadata']['ImageID'] == spec['base'] and new['Metadata']['ImageID'] == build['imageId']
        findings = lambda doc: {(v['VulnerabilityID'], v['PkgName'], v['InstalledVersion'], v['Severity'])
            for r in doc.get('Results', []) for v in r.get('Vulnerabilities', [])}
        before, after = findings(old), findings(new)
        assert any(f[0] == manifest['advisory'] for f in before)
        assert not any(f[0] == manifest['advisory'] for f in after)
        assert not any(f[3] in ('HIGH', 'CRITICAL') for f in after - before)
        assert any(p['Name'] == manifest['dependency'] and p['Version'] == manifest['version']
                   for r in new['Results'] for p in r.get('Packages', []))
        write('scan-gate.json', {'date': datetime.now(timezone.utc).isoformat(), 'passed': True,
            'base': spec['base'], 'imageId': build['imageId'], 'targetedFindingRemoved': True,
            'newHighCritical': 0, 'databaseSha256': database,
            'removedFindings': sorted(before - after), 'newFindings': sorted(after - before),
            'remainingCounts': dict(collections.Counter(f[3] for f in after)),
            'rawEvidence': {label: sha(directory / (label + '-scan.json')) for label in ('before', 'after')}})
print(key + ': ' + phase + ' passed; no production activation')
