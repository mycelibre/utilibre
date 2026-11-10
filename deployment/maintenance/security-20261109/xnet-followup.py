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
assert len(sys.argv) == 3 and sys.argv[1] in ('safetwitch', 'galene', 'gothub', 'mezzo', 'anubis', 'oauth2-proxy', 'wakapi', 'opengist', 'ntfy', 'vikunja', 'donetick', 'ferretdb')
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
        if key in ('mezzo', 'anubis', 'oauth2-proxy', 'wakapi', 'opengist', 'ntfy', 'vikunja', 'donetick', 'ferretdb'):
            pins[spec['nativeFixture']] = spec['nativeFixtureSha256']
        if key == 'wakapi':
            pins['../go-leaf-final/check-wakapi-assets.py'] = spec['assetsFixtureSha256']
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
        if key in ('opengist', 'ntfy', 'vikunja'):
            script = (HERE / spec['nativeFixture']).resolve()
            assert sha(script) == spec['nativeFixtureSha256']
            adapters.append({'fixture': spec['nativeFixture'], 'fixtureSha256': sha(script),
                             'adapter': str(script), 'adapterSha256': sha(script), 'unmodified': True})
            for label, image in [('before', spec['base']), ('after', build['imageId'])]:
                execute([sys.executable, str(script), '--image-id', image, '--output', str(directory / (label + '-native.json'))],
                        directory / (label + '-native.log'), timeout=300, env={'PATH': os.environ['PATH']})
                result = read(directory / (label + '-native.json'))
                assert result['imageId'] == image
                fields = (['passed', 'blankRamOnlySqlite', 'twoNativeAccountsLogin',
                           'privateAnonymousAndOtherAccountDenied', 'createEditCommitsZip',
                           'privateGitClonePushReopen', 'gistsAndAccountsDeletedNatively'] if key == 'opengist' else
                          ['passed', 'networkIsolated', 'onlySyntheticData', 'anonymousPublishAndPoll',
                           'oneHourExpiry', 'noCacheHonoured', 'attachmentsDisabled',
                           'registrationDisabled', 'metricsDisabled', 'ramCacheClearedOnRestart'] if key == 'ntfy' else
                          ['passed', 'networkIsolated', 'onlySyntheticData', 'twoNativeAccounts',
                           'createCompleteTask', 'projectAndAttachmentIsolation', 'attachmentRoundTrip',
                           'exportPasswordRequired', 'nativeZipExportImport', 'importedProjectOwnedByRecipient',
                           'syntheticSqliteBackupRestore', 'reloadPreservesTaskAndAttachment', 'nativeProjectDeletion'])
                for field in fields:
                    assert result[field], field
                if key == 'ntfy':
                    assert result['configurationSha256'] == spec['configurationSha256']
                if key == 'vikunja':
                    assert result['configurationSourceSha256'] == spec['configurationSha256']
            for file, field in [('check-assets.py', 'assetsFixtureSha256'), ('extract-embed.py', 'embedExtractorSha256')]:
                assert sha(HERE / '../go-leaf-final' / file) == spec[field]
            execute([sys.executable, str(HERE / '../go-leaf-final/check-assets.py'), key, '--binary', str(directory / key), '--output', str(directory / 'assets.json')], directory / 'assets.log')
            assets = read(directory / 'assets.json')
            assert assets['passed'] and assets['binarySha256'] == build['binarySha256']
        elif key == 'donetick':
            script = adapt(spec['nativeFixture'], [
                ("root=pathlib.Path('/var/lib/utilibre-maintenance/security-20261028')/profile;s=next(s for s in json.loads((pathlib.Path('deployment/maintenance/security-20261028')/(profile+'-inputs.json')).read_text())['rows'] if s['key']==key)",
                 "root=pathlib.Path(" + repr(str(directory)) + ");s=next(s for s in json.loads(pathlib.Path(" + repr(str(HERE / 'xnet-inputs.json')) + ").read_text())['rows'] if s['key']==key)")])
            assert sha(HERE / '../../donetick/config.yaml') == spec['configurationSha256']
            for label, extra in [('before', ['--baseline']), ('after', [])]:
                execute([sys.executable, str(script), key, '--jose', *extra], directory / (label + '-native.log'), env={'PATH': os.environ['PATH']})
                result = read(directory / (key + ('-baseline' if label == 'before' else '-native') + '.json'))
                assert result['status'] == 'passed' and result['imageId'] == (spec['base'] if label == 'before' else build['imageId'])
                for field in ['twoFictionalAccounts', 'createReadDelete', 'crossAccountDenied', 'deletedAbsentFromList', 'anonymousDenied']:
                    assert result['checks'][field], field
            pins['../security-20261028/check-donetick-assets.py'] = spec['assetsFixtureSha256']
            asset_script = adapt('../security-20261028/check-donetick-assets.py', [
                ("root=Path('/var/lib/utilibre-maintenance/security-20261028/jose/donetick') if '--jose' in sys.argv else prior", "root=Path(" + repr(str(directory)) + ")"),
                ("old=(root/'output/before-donetick').read_bytes();new=(root/'output/donetick').read_bytes()", "old=(root/'donetick-original').read_bytes();new=(root/'donetick').read_bytes()")])
            execute([sys.executable, str(asset_script), '--jose'], directory / 'assets.log')
            assets = read(directory / 'assets.json'); assert assets['passed'] and len(assets['unchangedEmbeddedAssets']) == 254
        elif key == 'ferretdb':
            for file, checksum in spec['fixtureFiles'].items():
                assert sha(HERE.parents[2] / file) == checksum
            original = (HERE / spec['nativeFixture']).read_text()
            def line(prefix):
                matches = [x for x in original.splitlines() if x.startswith(prefix)]
                assert len(matches) == 1
                return matches[0]
            script = adapt(spec['nativeFixture'], [
                (line('const root='), 'const root=process.env.UTILIBRE_FIXTURE_ROOT;'),
                (line('const image='), 'const image=process.env.UTILIBRE_FIXTURE_IMAGE;'),
                (line('const pgImage='), 'const pgImage=' + json.dumps(spec['fixtureCompanionImages']['utilibre-gathio-postgres-1']) + ',appImage=' + json.dumps(spec['fixtureCompanionImages']['utilibre-gathio-gathio-1']) + ';')])
            for label, image in [('before', spec['base']), ('after', build['imageId'])]:
                dest = directory / label; dest.mkdir()
                execute(['node', str(script)], directory / (label + '-native.log'), timeout=360,
                        env={'PATH': os.environ['PATH'], 'UTILIBRE_FIXTURE_ROOT': str(dest), 'UTILIBRE_FIXTURE_IMAGE': image})
                result = read(dest / 'native.json'); assert result['imageId'] == image
                for field in ['passed', 'nativeGathioCreateEdit', 'invalidEditTokenDenied', 'imageUpload', 'icsImportExport', 'stoppedDatabaseCopyRestore', 'reopenedOriginalAndImportedEvents']:
                    assert result[field], field
        elif key == 'wakapi':
            script = adapt(spec['nativeFixture'], [
                ("IMAGE='utilibre-wakapi:jose-security-20261028'", "IMAGE=os.environ['UTILIBRE_TEST_IMAGE']"),
                ("OUT=Path('/var/lib/utilibre-maintenance/security-20261028/jose-leaf/wakapi/output/wakapi-native.json')", "OUT=Path(os.environ['UTILIBRE_TEST_OUTPUT'])")])
            for label, image in [('before', spec['base']), ('after', build['imageId'])]:
                assert not common.run(['docker', 'ps', '-aq', '--filter', 'name=^/maintenance-wakapi-native$']).strip()
                execute([sys.executable, str(script), '--jose'], directory / (label + '-native.log'),
                        env={'PATH': os.environ['PATH'], 'UTILIBRE_TEST_OUTPUT': str(directory / (label + '-native.json')), 'UTILIBRE_TEST_IMAGE': image})
                result = read(directory / (label + '-native.json'))
                assert result['imageId'] == image
                for field in ['passed', 'freshSqliteMigrations', 'nativeAccountLoginLogout',
                              'authenticatedHeartbeatAndAnonymousDenial', 'nativeHealthcheck']:
                    assert result[field], field
            assets_script = adapt('../go-leaf-final/check-wakapi-assets.py', [
                ('HERE = Path(__file__).resolve().parent', 'HERE = Path(' + repr(str((HERE / '../go-leaf-final').resolve())) + ')'),
                ("ROOT = Path('/var/lib/utilibre-maintenance/security-20261028/jose-leaf/wakapi/output')", 'ROOT = Path(' + repr(str(directory)) + ')'),
                ("current = next(s for s in json.loads((HERE/'../security-20261028/jose-leaf-inputs.json').read_text())['rows'] if s['key']=='wakapi')", 'current = ' + repr({'base': spec['base']}))])
            assert sha(HERE / '../go-leaf-final/extract-embed.py') == spec['embedExtractorSha256']
            execute([sys.executable, str(assets_script), '--jose'], directory / 'assets.log')
            assets = read(directory / 'wakapi-assets.json')
            assert assets['passed'] and assets['binarySha256'] == build['binarySha256']
            assert assets['baseImageId'] == spec['base'] and assets['unchangedEmbeddedFiles'] == 82
        elif key == 'oauth2-proxy':
            script = adapt(spec['nativeFixture'], [
                ("ROOT = Path('/var/lib/utilibre-maintenance/security-20261028/jose-leaf/oauth2-proxy/output')", "ROOT = Path(os.environ['UTILIBRE_TEST_OUTPUT'])"),
                ("IMAGE = 'utilibre-oauth2-proxy:jose-security-20261028'", "IMAGE = os.environ['UTILIBRE_TEST_IMAGE']")])
            for label, image in [('before', spec['base']), ('after', build['imageId'])]:
                assert not common.run(['docker', 'ps', '-aq', '--filter', 'name=^/maintenance-oauth-native$']).strip()
                output = directory / label
                output.mkdir()
                execute([sys.executable, str(script), '--jose'], directory / (label + '-native.log'),
                        env={'PATH': os.environ['PATH'], 'UTILIBRE_TEST_OUTPUT': str(output), 'UTILIBRE_TEST_IMAGE': image})
                result = read(output / 'oauth2-proxy-native.json')
                assert result['imageId'] == image
                for field in ['passed', 'nativeDiscoveryAuthorizationCodePkceAndSignedIdToken', 'authenticatedCookieAndIdentityHeader',
                              'invalidCsrfRejected', 'anonymousDeniedAndLogoutCleared', 'onlyLoopbackIssuer', 'networkIsolated']:
                    assert result[field], field
        elif key == 'anubis':
            fixture = HERE / spec['nativeFixture']
            code = fixture.read_text()
            launch = code[code.index(" docker('run','-d'"):code.index(' let ready=false;')]
            output = next(line for line in code.splitlines() if line.startswith(' await fs.writeFile(trust?'))
            script = adapt(spec['nativeFixture'], [
                (next(line for line in code.splitlines() if line.startswith('const closure=')), 'const closure=false,oct28=false,trust=false,before=false;assert.equal(process.argv.length,4);'),
                (next(line for line in code.splitlines() if line.startswith('const image=')), 'const image=process.argv[2];'),
                ("../../../portal/node_modules/playwright/index.mjs", '/home/ubuntu/freetools/portal/node_modules/playwright/index.mjs'),
                (launch, ''),
                (output, " await fs.writeFile(process.argv[3],JSON.stringify({...receipt,date:new Date().toISOString()},null,2)+'\\n',{mode:0o600,flag:'wx'});"),
                ("try{docker('rm','-f',name);}catch{}", '')])
            policy = HERE / '../go-leaf-final/anubis-native-policy.yaml'
            assert sha(policy) == spec['policySha256']
            for label, image in [('before', spec['base']), ('after', build['imageId'])]:
                name = 'maintenance-xnet-anubis-native-' + label
                try:
                    common.run(['docker', 'run', '-d', '--name', name, '--network', 'none', '--read-only',
                        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--log-driver', 'none',
                        '--memory', '128m', '--cpus', '.5', '-v', str(policy.resolve()) + ':/policy.yaml:ro', image,
                        '-bind', '127.0.0.1:33145', '-metrics-bind', '', '-policy-fname', '/policy.yaml',
                        '-target', 'http://127.0.0.1:33146', '-use-remote-address', '-slog-level', 'ERROR'])
                    pid = common.run(['docker', 'inspect', '--format', '{{.State.Pid}}', name]).strip()
                    execute(['nsenter', '-t', pid, '-n', 'node', str(script), image, str(directory / (label + '-native.json'))],
                            directory / (label + '-native.log'), timeout=180)
                    result = read(directory / (label + '-native.json'))
                    assert result['passed'] and result['imageId'] == image and result['nativeAllowAndDeny']
                    assert result['twoIndependentBrowserPowChallenges'] and result['authenticatedReload'] and result['externalBrowserCalls'] == 0
                finally:
                    subprocess.run(['docker', 'rm', '-f', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
            for file, field in [('check-assets.py', 'assetsFixtureSha256'), ('extract-embed.py', 'embedExtractorSha256')]:
                assert sha(HERE / '../go-leaf-final' / file) == spec[field]
            execute([sys.executable, str(HERE / '../go-leaf-final/check-assets.py'), 'anubis', '--binary', str(directory / key), '--output', str(directory / 'assets.json')], directory / 'assets.log')
            assets = read(directory / 'assets.json')
            assert assets['passed'] and assets['binarySha256'] == build['binarySha256']
        elif key == 'mezzo':
            script = adapt(spec['nativeFixture'], [
                ("ROOT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output')", 'ROOT = Path(' + repr(str(directory)) + ')'),
                ("IMAGES = ['sha256:f8643c2525c96b3c5708bb737f71759bfc4c01a745301a8a7dbcba609f9c6416',\n          'utilibre-mezzo:1.4.0-go-security-20261011']", 'IMAGES = ' + repr([spec['base'], build['imageId']]))])
            execute([sys.executable, str(script)], directory / 'native.log')
            result = read(directory / 'mezzo-native.json')
            assert result['passed'] and result['imageId'] == build['imageId']
            assert len(result['checks']) == 2
            assert result['checks'][0]['staticAssets'] == result['checks'][1]['staticAssets']
        elif key != 'galene':
            original_alias = 'reader-evaluation-safetwitch-backend' if key == 'safetwitch' else 'reader-evaluation-gothub'
            script = adapt('../go-final/check-native.mjs', [
                ('/var/lib/utilibre-maintenance/security-20261109/musl', str(ROOT)),
                (f"{key}:'{original_alias}'", f"{key}:'{key}'")])
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
