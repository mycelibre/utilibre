#!/usr/bin/env python3
"""Exact example-only removal, native isolated app gate, and actual scanner check."""
import base64, hashlib, io, json, os, pathlib, secrets, shutil, subprocess, tarfile, time, urllib.request

os.umask(0o077)
HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path('/var/lib/utilibre-maintenance/projects-redis-final-20261012')
OUT.mkdir(mode=0o700, exist_ok=True)
BASE = 'utilibre-projects:455aa274-npm1121-security-20261011'
BASE_ID = 'sha256:6241eed79c9e9802ab7069dd34002a106771f1a169799b479709d7f3fd5acd8f'
CANDIDATE = 'utilibre-projects:455aa274-redis-example-security-20261012'
PREFIX = '/app/node_modules/redis/heroku/'
NETWORK = 'maintenance-projects-redis'
DB = NETWORK + '-db'
APP = NETWORK + '-app'

def command(args, *, data=None, timeout=60):
    p = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if p.returncode:
        if args[-2:] == ['node', '-']:
            (OUT / 'native-failure.txt').write_bytes(p.stderr)
        raise RuntimeError('Bounded Projects package/native check failed; command output withheld')
    return p.stdout

def docker(*args, **kwargs):
    return command(['docker', *args], **kwargs)

def floor():
    assert shutil.disk_usage('/').free >= 8 * 1024**3, '8 GiB disk floor'

def inventory(image):
    cid = docker('create', '--entrypoint', '/bin/true', image).decode().strip()
    try:
        process = subprocess.Popen(['docker', 'export', cid], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        result = {}
        with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
            for entry in archive:
                name = '/' + entry.name.lstrip('./')
                if name in ['/etc/hosts', '/etc/hostname', '/etc/resolv.conf']:
                    continue
                if entry.isfile():
                    h = hashlib.sha256()
                    source = archive.extractfile(entry)
                    while chunk := source.read(1024**2):
                        h.update(chunk)
                    result[name] = h.hexdigest()
                elif entry.issym() or entry.islnk():
                    result[name] = 'link:' + entry.linkname
        assert process.wait() == 0
        return result
    finally:
        docker('rm', '-v', cid)

floor()
assert docker('image', 'inspect', '--format', '{{.Id}}', BASE).decode().strip() == BASE_ID
assert docker('inspect', '--format', '{{.Image}}', 'utilibre-projects-app-1').decode().strip() == BASE_ID
before = inventory(BASE)
with urllib.request.urlopen('https://registry.npmjs.org/redis/-/redis-3.1.1.tgz', timeout=20) as response:
    archive_bytes = response.read(2 * 1024**2)
assert base64.b64encode(hashlib.sha512(archive_bytes).digest()).decode() == 'QhkKhOuzhogR1NDJfBD34TQJz2ZJwDhhIC6ZmvpftlmfYShHHQXjjNspAJ+Z2HH5NwSBVYBVganbiZ8bgFMHjg=='
vendor_files = {}
with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode='r:gz') as archive:
    for entry in archive:
        if entry.isfile():
            rel = entry.name.removeprefix('package/')
            assert not rel.startswith('/') and '..' not in pathlib.PurePosixPath(rel).parts
            vendor_files['/app/node_modules/redis/' + rel] = hashlib.sha256(archive.extractfile(entry).read()).hexdigest()
