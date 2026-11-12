"""Synthetic 2.7 -> 2.8 migration and pre-upgrade rollback; no live mounts.

Reuse the retained native CRUD/export fixture. Images are immutable IDs, all
application networking is disabled, and only disposable data is mounted.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import yaml

REPO = Path(__file__).resolve().parents[4]
CHECKER = REPO / 'deployment/maintenance/go-leaf-final/check-vikunja.py'
CONFIG = REPO / 'deployment/community/vikunja/config.yml'
BEFORE = 'sha256:359415f79ab1bb719439121fcfed4373a9f5293cf175d8ddcba5b07735b87c70'
AFTER = 'sha256:12c860da57e1d354d3a75f01ec6b88acb35ea3a38b213a1b9ecab339d59aa243'
CHECKSUM = '1fcfd6e9944a16cc0d52551e49ce1a94b24558bda04f6f858c6e8ddacf34f490'


def inside(phase):
    assert hashlib.sha256(CHECKER.read_bytes()).hexdigest() == CHECKSUM
    spec = importlib.util.spec_from_file_location('native_fixture', CHECKER)
    native = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(native)
    result = native.inside('restart' if phase == 'upgraded' else phase)
    if phase != 'upgraded':
        return result
    session = native.requests.Session()
    session.trust_env = False
    purged = 0
    for username in ['fictionala', 'fictionalb']:
        login = session.post(native.BASE + '/login', json={'username': username, 'password': native.PASSWORD}, timeout=15)
        login.raise_for_status()
        headers = {'Authorization': 'Bearer ' + login.json()['token']}
        response = session.get(native.BASE + '/projects/deleted', headers=headers, timeout=15)
        response.raise_for_status()
        projects = response.json()
        projects = projects if isinstance(projects, list) else projects['items']
        for project in projects:
            assert project['title'] == native.TITLE
            url = native.BASE + '/projects/' + str(project['id'])
            restored = session.post(url + '/restore', headers=headers, timeout=15)
            assert restored.status_code == 200, restored.text[:100]
            assert session.get(url, headers=headers, timeout=15).status_code == 200
            assert session.delete(url, headers=headers, timeout=15).status_code == 204
            assert session.delete(url + '/permanent', headers=headers, timeout=15).status_code == 204
            purged += 1
    assert purged == 2
    return {**result, 'trashRestoreAndPermanentDeletion': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    options = parser.parse_args()
    assert options.output.is_absolute() and not options.output.exists()
    assert hashlib.sha256(CHECKER.read_bytes()).hexdigest() == CHECKSUM
    os.umask(0o077)
    directory = Path(tempfile.mkdtemp(prefix='utilibre-vikunja-upgrade-', dir='/dev/shm'))
    names = []
    run = lambda args: subprocess.check_output(args, text=True, stderr=subprocess.PIPE).strip()
    try:
        directory.chmod(0o755)
        data = directory / 'data'
        data.mkdir()
        os.chown(data, 1000, 1000)
        fixture = yaml.safe_load(CONFIG.read_text())
        fixture['auth'] = {'local': {'enabled': True}, 'openid': {'enabled': False}}
        fixture['service'].update(publicurl='http://127.0.0.1:3456/', enableregistration=True,
                                  secret='Fictional-isolated-native-test-not-a-real-secret-593')
        fixture['avatar']['gravatarbaseurl'] = 'http://127.0.0.1:9/unavailable'
        config = directory / 'config.yml'
        config.write_text(yaml.safe_dump(fixture))
        config.chmod(0o644)
        checks = {}
        for phase, image in [('initial', BEFORE), ('upgraded', AFTER), ('restart', BEFORE)]:
            if phase == 'upgraded':
                shutil.copytree(data, directory / 'pre-upgrade-backup', copy_function=shutil.copy2)
            elif phase == 'restart':
                shutil.rmtree(data)
                shutil.copytree(directory / 'pre-upgrade-backup', data, copy_function=shutil.copy2)
                for path in [data, *data.rglob('*')]:
                    os.chown(path, 1000, 1000)
            name = 'maintenance-vikunja-upgrade-' + str(os.getpid()) + '-' + phase
            names.append(name)
            run(['docker', 'create', '--name', name, '--network', 'none', '--read-only',
                 '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                 '--log-driver', 'none', '--cpus', '1', '--memory', '512m', '--pids-limit', '128',
                 '-e', 'VIKUNJA_DATABASE_PATH=/data/vikunja.db', '--tmpfs', '/tmp:rw,size=32m,mode=1777',
                 '-v', str(config) + ':/app/vikunja/config.yml:ro', '-v', str(data) + ':/data', image])
            with tempfile.TemporaryFile(dir='/dev/shm') as startup:
                attached = subprocess.Popen(['docker', 'start', '-a', name], stdout=startup, stderr=subprocess.STDOUT)
                for _ in range(100):
                    info = json.loads(run(['docker', 'inspect', name]))[0]
                    if info['State']['Running'] or attached.poll() is not None:
                        break
                    time.sleep(.05)
                assert info['Image'] == image and info['HostConfig']['NetworkMode'] == 'none'
                child = subprocess.run(['nsenter', '-t', str(info['State']['Pid']), '-n', sys.executable,
                                        str(Path(__file__).resolve()), '--inside', phase],
                                       text=True, capture_output=True, timeout=180)
                if child.returncode:
                    startup.seek(0)
                    raise RuntimeError(child.stderr[-2500:] + startup.read().decode()[-1500:])
                checks[phase] = json.loads(child.stdout)
                run(['docker', 'stop', name])
                attached.wait(timeout=30)
        options.output.write_text(json.dumps({'passed': True, 'before': BEFORE, 'after': AFTER,
            'date': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'checks': checks,
            'configurationSha256': hashlib.sha256(CONFIG.read_bytes()).hexdigest(),
            'migrationFromRealPreviousBinary': True, 'rollbackRestoresPreUpgradeData': True,
            'network': 'none', 'syntheticOnly': True, 'productionChanged': False,
            'limitation': 'No production account data, external Authentik or backup service was accessed.'}, indent=2) + '\n')
        print('Synthetic upgrade, trash workflow and rollback passed.')
    finally:
        for name in names:
            subprocess.run(['docker', 'rm', '-f', '-v', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        shutil.rmtree(directory)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--inside':
        print(json.dumps(inside(sys.argv[2])))
    else:
        main()
