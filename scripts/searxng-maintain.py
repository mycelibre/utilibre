#!/usr/bin/env python3
"""Guarded SearXNG-only updates. Default: check, never deploy.

Requires Python 3, Docker Compose v2+, Node and the portal's Playwright install.
--stage tests a private candidate; --apply also updates only SearXNG.
No Docker socket is mounted into an application. No other service is upgraded.
"""
from __future__ import annotations

import argparse
import copy
from datetime import datetime, timezone
from email.message import EmailMessage
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import signal
import smtplib
import socket
import ssl
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'docker.io/searxng/searxng'
DIGEST = re.compile(r'^sha256:[0-9a-f]{64}$')
PIN = re.compile(r'^(?:docker\.io/)?searxng/searxng(?::[A-Za-z0-9_.-]+)?@sha256:[0-9a-f]{64}$')
STATE = Path('/var/lib/utilibre-searx-updater')
PUBLIC = Path('/opt/utilibre/update-public')
REGISTRY = 'https://registry-1.docker.io/v2/searxng/searxng/'


def now():
    return datetime.now(timezone.utc).isoformat()


def command(args, *, input=None, timeout=180):
    env = os.environ.copy()
    # A caller's shell must not override the on-disk production image selection.
    env.pop('SEARXNG_IMAGE', None)
    result = subprocess.run(args, input=input, capture_output=True, text=True,
                            cwd=ROOT, env=env, timeout=timeout, check=False)
    if result.returncode:
        # Compose's expanded config contains secrets: never echo raw output.
        raise RuntimeError(f'{Path(args[0]).name} operation failed (exit {result.returncode})')
    return result.stdout.strip()


def compose(*args, override=None, timeout=180):
    call = ['docker', 'compose', '--env-file', str(ROOT / '.env'), '-f', str(ROOT / 'compose.yaml')]
    if override:
        call += ['-f', str(override)]
    return command(call + list(args), timeout=timeout)


def atomic_json(path, value, mode=0o600):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700 if mode == 0o600 else 0o755)
    fd, temporary = tempfile.mkstemp(prefix='.' + path.name + '-', dir=path.parent)
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, 'w') as output:
            json.dump(value, output, indent=2)
            output.write('\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def replace_image_setting(source, image):
    if not PIN.fullmatch(image):
        raise ValueError('Only immutable official SearXNG image references are permitted')
    lines = source.splitlines(keepends=True)
    matches = [i for i, line in enumerate(lines) if re.match(r'^\s*(?:export\s+)?SEARXNG_IMAGE\s*=', line)]
    if len(matches) > 1:
        raise ValueError('Duplicate SEARXNG_IMAGE settings; resolve manually')
    if matches:
        lines[matches[0]] = f'SEARXNG_IMAGE={image}\n'
    else:
        if lines and not lines[-1].endswith('\n'):
            lines[-1] += '\n'
        lines.append(f'SEARXNG_IMAGE={image}\n')
    return ''.join(lines)


def persist_image(image):
    path = ROOT / '.env'
    metadata = path.stat()
    if metadata.st_mode & 0o077 or path.is_symlink() or not stat.S_ISREG(metadata.st_mode):
        raise RuntimeError('.env must be a private regular file')
    before = path.read_bytes()
    after = replace_image_setting(before.decode(), image)
    fd, temporary = tempfile.mkstemp(prefix='.env-searx-update-', dir=ROOT)
    try:
        os.fchmod(fd, 0o600)
        os.fchown(fd, metadata.st_uid, metadata.st_gid)
        with os.fdopen(fd, 'w') as output:
            output.write(after)
            output.flush()
            os.fsync(output.fileno())
        if path.read_bytes() != before:
            raise RuntimeError('.env changed concurrently; refusing to overwrite it')
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def fetch_json(url, headers=None):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=30) as response:
        raw = response.read(8 * 1024 * 1024 + 1)
        if len(raw) > 8 * 1024 * 1024:
            raise RuntimeError('Registry response exceeded size limit')
        digest = response.headers.get('Docker-Content-Digest')
    if digest and (not DIGEST.fullmatch(digest) or digest != 'sha256:' + hashlib.sha256(raw).hexdigest()):
        raise RuntimeError('Registry manifest digest verification failed')
    return json.loads(raw), digest


