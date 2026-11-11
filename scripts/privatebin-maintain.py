#!/usr/bin/env python3
"""Guarded PrivateBin updates; --check, --stage, --apply, or --reconcile-runtime.

Reuses the deployed security runtime, native configuration and existing browser
checks. No credentials, user content, migrations, notifications or LLM calls.
"""
import argparse
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import tarfile
import tempfile
import time
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
RECIPE = ROOT / 'deployment/utilibre/privatebin-updater'
CONFIG = ROOT / 'deployment/utilibre/config/privatebin'
PATCH = ROOT / 'deployment/utilibre/privatebin-discovery/homepage-template.patch'
STATE = Path('/var/lib/utilibre-privatebin-updater')
LIVE = Path('/opt/utilibre')
NAME = 'utilibre-services-privatebin-1'
SCANNER = Path('/opt/utilibre/maintenance/bin/trivy')
DB = Path('/var/cache/utilibre-security/db')
COMPOSE = ['docker', 'compose', '--project-directory', str(LIVE), '-p', 'utilibre-services', '-f', str(LIVE / 'compose.yaml')]
IMAGE = re.compile(r'^sha256:[a-f0-9]{64}$')
REV = re.compile(r'^[a-f0-9]{40}$')
EVIDENCE = Path('/var/lib/utilibre-maintenance')


