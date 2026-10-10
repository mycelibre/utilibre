#!/usr/bin/env python3
"""Publish reviewed mail source offers, never runtime state or private config."""
from pathlib import Path
import argparse
import difflib
import hashlib
import io
import json
import re
import shutil
import subprocess
import tarfile
import tempfile

REPO = Path(__file__).resolve().parents[2]
PUBLIC = Path('/opt/utilibre/toolbox-public')
SPECS = {
    'newsletters': ('kill-the-newsletter-2.1.3', 'c2d7cf8f7d9927fd19a36ea9beaf0ced67afcefc', '2.1.3-p2 (web; SMTP/jobs p1)', 'MIT'),
    'addy': ('addy-1.7.3', '150983e3331e80bb72b619984dc5e3f5390ddb93', '1.7.3', 'AGPL-3.0-or-later (application); MIT (Docker recipe)'),
    'simplelogin': ('simplelogin-4.82.4', '995904d5bc08ff5f951ad794b9372cbeb04d5fb6', '4.82.4-p7', 'GNU AGPL version 3; version scope unconfirmed, conflicting MIT package metadata retained'),
}
# These are already public upstream development/test keys, not Utilibre keys.
# Omit key material even from fixtures; it is not needed to build the applications.
OMIT = {
    'addy': {'tests/keys/TestDkimSigningKey'},
    'simplelogin': {'local_data/dkim.key', 'local_data/jwtRS256.key', 'local_data/key.pem', 'local_data/private-pgp.asc'},
}
SECRET = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|-----BEGIN PGP PRIVATE KEY' + rb' BLOCK-----|(?:gh[pousr]_|cf[ua]t_)[A-Za-z0-9_-]{20,}')


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args])


def extract_pin(root, pin, destination, omit):
    assert git(root, 'rev-parse', 'HEAD').decode().strip() == pin
    destination.mkdir(parents=True)
    with tarfile.open(fileobj=io.BytesIO(git(root, 'archive', '--format=tar', pin))) as source:
        entries = []
        for member in source.getmembers():
            assert not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
            assert not member.issym() and not member.islnk(), member.name
            if member.name not in omit:
                entries.append(member)
        source.extractall(destination, members=entries, filter='data')


def apply_patch(destination, patch):
    subprocess.run(['git', '-C', str(destination), 'apply', '--check', str(patch)], check=True)
    subprocess.run(['git', '-C', str(destination), 'apply', str(patch)], check=True)


def safe_integration_copy(app, destination):
    for folder in [REPO / 'deployment' / app, REPO / 'deployment/mail-routing']:
        for source in sorted(folder.rglob('*')):
            if source.is_dir():
                continue
            assert source.is_file() and not source.is_symlink(), str(source)
            assert not any(part in {'.git', '__pycache__', 'node_modules', 'data', 'private', 'backups'} for part in source.relative_to(folder).parts)
            assert source.name != '.env' and (source.suffix != '.env' or source.name == 'relay.env')
            data = source.read_bytes()
            assert not SECRET.search(data), str(source)
            target = destination / source.relative_to(REPO)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    shutil.copy2(REPO / 'LICENSE', destination / 'utilibre-integration-LICENSE.txt')