def latest_image(architecture):
    token, _ = fetch_json('https://auth.docker.io/token?service=registry.docker.io&scope=repository:searxng/searxng:pull')
    headers = {'Authorization': 'Bearer ' + token['token'], 'Accept': ', '.join([
        'application/vnd.oci.image.index.v1+json',
        'application/vnd.docker.distribution.manifest.list.v2+json',
        'application/vnd.oci.image.manifest.v1+json',
        'application/vnd.docker.distribution.manifest.v2+json'])}
    manifest, digest = fetch_json(REGISTRY + 'manifests/latest', headers)
    if not digest:
        raise RuntimeError('Registry did not provide an immutable digest')
    if 'manifests' in manifest:
        choices = [m for m in manifest['manifests'] if m.get('platform', {}).get('os') == 'linux'
                   and m.get('platform', {}).get('architecture') == architecture]
        if len(choices) != 1 or not DIGEST.fullmatch(choices[0]['digest']):
            raise RuntimeError('No unique candidate for this server architecture')
        manifest, _ = fetch_json(REGISTRY + 'manifests/' + choices[0]['digest'], headers)
    config_digest = manifest['config']['digest']
    if not DIGEST.fullmatch(config_digest):
        raise RuntimeError('Invalid image configuration digest')
    configuration, _ = fetch_json(REGISTRY + 'blobs/' + config_digest, headers)
    labels = configuration.get('config', {}).get('Labels') or {}
    if labels.get('org.opencontainers.image.source') != 'https://github.com/searxng/searxng':
        raise RuntimeError('Unexpected upstream image source')
    if labels.get('org.opencontainers.image.licenses') != 'AGPL-3.0-or-later':
        raise RuntimeError('Upstream licensing changed; manual review required')
    revision = labels.get('org.opencontainers.image.revision', '')
    version = labels.get('org.opencontainers.image.version', '')
    if not re.fullmatch(r'[0-9a-f]{40}', revision) or not re.fullmatch(r'\d{4}\.\d{1,2}\.\d{1,2}-[0-9a-f]+', version):
        raise RuntimeError('Unexpected version format; manual review required')
    return {'image': REPOSITORY + ':' + version + '@' + digest, 'version': version,
            'revision': revision, 'created': configuration['created']}


def configuration():
    result = json.loads(compose('config', '--format', 'json'))
    service = result['services']['searxng']
    if not PIN.fullmatch(service['image']):
        raise RuntimeError('Production must use an immutable official SearXNG image')
    if '${SEARXNG_IMAGE:-' not in (ROOT / 'compose.yaml').read_text():
        raise RuntimeError('Compose must support the SEARXNG_IMAGE override')
    return result


def container_id():
    value = compose('ps', '-q', 'searxng')
    if not re.fullmatch(r'[0-9a-f]{12,64}', value):
        raise RuntimeError('Expected exactly one running SearXNG container')
    return value


def running_image():
    return command(['docker', 'inspect', '--format', '{{.Config.Image}}', container_id()])


def pending_age(previous, candidate):
    """Track the oldest observed outstanding update, even if latest changes daily."""
    path = STATE / 'outstanding.json'
    if previous.split('@')[1] == candidate['image'].split('@')[1]:
        path.unlink(missing_ok=True)
        return {'outstandingDays': 0}
    data = json.loads(path.read_text()) if path.exists() else {'firstSeen': now()}
    data.update(previousImage=previous, latestImage=candidate['image'])
    atomic_json(path, data)
    age = max(0, (datetime.now(timezone.utc) - datetime.fromisoformat(data['firstSeen'])).total_seconds() / 86400)
    return {'outstandingDays': round(age, 2), 'updateDeadline': 'overdue' if age >= 7 else 'urgent' if age >= 5 else 'within-window'}


def wait_healthy(container, timeout=150):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        state = json.loads(command(['docker', 'inspect', '--format', '{{json .State}}', container]))
        if not state.get('Running'):
            raise RuntimeError('SearXNG stopped during startup')
        if state.get('Health', {}).get('Status') == 'healthy':
            return
        time.sleep(3)
    raise RuntimeError('SearXNG did not become healthy before the deadline')


def browser_check(base, edge=None):
    command(['node', str(ROOT / 'scripts/check-searxng-browser.mjs'), base] + ([edge] if edge else []), timeout=150)


def check_local_policy():
    for name in ['test-searx-pagination-config.py', 'test-searx-redaction.py']:
        command([sys.executable, str(ROOT / 'scripts' / name)])


