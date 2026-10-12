"""Two-account native Vikunja fixture; never uses production QA/account data.

Only isolated local auth/signup replace production OIDC in the temporary config.
No network interface, mail, external identity provider, real volume or token.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
import zipfile
import requests
import yaml

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output')
CONFIG = HERE.parents[1] / 'community/vikunja/config.yml'
BASE = 'http://127.0.0.1:3456/api/v2'
PASSWORD = 'Fixture-only-password-593!'
TITLE = 'Fictional native security project'
PAYLOAD = b'Fictional task attachment; no real personal information.\n'


def inside(phase):
    session = requests.Session()
    session.trust_env = False
    def request(method, path, token=None, **kwargs):
        headers = {'Authorization': 'Bearer ' + token} if token else {}
        return session.request(method, BASE + path, headers=headers, timeout=15, **kwargs)
    def ok(response, *statuses):
        assert response.status_code in statuses, (response.request.method, response.request.path_url, response.status_code, response.text[:250])
        return response.json()
    def items(data):
        return data if isinstance(data, list) else data['items']
    for _ in range(100):
        try:
            if request('GET', '/info').status_code == 200:
                break
        except requests.RequestException:
            pass
        time.sleep(.3)
    else:
        raise AssertionError('Vikunja native API did not become ready')
    tokens = []
    for username in ['fictionala', 'fictionalb']:
        if phase == 'initial':
            ok(request('POST', '/register', json={'username': username, 'email': username + '@example.invalid', 'password': PASSWORD}), 200, 201)
        token = ok(request('POST', '/login', json={'username': username, 'password': PASSWORD}), 200)['token']
        assert ok(request('GET', '/user', token), 200)['username'] == username
        tokens.append(token)
    a, b = tokens
    if phase == 'restart':
        projects = items(ok(request('GET', '/projects', a), 200))
        project = next(p for p in projects if p['title'] == TITLE)
        tasks = items(ok(request('GET', '/projects/' + str(project['id']) + '/tasks', a), 200))
        task = next(t for t in tasks if t['title'] == 'Fictional completed task')
        assert task['done'] is True
        attachments = items(ok(request('GET', '/tasks/' + str(task['id']) + '/attachments', a), 200))
        assert len(attachments) == 1
        result = request('GET', '/tasks/' + str(task['id']) + '/attachments/' + str(attachments[0]['id']), a)
        assert result.status_code == 200 and result.content == PAYLOAD
        for token in tokens:
            for project in items(ok(request('GET', '/projects', token), 200)):
                if project['title'] == TITLE:
                    path = '/projects/' + str(project['id'])
                    assert request('DELETE', path, token).status_code == 204
                    assert request('GET', path, token).status_code == 404
        return {'reloadPreservesTaskAndAttachment': True, 'nativeProjectDeletion': True}
    project = ok(request('POST', '/projects', a, json={'title': TITLE, 'description': 'Fictional isolated check.'}), 201)
    project_path = '/projects/' + str(project['id'])
    for token in [None, b]:
        assert request('GET', project_path, token).status_code in [401, 403, 404]
    task = ok(request('POST', project_path + '/tasks', a, json={'title': 'Fictional task', 'description': '<p>Fictional example.</p>'}), 201)
    task_path = '/tasks/' + str(task['id'])
    updated = ok(request('PUT', task_path, a, json={'title': 'Fictional completed task', 'done': True}), 200)
    assert updated['done'] is True
    uploaded = ok(request('POST', task_path + '/attachments', a, files={'files': ('fictional.txt', PAYLOAD, 'text/plain')}), 201)
    assert not uploaded.get('errors')
    attachments = items(ok(request('GET', task_path + '/attachments', a), 200))
    assert len(attachments) == 1
    attachment_path = task_path + '/attachments/' + str(attachments[0]['id'])
    result = request('GET', attachment_path, a)
    assert result.status_code == 200 and result.content == PAYLOAD
    for token in [None, b]:
        assert request('GET', attachment_path, token).status_code in [401, 403, 404]
    assert request('POST', '/user/export/request', a, json={'password': 'incorrect-fictional-password'}).status_code in [400, 401, 403]
    ok(request('POST', '/user/export/request', a, json={'password': PASSWORD}), 200)
    for _ in range(100):
        if ok(request('GET', '/user/export', a), 200):
            break
        time.sleep(.3)
    else:
        raise AssertionError('Native export did not finish')
    exported = request('POST', '/user/export/download', a, json={'password': PASSWORD})
    assert exported.status_code == 200
    with zipfile.ZipFile(io.BytesIO(exported.content)) as archive:
        assert archive.testzip() is None
        assert any(archive.read(name) == PAYLOAD for name in archive.namelist() if not name.endswith('/'))
    assert request('POST', '/user/export/download', b, json={'password': PASSWORD}).status_code in [400, 404]
    ok(request('POST', '/migration/vikunja-file/migrate', b, files={'import': ('fictional-export.zip', exported.content, 'application/zip')}), 200)
    for _ in range(100):
        status = ok(request('GET', '/migration/vikunja-file/status', b), 200)
        if status and status.get('finished_at', '').startswith('20'):
            break
        time.sleep(.3)
    else:
        raise AssertionError('Native import did not finish')
    copies = [p for p in items(ok(request('GET', '/projects', b), 200)) if p['title'] == TITLE]
    assert len(copies) == 1
    assert copies[0]['id'] != project['id']
    imported_tasks = items(ok(request('GET', '/projects/' + str(copies[0]['id']) + '/tasks', b), 200))
    imported_task = next(t for t in imported_tasks if t['title'] == 'Fictional completed task')
    imported_path = '/tasks/' + str(imported_task['id']) + '/attachments'
    imported_attachments = items(ok(request('GET', imported_path, b), 200))
    assert len(imported_attachments) == 1
    restored = request('GET', imported_path + '/' + str(imported_attachments[0]['id']), b)
    assert restored.status_code == 200 and restored.content == PAYLOAD
    assert request('GET', '/projects/' + str(copies[0]['id']), a).status_code in [403, 404]
    return {'twoNativeAccounts': True, 'createCompleteTask': True, 'projectAndAttachmentIsolation': True,
            'attachmentRoundTrip': True, 'exportPasswordRequired': True, 'nativeZipExportImport': True,
            'importedProjectOwnedByRecipient': True}


def main():
    os.umask(0o077)
    baseline = '--baseline' in sys.argv
    stage = ({'imageId': next(s['baseId'] for s in json.loads((HERE / 'images.json').read_text()) if s['key'] == 'vikunja')}
             if baseline else json.loads((ROOT / 'vikunja-image.json').read_text()))
    name = 'maintenance-vikunja-native-' + str(os.getpid())
    directory = Path(tempfile.mkdtemp(prefix='utilibre-vikunja-native-', dir='/dev/shm'))
    run = lambda args: subprocess.check_output(args, text=True, stderr=subprocess.PIPE).strip()
    try:
        data = directory / 'data'
        data.mkdir()
        os.chown(data, 1000, 1000)
        directory.chmod(0o755)
        fixture = yaml.safe_load(CONFIG.read_text())
        fixture['auth'] = {'local': {'enabled': True}, 'openid': {'enabled': False}}
        fixture['service']['publicurl'] = 'http://127.0.0.1:3456/'
        fixture['service']['enableregistration'] = True
        fixture['service']['secret'] = 'Fictional-isolated-native-test-not-a-real-secret-593'
        fixture['avatar']['gravatarbaseurl'] = 'http://127.0.0.1:9/unavailable'
        config = directory / 'config.yml'
        config.write_text(yaml.safe_dump(fixture))
        config.chmod(0o644)
        run(['docker', 'create', '--name', name, '--network', 'none', '--read-only',
             '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
             '--log-driver', 'none', '--cpus', '1', '--memory', '512m', '--pids-limit', '128',
             '-e', 'VIKUNJA_DATABASE_PATH=/data/vikunja.db',
             '--tmpfs', '/tmp:rw,size=32m,mode=1777',
             '-v', str(config) + ':/app/vikunja/config.yml:ro', '-v', str(data) + ':/data', stage['imageId']])
        checks = {}
        for phase in ['initial', 'restart']:
            if phase == 'restart':
                # Native SQLite online backup/restore on fixture only, while stopped.
                run(['docker', 'stop', name])
                database = data / 'vikunja.db'
                backup = directory / 'fictional.db'
                with sqlite3.connect(database) as source, sqlite3.connect(backup) as destination:
                    source.backup(destination)
                    assert destination.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
                with sqlite3.connect(backup) as source, sqlite3.connect(database) as destination:
                    source.backup(destination)
                checks['syntheticSqliteBackupRestore'] = True
            # Capture only this synthetic fixture's startup failures in RAM;
            # Docker logging remains disabled, including HTTP/database logs.
            startup = tempfile.TemporaryFile(dir='/dev/shm')
            attached = subprocess.Popen(['docker', 'start', '-a', name], stdout=startup, stderr=subprocess.STDOUT)
            for _ in range(100):
                info = json.loads(run(['docker', 'inspect', name]))[0]
                if info['State']['Running'] or attached.poll() is not None:
                    break
                time.sleep(.05)
            info = json.loads(run(['docker', 'inspect', name]))[0]
            assert info['Image'] == stage['imageId'] and info['HostConfig']['NetworkMode'] == 'none'
            child = subprocess.run(['nsenter', '-t', str(info['State']['Pid']), '-n', sys.executable,
                                    str(Path(__file__).resolve()), '--inside', phase], text=True, capture_output=True)
            if child.returncode:
                startup.seek(0)
                raise RuntimeError(child.stderr[-2500:] + startup.read().decode()[-1500:])
            checks.update(json.loads(child.stdout))
            startup.close()
        report = {'passed': True, 'imageId': stage['imageId'], 'date': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                  'configurationSourceSha256': hashlib.sha256(CONFIG.read_bytes()).hexdigest(),
                  'networkIsolated': True, 'onlySyntheticData': True, **checks,
                  'limitations': ['Local auth is enabled only in this isolated fixture; production OIDC is unchanged and not exercised here.',
                                  'Embedded frontend assets are separately byte-compared; no mobile/browser usability claim.']}
        (ROOT / ('vikunja-baseline-native.json' if baseline else 'vikunja-native.json')).write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report))
    finally:
        subprocess.run(['docker', 'rm', '-f', '-v', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        shutil.rmtree(directory)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--inside':
        print(json.dumps(inside(sys.argv[2])))
    else:
        main()