assert len(vendor_files) == 60
assert all(before.get(name) == digest for name, digest in vendor_files.items()), 'Redis bytes differ from pinned vendor package'
removed = [name for name in before if name.startswith(PREFIX)]
assert len(removed) == 45
docker('build', '--network', 'none', '--build-arg', 'BASE_IMAGE=' + BASE, '-f', str(HERE / 'Dockerfile'), '-t', CANDIDATE, str(HERE), timeout=120)
assert docker('image', 'inspect', '--format', '{{.Id}}', BASE).decode().strip() == BASE_ID
image_id = docker('image', 'inspect', '--format', '{{.Id}}', CANDIDATE).decode().strip()
after = inventory(CANDIDATE)
assert {name: digest for name, digest in before.items() if not name.startswith(PREFIX)} == after, 'Changes outside Heroku example'
floor()
created = []
try:
    assert not docker('network', 'ls', '--filter', 'name=^' + NETWORK + '$', '--format', '{{.Name}}').strip()
    docker('network', 'create', '--internal', NETWORK)
    created.append(('network', NETWORK))
    for name in [DB, APP]:
        assert not docker('ps', '-aq', '--filter', 'name=^/' + name + '$').strip()
    password = secrets.token_hex(24)
    common = ['--network', NETWORK, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--log-driver', 'none', '--cpus', '1', '--pids-limit', '96']
    docker('run', '-d', '--name', DB, *common, '--user', '70:70', '--memory', '256m', '-e', 'POSTGRES_USER=fixture', '-e', 'POSTGRES_DB=fixture', '-e', 'POSTGRES_PASSWORD=' + password, '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,nodev,size=128m,uid=70,gid=70', '--tmpfs', '/var/run/postgresql:rw,nosuid,nodev,size=16m,uid=70,gid=70', '--tmpfs', '/tmp:rw,nosuid,nodev,size=16m', 'utilibre-postgres:16.15-alpine-gosu-security-20261011-p2')
    created.append(('container', DB))
    for _ in range(40):
        try:
            docker('exec', DB, 'pg_isready', '-U', 'fixture', '-d', 'fixture')
            break
        except RuntimeError:
            time.sleep(1)
    else:
        raise RuntimeError('Synthetic PostgreSQL did not become ready')
    docker('run', '-d', '--name', APP, *common, '--user', '1000:1000', '--memory', '512m', '-e', f'DATABASE_URL=postgresql://fixture:{password}@{DB}:5432/fixture', '-e', 'SECRET_KEY=' + secrets.token_hex(32), '-e', 'BASE_URL=http://127.0.0.1:1337', '-e', 'OIDC_ENFORCED=false', '-e', 'OIDC_ISSUER=', '-e', 'OIDC_CLIENT_ID=', '-e', 'OIDC_CLIENT_SECRET=', '-e', 'DEFAULT_ADMIN_EMAIL=projects-check@example.invalid', '-e', 'DEFAULT_ADMIN_PASSWORD=' + password, '-e', 'DEFAULT_ADMIN_NAME=Fictional Check', '-e', 'DEFAULT_ADMIN_USERNAME=fictional', '-e', 'LOG_FILE=/dev/null', '-e', 'WEBHOOKS=[]', '--tmpfs', '/app/logs:rw,nosuid,nodev,size=16m,uid=1000,gid=1000', '--tmpfs', '/app/.tmp:rw,nosuid,nodev,size=32m,uid=1000,gid=1000', '--tmpfs', '/app/attachments:rw,nosuid,nodev,size=16m,uid=1000,gid=1000', '--tmpfs', '/app/public/user-avatars:rw,nosuid,nodev,size=16m,uid=1000,gid=1000', '--tmpfs', '/app/public/project-background-images:rw,nosuid,nodev,size=16m,uid=1000,gid=1000', '--tmpfs', '/tmp:rw,nosuid,nodev,size=32m,mode=1777', CANDIDATE)
    created.append(('container', APP))
    for _ in range(60):
        try:
            docker('exec', APP, 'node', './healthcheck.js')
            break
        except RuntimeError:
            time.sleep(1)
    else:
        raise RuntimeError('Synthetic Projects app did not become ready')
    native = json.loads(docker('exec', '-i', APP, 'node', '-', data=(HERE / 'native.cjs').read_bytes()))
    assert native['passed']
finally:
    for kind, name in reversed(created):
        docker('rm', '-f', '-v', name) if kind == 'container' else docker('network', 'rm', name)
floor()
command(['/opt/utilibre/maintenance/bin/trivy', 'image', '--disable-telemetry', '--cache-dir', '/var/cache/utilibre-security', '--cache-backend', 'memory', '--scanners', 'vuln', '--offline-scan', '--skip-db-update', '--skip-java-db-update', '--parallel', '1', '--timeout', '3m', '--no-progress', '--list-all-pkgs', '--format', 'json', '--image-src', 'docker', '--output', str(OUT / 'scan.json'), image_id], timeout=210)
scan = json.loads((OUT / 'scan.json').read_text())
findings = [v for r in scan.get('Results', []) for v in r.get('Vulnerabilities', [])]
assert not any(v['VulnerabilityID'] == 'CVE-2021-29469' and v['PkgName'] == 'redis' for v in findings)
result = {'status': 'passed', 'completedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'baseId': BASE_ID, 'candidate': CANDIDATE, 'imageId': image_id, 'removedPath': PREFIX, 'removedFiles': len(removed), 'allOtherImageFilesUnchanged': True, 'unchangedFiles': len(after), 'vendorTarballSha512': hashlib.sha512(archive_bytes).hexdigest(), 'allSixtyVendorFilesMatchedBeforeRemoval': True, 'native': native, 'redisFindingAbsentFromActualCandidateScan': True, 'remainingRawSeverityCounts': {s: sum(v['Severity'] == s for v in findings) for s in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']}, 'productionChanged': False, 'limits': 'Isolated native password fixture, not a new live OIDC/MFA test. No production configuration or data changed; live Redis option is unset.'}
(OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