def stage_candidate(config, candidate, run_dir):
    project = 'utilibre-searx-test-' + secrets.token_hex(6)
    search = copy.deepcopy(config['services']['searxng'])
    cache = copy.deepcopy(config['services']['valkey'])
    for service in [search, cache]:
        for key in ['container_name', 'depends_on', 'networks', 'ports', 'profiles', 'labels', 'volumes']:
            service.pop(key, None)
        service['restart'] = 'no'
        service['logging'] = {'driver': 'none'}
    search['image'] = candidate['image']
    search['environment']['SEARXNG_SECRET'] = secrets.token_urlsafe(48)
    search['ports'] = [{'target': 8080, 'published': '0', 'host_ip': '127.0.0.1', 'protocol': 'tcp'}]
    search['volumes'] = [
        {'type': 'bind', 'source': str(ROOT / 'config/searxng'), 'target': '/etc/searxng', 'read_only': True},
        {'type': 'volume', 'source': 'candidate-cache', 'target': '/var/cache/searxng'}]
    search['depends_on'] = {'valkey': {'condition': 'service_healthy'}}
    plan = run_dir / 'candidate.json'
    atomic_json(plan, {'name': project, 'services': {'searxng': search, 'valkey': cache}, 'volumes': {'candidate-cache': {}}})
    call = ['docker', 'compose', '-p', project, '-f', str(plan)]
    try:
        command(call + ['up', '-d'], timeout=240)
        container = command(call + ['ps', '-q', 'searxng'])
        wait_healthy(container)
        port = command(call + ['port', 'searxng', '8080'])
        if not re.fullmatch(r'127\.0\.0\.1:\d+', port):
            raise RuntimeError('Candidate must only listen on loopback')
        browser_check('http://' + port + '/')
    finally:
        # Only the randomly named disposable project and its cache volume.
        command(call + ['down', '--volumes', '--remove-orphans'], timeout=120)
        plan.unlink(missing_ok=True)  # Contains a disposable secret; not production credentials.


def apply_pin(image, run_dir):
    override = run_dir / 'image.json'
    atomic_json(override, {'services': {'searxng': {'image': image}}})
    compose('up', '-d', '--no-deps', '--pull', 'never', 'searxng', override=override, timeout=240)
    wait_healthy(container_id())


def backup_config(config, run_dir):
    archive = run_dir / 'rollback-config.tar.gz'
    with tarfile.open(archive, 'x:gz') as output:
        for name in ['compose.yaml', '.env', 'config/searxng']:
            output.add(ROOT / name, arcname=name)
    archive.chmod(0o600)
    # Verify archive readability before any production mutation.
    with tarfile.open(archive, 'r:gz') as source:
        if not {'.env', 'compose.yaml', 'config/searxng/settings.yml'}.issubset(source.getnames()):
            raise RuntimeError('Configuration backup failed validation')
        for member in source.getmembers():
            if member.isfile():
                with source.extractfile(member) as data:
                    while data.read(1024 * 1024):
                        pass
    atomic_json(run_dir / 'rollback.json', {'previousImage': config['services']['searxng']['image'], 'created': now()})