class ReviewRequired(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise ReviewRequired(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat()


def save(path, value, mode=0o600):
    data = value if isinstance(value, bytes) else (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()
    fd, temporary = tempfile.mkstemp(prefix='.privatebin-', dir=path.parent)
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, 'wb') as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def command(args, *, cwd=ROOT, timeout=60, env=None, log=None):
    # Never inherit tokens/proxies/application secrets into a build or test.
    clean = {'PATH': os.environ['PATH'], 'LANG': 'C.UTF-8', 'HOME': '/root',
             'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null',
             'GIT_TERMINAL_PROMPT': '0', **(env or {})}
    with tempfile.TemporaryFile() as output:
        p = subprocess.Popen([str(x) for x in args], cwd=cwd, env=clean,
                             stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
        started = time.monotonic()
        try:
            while p.poll() is None:
                if time.monotonic() - started > timeout or output.tell() > 16 * 1024**2:
                    raise TimeoutError('Command exceeded time/output budget: ' + Path(args[0]).name)
                time.sleep(0.1)
        except BaseException:
            os.killpg(p.pid, signal.SIGTERM)
            try:
                p.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(p.pid, signal.SIGKILL)
                p.wait()
            raise
        finally:
            output.seek(0)
            data = output.read(16 * 1024**2)
            if log:
                save(log, data)
        if p.returncode:
            raise RuntimeError('Command failed: ' + Path(args[0]).name + '; inspect private report')
        return data.decode()


def get(url):
    # Fixed upstream endpoints only, no GitHub credential required.
    allowed = ('https://api.github.com/repos/PrivateBin/PrivateBin/',
               'https://codeload.github.com/PrivateBin/PrivateBin/')
    require(url.startswith(allowed), 'Unapproved download destination')
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            raise ReviewRequired('Unexpected upstream redirect')
    req = urllib.request.Request(url, headers={'User-Agent': 'Utilibre-PrivateBin-maintenance',
                                               'Accept': 'application/vnd.github+json'})
    with urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect).open(req, timeout=30) as response:
        data = response.read(32 * 1024**2 + 1)
    require(len(data) <= 32 * 1024**2, 'Download exceeds budget')
    return data


def version(value):
    require(isinstance(value, str) and re.fullmatch(r'\d+\.\d+\.\d+', value), 'Unsupported release version')
    return tuple(map(int, value.split('.')))


def decide(latest, current, policy):
    new, old = version(latest), version(current)
    require('.'.join(map(str, new[:2])) == policy['family'], 'New release family requires review')
    require(new >= version(policy['minimum']), 'Release predates security baseline')
    require(new >= old, 'Refusing downgrade')
    return 'up-to-date' if new == old else 'candidate'


def release():
    base = 'https://api.github.com/repos/PrivateBin/PrivateBin/'
    r = json.loads(get(base + 'releases/latest'))
    require(not r.get('draft') and not r.get('prerelease'), 'Not a stable release')
    v = r['tag_name']
    version(v)
    ref = json.loads(get(base + 'git/ref/tags/' + v))['object']
    require(ref['type'] == 'tag' and REV.fullmatch(ref['sha']), 'Expected signed annotated release tag')
    tag = json.loads(get(base + 'git/tags/' + ref['sha']))
    require(tag.get('verification', {}).get('verified') is True, 'Release tag signature is unverified')
    obj = tag['object']
    require(obj['type'] == 'commit' and REV.fullmatch(obj['sha']), 'Invalid release commit')
    return {'version': v, 'revision': obj['sha'], 'tagObject': ref['sha'],
            'tagVerification': 'GitHub verified signed annotated tag', 'publishedAt': r['published_at']}


def advisory_snapshot(policy):
    raw = json.loads(get('https://api.github.com/repos/PrivateBin/PrivateBin/security-advisories?state=published&per_page=100'))
    require(isinstance(raw, list) and len(raw) < 100, 'Incomplete application advisory coverage')
    rows = sorted([{'id': a['ghsa_id'], 'updated': a.get('updated_at') or a['published_at'],
                    'affected': [{'package': v.get('package', {}).get('name'),
                                  'range': v.get('vulnerable_version_range'), 'patched': v.get('patched_versions')}
                                 for v in a.get('vulnerabilities', [])]}
                   for a in raw if a.get('published_at') and not a.get('withdrawn_at')], key=lambda a: a['id'])
    digest = sha(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
    require(digest == policy['applicationAdvisorySnapshotSha256'],
            'New or changed published application advisory requires review')
    return digest


def extract(data, destination, revision):
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        members = archive.getmembers()
        require(len(members) < 10000 and sum(m.size for m in members) < 128 * 1024**2,
                'Source archive exceeds extraction budget')
        prefix = 'PrivateBin-' + revision + '/'
        for member in members:
            require(member.name == prefix[:-1] or member.name.startswith(prefix), 'Unexpected archive root')
            require('..' not in Path(member.name).parts and (member.isfile() or member.isdir()),
                    'Unsafe source archive member')
        archive.extractall(destination, filter='data')
    return destination / prefix[:-1]


def configuration(policy):
    for rel, digest in policy['configHashes'].items():
        require(not Path(rel).is_absolute() and '..' not in Path(rel).parts, 'Invalid config path')
        for directory in (CONFIG, LIVE / 'config/privatebin'):
            require(sha((directory / rel).read_bytes()) == digest, 'Configuration changed: ' + rel)


def inspect():
    # No full Docker configuration or environment enters reports.
    fmt = '{"image":{{json .Image}},"running":{{json .State.Running}},"health":{{json .State.Health.Status}},"readonly":{{json .HostConfig.ReadonlyRootfs}},"log":{{json .HostConfig.LogConfig.Type}}}'
    row = json.loads(command(['docker', 'inspect', '--format', fmt, NAME]))
    require(row['running'] and row['health'] == 'healthy' and row['readonly'] and row['log'] == 'none',
            'Live PrivateBin health or isolation changed')
    return row


def reconciliation_record(policy, installed, current, source, payload_hashes):
    """Explicit same-source transition only; routine updates never call this."""
    review = policy.get('reviewedRuntimeTransition', {})
    require(review.get('approved') is True, 'No approved runtime transition')
    require(IMAGE.fullmatch(current) and current == policy['runtimeImage'] == review.get('image'),
            'Runtime transition does not match the reviewed image')
    require(isinstance(installed, dict) and installed.get('image') in (review.get('previousImage'), current),
            'Installed receipt is not a reviewed predecessor')
    require(IMAGE.fullmatch(review.get('previousImage', '')), 'Invalid reviewed predecessor')
    for key in ('version', 'revision', 'archiveSha256'):
        require(installed.get(key) == source.get(key) == review.get(key) and source.get(key),
                'Runtime transition changed application source: ' + key)
    require(REV.fullmatch(source['revision']) and re.fullmatch(r'[a-f0-9]{64}', source['archiveSha256']),
            'Malformed application source identity')
    require(decide(source['version'], installed['version'], policy) == 'up-to-date',
            'Reconciliation cannot upgrade or downgrade the application')
    require(payload_hashes == review.get('payloadHashes'), 'Reviewed application payload mismatch')
    require(payload_hashes.keys() == {'/usr/share/doc/privatebin/utilibre-release.json',
                                     '/srv/tpl/bootstrap5-utilibre.php', '/srv/lib/Controller.php'},
            'Incomplete runtime payload verification')
    require(review.get('deployedAt') and datetime.fromisoformat(review['deployedAt'].replace('Z', '+00:00')).tzinfo,
            'Reviewed deployment date required')
    if installed['image'] == current:
        require(installed.get('runtimeImage') == current, 'Installed runtime receipt is inconsistent')
        return installed, False
    record = {key: source[key] for key in ('version', 'revision', 'archiveSha256',
                                          'publishedAt', 'tagObject', 'tagVerification')}
    record.update({'image': current, 'runtimeImage': current, 'deployedAt': review['deployedAt'],
                   'templatePatchSha256': policy['templatePatchSha256'], 'reconciledAt': now(),
                   'recordKind': 'reviewed-runtime-reconciliation',
                   'previousImage': installed['image'], 'runtimeReview': review})
    # Old scanner/test receipts remain in installed-before.json. They are not
    # reassigned to a different runtime or presented as fresh clearance.
    return record, True


def reconcile_runtime(policy, installed, current, run):
    review = policy.get('reviewedRuntimeTransition', {})
    proofs = review.get('evidence', {})
    require(proofs.keys() == {'native', 'deployment', 'runtimeBuild', 'runtimeConsumer', 'runtimeScan', 'sourceReplay'},
            'Missing runtime review evidence')
    for proof in proofs.values():
        rel = Path(proof['path'])
        require(not rel.is_absolute() and '..' not in rel.parts, 'Invalid evidence path')
        path = EVIDENCE / rel
        require(path.is_file() and path.stat().st_size <= 8 * 1024**2, 'Missing or oversized runtime evidence')
        require(sha(path.read_bytes()) == proof['sha256'], 'Runtime review evidence changed')
    source_raw = command(['docker', 'exec', NAME, 'cat', '/usr/share/doc/privatebin/utilibre-release.json'])
    source = json.loads(source_raw)
    paths = ['/usr/share/doc/privatebin/utilibre-release.json', '/srv/tpl/bootstrap5-utilibre.php', '/srv/lib/Controller.php']
    hashes = command(['docker', 'exec', NAME, 'sha256sum', *paths])
    payload_hashes = {line.split(None, 1)[1]: line.split(None, 1)[0] for line in hashes.splitlines()}
    record, changed = reconciliation_record(policy, installed, current, source, payload_hashes)
    require("const VERSION = '" + source['version'] + "'" in command(['docker', 'exec', NAME, 'cat', '/srv/lib/Controller.php']),
            'Application version does not match the source receipt')
    require(sha(PATCH.read_bytes()) == policy['templatePatchSha256'], 'Template patch changed')
    settings = json.loads(command(COMPOSE + ['config', '--format', 'json']))['services']['privatebin']
    require(command(['docker', 'image', 'inspect', '--format', '{{.Id}}', settings['image']]).strip() == current,
            'Compose/live mismatch')
    public_path = LIVE / 'update-public/privatebin.json'
    public = {key: record[key] for key in ('version', 'revision', 'image', 'deployedAt', 'archiveSha256')}
    if not changed:
        require(public_path.is_file() and json.loads(public_path.read_text()) == public,
                'Public installation receipt does not match the reconciled state')
        return False
    save(run / 'installed-before.json', installed)
    if public_path.exists():
        save(run / 'public-before.json', public_path.read_bytes())
    record['policySha256'] = sha((RECIPE / 'policy.json').read_bytes())
    save(run / 'reconciled.json', record)
    configuration(policy)
    require(inspect()['image'] == current, 'Live image changed during reconciliation')
    require(json.loads((STATE / 'installed.json').read_text()) == installed, 'Installed receipt changed concurrently')
    # A filesystem error must not leave the two receipts knowingly inconsistent.
    try:
        save(public_path, public, 0o644)
        save(STATE / 'installed.json', record)
    except BaseException:
        save(STATE / 'installed.json', installed)
        if (run / 'public-before.json').exists():
            save(public_path, (run / 'public-before.json').read_bytes(), 0o644)
        elif public_path.exists():
            public_path.unlink()
        raise
    return True


def reverse_compatibility_required(previous_version):
    # A reviewed runtime rebuild of 2.1.1 is not the historical 2.1.0 bootstrap.
    previous = version(previous_version)
    require(previous >= (2, 1, 0), 'Unreviewed bootstrap version')
    return previous != (2, 1, 0)


def findings(report):
    rows = report.get('Results')
    require(isinstance(rows, list) and rows, 'Missing scanner results')
    result, types = set(), set()
    for row in rows:
        require(isinstance(row.get('Packages'), list) and row['Packages'], 'Missing package extraction')
        types.add((row.get('Class'), row.get('Type')))
        require(isinstance(row.get('Vulnerabilities', []), list), 'Malformed findings')
        for v in row.get('Vulnerabilities', []):
            require(all(isinstance(v.get(k), str) and v[k] for k in
                        ('VulnerabilityID', 'PkgName', 'InstalledVersion', 'Severity')), 'Malformed finding')
            result.add(tuple([row.get('Type')] + [v.get(k, '') for k in
                       ('VulnerabilityID', 'PkgName', 'InstalledVersion', 'FixedVersion', 'Severity')]))
    require(('os-pkgs', 'alpine') in types and ('lang-pkgs', 'composer-vendor') in types,
            'Required Alpine/Composer coverage is absent')
    return result, types


def scan_pair(previous, candidate, run, policy):
    require(sha(SCANNER.read_bytes()) == policy['scannerSha256'], 'Scanner binary changed')
    cache = run / 'scan-cache'
    (cache / 'db').mkdir(parents=True)
    for name in ('metadata.json', 'trivy.db'):
        command(['cp', '--reflink=auto', DB / name, cache / 'db' / name])
    meta = json.loads((cache / 'db/metadata.json').read_text())
    age = time.time() - datetime.fromisoformat(meta['UpdatedAt'].replace('Z', '+00:00')).timestamp()
    require(-300 <= age <= policy['maxDatabaseAgeHours'] * 3600, 'Advisory database is stale')
    reports = []
    for name, image in [('before', previous), ('after', candidate)]:
        path = run / (name + '-scan.json')
        command(['unshare', '--net', '--', SCANNER, 'image', '--config', '/dev/null', '--ignorefile', '/dev/null',
                 '--cache-dir', cache, '--scanners', 'vuln', '--skip-db-update', '--skip-java-db-update',
                 '--skip-check-update', '--skip-version-check', '--skip-vex-repo-update', '--offline-scan',
                 '--timeout', '5m', '--format', 'json', '--list-all-pkgs', '--image-src', 'docker',
                 '--output', path, image], timeout=330, log=run / (name + '-scan.log'))
        reports.append(json.loads(path.read_text()))
    before, coverage = findings(reports[0])
    after, new_coverage = findings(reports[1])
    def runtime_packages(report):
        return sorted((r['Class'], r['Type'], p['Name'], p['Version'])
                      for r in report['Results'] if r['Type'] in ('alpine', 'composer-vendor')
                      for p in r['Packages'])
    require(runtime_packages(reports[0]) == runtime_packages(reports[1]),
            'Reviewed runtime/dependency package coverage changed')
    security = {'databaseUpdatedAt': meta['UpdatedAt'], 'databaseSha256': sha((cache / 'db/trivy.db').read_bytes()),
                'scannerSha256': policy['scannerSha256'], 'before': len(before), 'after': len(after),
                'newFindings': sorted(after - before), 'coverage': sorted(new_coverage)}
    save(run / 'security.json', security)
    require(coverage == new_coverage and not after - before, 'New vulnerability findings or coverage change require review')
    require(not any(v[-1] in ('HIGH', 'CRITICAL') for v in after), 'High/critical findings require review')
    # These are disposable copies, not the shared advisory database or evidence.
    shutil.rmtree(cache)
    return security


def prepare(upstream, previous, run, policy, previous_version):
    require(shutil.disk_usage(STATE).free >= policy['minimumFreeGiB'] * 1024**3, 'Insufficient preparation headroom')
    data = get('https://codeload.github.com/PrivateBin/PrivateBin/tar.gz/' + upstream['revision'])
    save(run / 'upstream.tar.gz', data)
    source = extract(data, run, upstream['revision'])
    source.rename(run / 'source')
    source = run / 'source'
    for name, digest in policy['sourceContracts'].items():
        require(sha((source / name).read_bytes()) == digest, 'Upstream contract requires review: ' + name)
    require(sha(PATCH.read_bytes()) == policy['templatePatchSha256'], 'Template patch changed')
    require("const VERSION = '" + upstream['version'] + "'" in (source / 'lib/Controller.php').read_text(),
            'Release source version mismatch')
    # git apply uses exact context and never resolves conflicts or fuzzily edits.
    command(['git', 'apply', '--check', PATCH], cwd=source)
    command(['git', 'apply', PATCH], cwd=source)
    (source / 'tpl/bootstrap5-utilibre.php').write_bytes((source / 'tpl/bootstrap5.php').read_bytes())
    # Native documented packaging setting; hash precondition covers entire file.
    index = (source / 'index.php').read_text()
    require(index.count("define('PATH', '');") == 1, 'Entrypoint contract changed')
    (source / 'index.php').write_text(index.replace("define('PATH', '');", "define('PATH', '/srv/');"))
    shutil.copytree(CONFIG, run / 'config')
    shutil.copyfile(source / 'tpl/bootstrap5-utilibre.php', run / 'config/bootstrap5-utilibre.php')
    record = {**upstream, 'archiveSha256': sha(data), 'runtimeImage': policy['runtimeImage'],
              'policySha256': sha((RECIPE / 'policy.json').read_bytes()),
              'templatePatchSha256': policy['templatePatchSha256'], 'preparedAt': now()}
    save(run / 'release.json', record, 0o644)
    shutil.copyfile(RECIPE / 'Dockerfile', run / 'Dockerfile')
    shutil.copyfile(RECIPE / 'policy.json', run / 'policy.json')
    command(['docker', 'tag', policy['runtimeImage'], 'utilibre-privatebin:reviewed-update-runtime'])
    require(command(['docker', 'image', 'inspect', '--format', '{{.Id}}', 'utilibre-privatebin:reviewed-update-runtime']).strip() == policy['runtimeImage'], 'Runtime drift')
    tag = 'utilibre-privatebin:' + upstream['version'] + '-' + upstream['revision'][:12]
    command(['docker', 'build', '--network=none', '--pull=false', '-t', tag, run], timeout=300, log=run / 'build.log')
    candidate = command(['docker', 'image', 'inspect', '--format', '{{.Id}}', tag]).strip()
    require(IMAGE.fullmatch(candidate), 'Invalid built image identity')
    record.update({'image': candidate, 'tag': tag})
    # Prove native runtime package bytes were not downgraded by the app upgrade.
    def packages(image):
        return command(['docker', 'run', '--rm', '--network=none', '--read-only', '--cap-drop=ALL',
                        '--security-opt=no-new-privileges', '--memory=128m', '--pids-limit=32',
                        '--log-driver=none', '--entrypoint=/bin/cat', image, '/lib/apk/db/installed'])
    require(packages(candidate) == packages(policy['runtimeImage']), 'Runtime package inventory changed')
    record['security'] = scan_pair(previous, candidate, run, policy)
    reverse_required = reverse_compatibility_required(previous_version)
    env = {'PRIVATEBIN_TEST_IMAGE': candidate, 'PRIVATEBIN_TEST_CONFIG': str(run / 'config'),
           'PRIVATEBIN_PREVIOUS_IMAGE': previous, 'PRIVATEBIN_PREVIOUS_CONFIG': str(LIVE / 'config/privatebin'),
           'PRIVATEBIN_ROLLBACK_COMPAT_REQUIRED': '1' if reverse_required else '0'}
    # For subsequent upgrades use the previous image's baked template, never the
    # historical 2.1.0 bind-mount template retained on disk for rollback.
    if reverse_required:
        shutil.copytree(CONFIG, run / 'previous-config')
        cid = command(['docker', 'create', previous]).strip()
        try:
            command(['docker', 'cp', cid + ':/srv/tpl/bootstrap5-utilibre.php', run / 'previous-config/bootstrap5-utilibre.php'])
        finally:
            command(['docker', 'rm', cid])
        env['PRIVATEBIN_PREVIOUS_CONFIG'] = str(run / 'previous-config')
    for name in ['deployment/utilibre/tests/check-privatebin-uploads.mjs',
                 'deployment/utilibre/tests/check-privatebin-upgrade.mjs',
                 'deployment/utilibre/privatebin-discovery/check.mjs']:
        command(['node', ROOT / name], timeout=480, env=env, log=run / (Path(name).stem + '.log'))
    record['testsPassedAt'] = now()
    save(run / 'candidate.json', record)
    return record


def replace_compose(text, old, new):
    require(IMAGE.fullmatch(new), 'Candidate must be an immutable local image ID')
    match = re.search(r'(?ms)^  privatebin:\n.*?(?=^  [a-zA-Z]|^networks:|\Z)', text)
    require(match, 'PrivateBin service block missing')
    block = match.group()
    require(block.count('    image: ' + old + '\n') == 1, 'Compose source pin changed')
    block = block.replace('    image: ' + old + '\n', '    image: ' + new + '\n')
    block = block.replace('      - ./config/privatebin/bootstrap5-utilibre.php:/srv/tpl/bootstrap5-utilibre.php:ro\n', '')
    return text[:match.start()] + block + text[match.end():]


def health(image):
    for _ in range(75):
        try:
            require(inspect()['image'] == image, 'Wrong running image')
            return
        except ReviewRequired:
            time.sleep(1)
    raise RuntimeError('PrivateBin exact-image health gate failed')


def deploy(record, previous, run, policy):
    configuration(policy)
    require(inspect()['image'] == previous, 'Live image changed while preparing')
    settings = json.loads(command(COMPOSE + ['config', '--format', 'json']))['services']['privatebin']
    require(command(['docker', 'image', 'inspect', '--format', '{{.Id}}', settings['image']]).strip() == previous, 'Compose/live mismatch')
    paths = [LIVE / 'compose.yaml', ROOT / 'deployment/utilibre/compose.yaml']
    old = {str(p): p.read_text() for p in paths}
    new = {p: replace_compose(text, settings['image'], record['image']) for p, text in old.items()}
    journal = {'previous': previous, 'candidate': record['image'], 'files': old, 'run': str(run)}
    save(run / 'rollback.json', journal)
    save(STATE / 'pending.json', journal)
    try:
        for path in paths:
            require(path.read_text() == old[str(path)], 'Concurrent Compose edit')
            save(path, new[str(path)].encode(), path.stat().st_mode & 0o777)
        after = json.loads(command(COMPOSE + ['config', '--format', 'json']))['services']['privatebin']
        # Only image and removal of the old custom-template mount may differ.
        allowed = dict(settings)
        allowed['image'] = record['image']
        allowed['volumes'] = [v for v in allowed['volumes'] if v['target'] != '/srv/tpl/bootstrap5-utilibre.php']
        require(after == allowed, 'Unexpected deployment configuration change')
        command(COMPOSE + ['up', '-d', '--no-deps', '--pull', 'never', 'privatebin'], timeout=180, log=run / 'activate.log')
        health(record['image'])
        # Existing bounded public test: one synthetic upload, deleted in finally.
        command(['node', ROOT / 'deployment/utilibre/tests/check-privatebin-uploads.mjs', '--public'],
                timeout=480, env={'PRIVATEBIN_TEST_IMAGE': record['image']}, log=run / 'public-check.log')
    except BaseException:
        for path in paths:
            require(path.read_text() in (old[str(path)], new[str(path)]), 'Concurrent edit; manual rollback required')
            save(path, old[str(path)].encode(), path.stat().st_mode & 0o777)
        command(COMPOSE + ['up', '-d', '--no-deps', '--pull', 'never', 'privatebin'], timeout=180, log=run / 'rollback.log')
        health(previous)
        (STATE / 'pending.json').unlink()
        raise
    record['deployedAt'] = now()
    save(STATE / 'installed.json', record)
    save(run / 'installed.json', record)
    public = {k: record[k] for k in ['version', 'revision', 'image', 'deployedAt', 'archiveSha256']}
    save(LIVE / 'update-public/privatebin.json', public, 0o644)
    (STATE / 'pending.json').unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    for option in ('check', 'stage', 'apply', 'reconcile-runtime'):
        mode.add_argument('--' + option, action='store_true')
    args = parser.parse_args()
    selected = 'reconcile-runtime' if args.reconcile_runtime else 'apply' if args.apply else 'stage' if args.stage else 'check'
    def interrupted(_signal, _frame):
        raise InterruptedError('Updater interrupted; inspect receipt and pending journal')
    signal.signal(signal.SIGTERM, interrupted)
    os.umask(0o077)
    STATE.mkdir(exist_ok=True, mode=0o700)
    with (STATE / 'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        report = {'mode': '--' + selected, 'startedAt': now(), 'status': 'failed'}
        run = Path(tempfile.mkdtemp(prefix='run-', dir=STATE))
        report['evidence'] = str(run)
        try:
            require(not (STATE / 'pending.json').exists(), 'Interrupted deployment needs recovery review')
            policy = json.loads((RECIPE / 'policy.json').read_text())
            require(policy.get('schemaVersion') == 1 and policy.get('approved') is True, 'Policy is not approved')
            configuration(policy)
            previous = inspect()['image']
            installed = json.loads((STATE / 'installed.json').read_text()) if (STATE / 'installed.json').exists() else None
            if selected == 'reconcile-runtime':
                changed = reconcile_runtime(policy, installed, previous, run)
                report.update({'status': 'reconciled' if changed else 'already-reconciled',
                               'image': previous, 'applicationChanged': False, 'serviceRestarted': False,
                               'completedAt': now()})
                save(run / 'result.json', report)
                save(STATE / 'reconcile-runtime.json', report)
                print(json.dumps(report))
                return 0
            require(installed is not None or not policy.get('reviewedRuntimeTransition'),
                    'Installed receipt missing; recover the reviewed runtime record')
            require(previous == (installed['image'] if installed else policy['runtimeImage']), 'Unreviewed live image')
            current = installed['version'] if installed else policy['bootstrapVersion']
            upstream = release()
            report.update({'installed': current, 'latest': upstream['version'], 'revision': upstream['revision']})
            report['applicationAdvisorySnapshotSha256'] = advisory_snapshot(policy)
            decision = decide(upstream['version'], current, policy)
            if decision == 'up-to-date':
                require(installed['revision'] == upstream['revision'], 'Release tag moved; review required')
                report['status'] = 'up-to-date'
            elif selected == 'check':
                report['status'] = 'update-available'
            else:
                record = prepare(upstream, previous, run, policy, current)
                if selected == 'apply':
                    deploy(record, previous, run, policy)
                report['status'] = 'updated' if selected == 'apply' else 'staged'
                report['candidate'] = record['image']
        except ReviewRequired as error:
            report.update({'status': 'review-required', 'reason': str(error)})
        except Exception as error:
            report.update({'status': 'failed', 'reason': str(error)})
        report['completedAt'] = now()
        save(run / 'result.json', report)
        save(STATE / ('last-run.json' if selected == 'apply' else selected + '.json'), report)
        print(json.dumps(report))
        return 0 if report['status'] in ('up-to-date', 'updated', 'staged', 'update-available') else 1


if __name__ == '__main__':
    raise SystemExit(main())