def normalized(info):
    assert info.isfile() or info.isdir(), info.name
    info.uid = info.gid = 0
    info.uname = info.gname = ''
    return info


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apps', nargs='*', choices=tuple(SPECS), help='Publish only these services; omission publishes all three.')
    requested = parser.parse_args().apps or list(SPECS)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='mail-source-', dir='/opt/utilibre'))
    records = []
    for app, (directory, pin, version, licence) in SPECS.items():
        if app not in requested:
            continue
        source = Path('/opt/utilibre/community-src') / directory
        root = stage / app
        upstream = root / 'upstream'
        omissions = sorted(OMIT.get(app, set()))
        extract_pin(source, pin, upstream, set(omissions))
        safe_integration_copy(app, root)
        modifications = []
        if app == 'newsletters':
            apply_patch(upstream, REPO / 'deployment/newsletters/operator-copy.patch')
            assert (upstream / 'source/application.mts').read_bytes() == (source / 'source/application.mts').read_bytes()
            modifications.append('operator-copy.patch is already applied to upstream/source/application.mts')
        if app == 'addy':
            docker_pin = 'ec7934b4835518fe6a520dedf7ce97464cacd7cd'
            extract_pin(Path('/opt/utilibre/community-src/addy-docker'), docker_pin, root / 'upstream-docker', set())
            modifications.append('Application code is unchanged; upstream-docker is pinned to ' + docker_pin + '. The native relay hook, authentication-only Rspamd/Postfix overrides and FIFO-gated SMTP entrypoint are integration configuration. Local signing remains disabled; the separate authorized gateway signs outbound mail.')
        if app == 'simplelogin':
            apply_patch(upstream, REPO / 'deployment/simplelogin/port-aware-starttls.patch')
            apply_patch(upstream, REPO / 'deployment/simplelogin/security/gunicorn-dependency.patch')
            apply_patch(upstream, REPO / 'deployment/simplelogin/security/runtime-dependencies.patch')
            log = upstream / 'app/log.py'
            old = log.read_text()
            assert old.count('logger.setLevel(logging.DEBUG)') == 1
            new = old.replace('logger.setLevel(logging.DEBUG)', 'logger.setLevel(logging.WARNING)')
            log.write_text(new)
            patch = ''.join(difflib.unified_diff(old.splitlines(True), new.splitlines(True), fromfile='a/app/log.py', tofile='b/app/log.py'))
            (root / 'deployment/simplelogin/log-level.patch').write_text(patch)
            modifications.extend(['port-aware-starttls.patch is already applied to upstream/app/email_utils.py', 'log-level.patch is already applied to upstream/app/log.py; the layered Dockerfile performs the same change', 'security/gunicorn-dependency.patch is already applied to upstream/pyproject.toml; the layered build uses security/transport-requirements.txt for hash-pinned Gunicorn 26.2.0 and aiosmtpd 1.4.6. security/compatible-leaves.txt additionally pins eight compatible transitive-library wheels by SHA-256 without relaxing application constraints. The original upstream uv.lock describes the immutable base only. Framework dependency findings still block public deployment.'])
            modifications.append('security/runtime-dependencies.patch is also applied to upstream/pyproject.toml, updating nine direct constraints. security/runtime-requirements.txt hash-pins all 33 resolved runtime changes, including the PGPy source archive and its separate build constraint. No app/model source or migration is changed. Native token/PGP, CORS, HTTP, auth/CSV, SMTP handshake and isolated restore checks passed; legacy Flask/Jinja/Werkzeug still block public activation.')
        files = {}
        for file in sorted(root.rglob('*')):
            if file.is_file():
                data = file.read_bytes()
                assert not SECRET.search(data), str(file.relative_to(root))
                files[str(file.relative_to(root))] = hashlib.sha256(data).hexdigest()
        (root / 'SOURCE-MANIFEST.json').write_text(json.dumps({'app': app, 'version': version, 'upstreamCommit': pin, 'omittedPublicTestKeys': omissions, 'files': files}, indent=2) + '\n')
        (root / 'SOURCE-NOTICE.txt').write_text(
            f'Utilibre {app} source offer, reviewed 2026-10-09\nVersion: {version}\nUpstream commit: {pin}\nLicence: {licence}\n\n'
            'The upstream/ directory contains the pinned application source with the listed Utilibre modifications already applied. Preserve the upstream licence and dependency notices. The deployment/ directory contains the matching image recipe, resource/log/backup controls and narrow SMTP routing rules. relay.env contains only nonsecret transport and native authentication settings. Private configuration paths in Compose intentionally refer to files not distributed here. Create your own secrets and mail-signing keys before a separate deployment.\n\n'
            'Applied changes:\n' + '\n'.join('- ' + item for item in modifications) + '\n\n'
            'Omitted files: ' + (', '.join(omissions) or 'none') + '. These are public upstream development/test private keys, not application code or Utilibre runtime keys. The immutable upstream commit identifies their original provenance. Use freshly generated keys for development or deployment; never reuse published fixture keys. All other tracked upstream source files are included.\n\n'
            'Build: use the included Dockerfile/rebuild recipe with the pinned source and dependencies. The source modifications above are already applied in this archive; do not apply them twice. SimpleLogin uses its explicitly pinned release-image digest as the layered build base. Its dependency findings remain unresolved; publishing source does not approve public deployment.\n\n'
            'This source offer does not contain user accounts, messages, feeds, databases, backups, browser sessions, API tokens or Utilibre key material. It does not enable a public service or promise successful external mail routing. SMTP host ports 2526/2527 accept only the authorized gateway source, and FIFO startup gating applies the namespace rules before opening the native SMTP process. Historical local SMTP fixture scripts do not authorize reopening host-loopback access. Do not run tests against another operator’s live mail.\n'
        )
        archive = stage / (app + '-utilibre.tar.gz')
        with tarfile.open(archive, 'w:gz') as output:
            output.add(root, arcname=app, filter=normalized)
        with tarfile.open(archive, 'r:gz') as check:
            members = check.getmembers()
            assert any(item.name.endswith('/SOURCE-NOTICE.txt') for item in members)
            for member in members:
                assert member.isdir() or member.isfile()
                if member.isfile():
                    assert not SECRET.search(check.extractfile(member).read()), member.name
        destination = PUBLIC / archive.name
        if destination.exists():
            shutil.copy2(destination, stage / (app + '-previous.tar.gz'))
        archive.chmod(0o644)
        archive.replace(destination)
        records.append({'app': app, 'version': version, 'commit': pin, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'bytes': destination.stat().st_size, 'files': len(files), 'omittedPublicTestKeys': omissions, 'url': 'https://tools.utilibre.org/utilibre-source/' + destination.name})
    report = stage / 'published.json'
    report.write_text(json.dumps(records, indent=2) + '\n')
    print(json.dumps({'report': str(report), 'archives': records}, indent=2))


if __name__ == '__main__':
    main()