def notify(subject, body):
    # Connect to the operator-approved private relay, verify its real TLS name.
    class Relay(smtplib.SMTP):
        def _get_socket(self, host, port, timeout):
            return socket.create_connection(('10.10.1.20', port), timeout)
    message = EmailMessage()
    message['From'] = 'no-reply@utilibre.org'
    message['To'] = 'admin@utilibre.org'
    message['Subject'] = '[Utilibre SearXNG] ' + subject
    message.set_content(body)
    with Relay('mx.mailgt.dev', 26, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
        smtp.send_message(message)


def public_probe(base):
    try:
        request = urllib.request.Request(base, headers={'User-Agent': 'Utilibre-uptime-check/1.0'})
        with urllib.request.urlopen(request, timeout=12) as response:
            return 'reachable' if response.status == 200 else 'unexpected-status'
    except Exception:
        return 'unverified-from-this-VM'


def recover_interrupted(config):
    path = STATE / 'pending.json'
    if not path.exists():
        return
    pending = json.loads(path.read_text())
    current = config['services']['searxng']['image']
    if current not in [pending['previousImage'], pending['candidateImage']]:
        raise RuntimeError('Interrupted update conflicts with a manual image change; review pending.json')
    if running_image() not in [pending['previousImage'], pending['candidateImage']]:
        raise RuntimeError('Running container changed outside this updater; review pending.json')
    directory = Path(pending['runDirectory'])
    if directory.resolve().parent != STATE.resolve() or not directory.is_dir() or not PIN.fullmatch(pending['previousImage']):
        raise RuntimeError('Invalid interrupted-update journal')
    apply_pin(pending['previousImage'], directory)
    persist_image(pending['previousImage'])
    path.unlink()
    raise RuntimeError('Recovered an interrupted update to its previous image; review before retrying')


def deploy_candidate(previous, candidate, directory, base):
    journal = {'previousImage': previous, 'candidateImage': candidate['image'], 'runDirectory': str(directory)}
    atomic_json(STATE / 'pending.json', journal)
    try:
        apply_pin(candidate['image'], directory)
        browser_check(base, '10.10.1.3')
        persist_image(candidate['image'])
        PUBLIC.mkdir(parents=True, exist_ok=True)
        PUBLIC.chmod(0o755)
        atomic_json(PUBLIC / 'searxng.json', {**candidate, 'deployedAt': now(), 'verification': 'English/Spanish browser search through verified private-edge HTTPS'}, mode=0o644)
        (STATE / 'pending.json').unlink()
        (STATE / 'outstanding.json').unlink(missing_ok=True)
    except BaseException:
        # Keep the journal if rollback itself fails: the next apply must recover.
        apply_pin(previous, directory)
        persist_image(previous)
        browser_check(base, '10.10.1.3')
        (STATE / 'pending.json').unlink()
        raise RuntimeError('Candidate failed production verification; previous image restored and checked') from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true', help='Inspect upstream only (default)')
    mode.add_argument('--stage', action='store_true', help='Test a private candidate; leave production unchanged')
    mode.add_argument('--apply', action='store_true', help='Stage, update SearXNG only, verify, roll back on failure')
    parser.add_argument('--notify', action='store_true', help='Email updates, available versions, warnings and failures')
    parser.add_argument('--notify-test', action='store_true', help='Send one operator email and exit')
    options = parser.parse_args()
    os.umask(0o077)
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (STATE / 'lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SystemExit('Another SearXNG maintenance run is active')
        report = {'checkedAt': now(), 'mode': 'apply' if options.apply else 'stage' if options.stage else 'check'}
        try:
            if options.notify_test:
                notify('Notification test', 'The maintenance notifier reached the verified private SMTP relay. No containers were changed.')
                print('Notification test delivered to the SMTP relay.')
                return
            config = configuration()
            if (STATE / 'pending.json').exists():
                if options.apply:
                    recover_interrupted(config)
                raise RuntimeError('An interrupted update needs recovery with --apply; check/stage will not modify production')
            previous = config['services']['searxng']['image']
            if running_image() != previous:
                raise RuntimeError('Running image differs from the configured pin; reconcile before updating')
            architecture = command(['docker', 'info', '--format', '{{.Architecture}}'])
            architecture = {'x86_64': 'amd64', 'aarch64': 'arm64'}.get(architecture, architecture)
            candidate = latest_image(architecture)
            report.update(previousImage=previous, candidate=candidate)
            available = previous.split('@')[1] != candidate['image'].split('@')[1]
            report['status'] = 'update-available' if available else 'up-to-date'
            report.update(pending_age(previous, candidate))
            if options.stage or options.apply:
                check_local_policy()
                base = config['services']['searxng']['environment']['SEARXNG_BASE_URL']
                if base.rstrip('/') != 'https://search.utilibre.org':
                    raise RuntimeError('Unexpected production URL; review smoke-test routing')
                # Establish that the existing service works before changing it.
                browser_check(base, '10.10.1.3')
                if available or options.stage:
                    directory = Path(tempfile.mkdtemp(prefix='run-', dir=STATE))
                    command(['docker', 'pull', candidate['image']], timeout=600)
                    stage_candidate(config, candidate, directory)
                    report['status'] = 'candidate-tested'
                    if options.apply:
                        backup_config(config, directory)
                        deploy_candidate(previous, candidate, directory, base)
                        report['status'] = 'updated'
                        report['outstandingDays'] = 0
                        report.pop('updateDeadline', None)
                report['publicProbe'] = public_probe(base)
            atomic_json(STATE / 'last-run.json', report)
            print(json.dumps(report, indent=2))
            if options.notify and (report['status'] in ['updated', 'update-available'] or report.get('publicProbe') == 'unverified-from-this-VM'):
                notify(report['status'], json.dumps(report, indent=2) + '\nPublic-IP checks from this VM are not independent uptime evidence. Review failures promptly; target updates within 48 hours and never leave a newer build outstanding beyond one week.')
        except BaseException as error:
            report['status'] = 'failed'
            report['error'] = str(error) if isinstance(error, (RuntimeError, ValueError)) else type(error).__name__
            atomic_json(STATE / 'last-run.json', report)
            print(json.dumps(report, indent=2), file=sys.stderr)
            if options.notify:
                try:
                    notify('Maintenance needs attention', json.dumps(report, indent=2))
                except Exception:
                    print('Email notification also failed; check the service journal.', file=sys.stderr)
            raise SystemExit(1) from None


if __name__ == '__main__':
    def interrupted(signum, frame):
        raise RuntimeError('Maintenance interrupted; recoverable journal retained when needed')
    signal.signal(signal.SIGTERM, interrupted)
    main()
