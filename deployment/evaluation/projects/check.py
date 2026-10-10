#!/usr/bin/env python3
"""Only fictional records in the unpublished, internal-network Projects evaluation."""
import datetime
import json
import io
import tarfile
import tempfile
import secrets
import subprocess
from pathlib import Path
import requests

root = Path('/opt/utilibre/evaluation/projects-20261009')
env = dict(line.split('=', 1) for line in (root / 'private/pilot.env').read_text().splitlines())
app_ip = subprocess.check_output(['docker', 'inspect', 'utilibre-projects-pilot-app-1', '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'], text=True).strip()
base = 'http://' + app_ip + ':1337'
session = requests.Session()
result = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'checks': []}

def request(method, path, body=None):
    response = session.request(method, base + path, json=body, timeout=15)
    if not response.ok:
        raise RuntimeError(f'{method} {path}: HTTP {response.status_code}: {response.text[:400]}')
    return response.json() if response.content else {}

assert requests.get(base + '/api/projects', timeout=10).status_code == 401
result['checks'].append('Unauthenticated project access denied')
login = request('POST', '/api/access-tokens', {
    'emailOrUsername': env['DEFAULT_ADMIN_USERNAME'], 'password': env['DEFAULT_ADMIN_PASSWORD'],
})
session.headers['Authorization'] = 'Bearer ' + login['item']
session.cookies.set('accessToken', login['item'])
project = request('POST', '/api/projects', {'name': 'Fictional Utilibre review'})['item']
other = None
attachment = None
try:
    board = request('POST', f"/api/projects/{project['id']}/boards", {'name': 'Fictional board'})['item']
    todo = request('POST', f"/api/boards/{board['id']}/lists", {'name': 'To do', 'position': 65536})['item']
    done = request('POST', f"/api/boards/{board['id']}/lists", {'name': 'Done', 'position': 131072})['item']
    card = request('POST', f"/api/lists/{todo['id']}/cards", {
        'name': 'Review fictional diagram', 'description': 'Fictional data only.', 'position': 65536,
    })['item']
    moved = request('PATCH', f"/api/cards/{card['id']}", {'listId': done['id'], 'position': 65536})['item']
    assert moved['listId'] == done['id']
    loaded = request('GET', f"/api/cards/{card['id']}")['item']
    assert loaded['name'] == 'Review fictional diagram' and loaded['description'] == 'Fictional data only.'
    result['checks'].append('Native project, board, two lists, card creation/move/read passed')
    fixture = b'Fictional attachment for isolated recovery verification.\n'
    files_before = set((root / 'data/attachments').rglob('fictional.txt'))
    uploaded = session.post(base + f"/api/cards/{card['id']}/attachments", files={
        'file': ('fictional.txt', fixture, 'text/plain'),
    }, timeout=15)
    assert uploaded.ok, f'Attachment upload HTTP {uploaded.status_code}'
    attachment = uploaded.json()['item']
    attachment_path = f"/attachments/{attachment['id']}/download/fictional.txt"
    downloaded = session.get(base + attachment_path, timeout=10)
    assert downloaded.content == fixture, f'Attachment download HTTP {downloaded.status_code}'
    result['checks'].append('Native fictional attachment upload/download matched bytes')
    db_command = ['docker', 'exec', '-i', 'utilibre-projects-pilot-db-1']
    dump = subprocess.check_output(db_command + ['pg_dump', '-U', 'projects', '-d', 'projects', '-Fc'])
    subprocess.run(db_command + ['createdb', '-U', 'projects', 'projects_restore'], check=True)
    try:
        subprocess.run(db_command + ['pg_restore', '-U', 'projects', '-d', 'projects_restore', '--no-owner', '--no-privileges'], input=dump, check=True)
        for table in ['project', 'board', 'list', 'card', 'attachment']:
            query = f'SELECT count(*) FROM "{table}"'
            original = subprocess.check_output(db_command + ['psql', '-U', 'projects', '-d', 'projects', '-Atc', query])
            restored = subprocess.check_output(db_command + ['psql', '-U', 'projects', '-d', 'projects_restore', '-Atc', query])
            assert original == restored
        stored_files = list(set((root / 'data/attachments').rglob('fictional.txt')) - files_before)
        assert len(stored_files) == 1 and stored_files[0].read_bytes() == fixture
        query = f"SELECT name || ':' || description FROM card WHERE id = '{card['id']}'"
        original = subprocess.check_output(db_command + ['psql', '-U', 'projects', '-d', 'projects', '-Atc', query])
        restored = subprocess.check_output(db_command + ['psql', '-U', 'projects', '-d', 'projects_restore', '-Atc', query])
        assert original == restored and b'Fictional data only.' in restored
        archive_bytes = io.BytesIO()
        with tarfile.open(fileobj=archive_bytes, mode='w:gz') as archive:
            archive.add(root / 'data', arcname='data')
        archive_bytes.seek(0)
        with tempfile.TemporaryDirectory(prefix='projects-fictional-restore-') as restored_directory:
            with tarfile.open(fileobj=archive_bytes, mode='r:gz') as archive:
                archive.extractall(restored_directory, filter='data')
            restored_attachment = Path(restored_directory) / stored_files[0].relative_to(root)
            assert restored_attachment.read_bytes() == fixture
        result['checks'].append('Native PostgreSQL dump restored five-table counts and card contents; separate data archive restored fictional attachment bytes')
    finally:
        subprocess.run(db_command + ['dropdb', '-U', 'projects', 'projects_restore'], check=True)
    other_password = secrets.token_hex(24)
    other = request('POST', '/api/users', {
        'email': 'other-pilot@example.invalid', 'username': 'otherpilot',
        'name': 'Other fictional pilot', 'password': other_password,
    })['item']
    other_login = requests.post(base + '/api/access-tokens', json={
        'emailOrUsername': 'otherpilot', 'password': other_password,
    }, timeout=10)
    assert other_login.ok
    other_headers = {'Authorization': 'Bearer ' + other_login.json()['item']}
    for path in [f"/api/projects/{project['id']}", f"/api/boards/{board['id']}", f"/api/cards/{card['id']}", attachment_path]:
        assert requests.get(base + path, headers=other_headers, cookies={'accessToken': other_login.json()['item']}, timeout=10).status_code == 404
    result['checks'].append('Uninvited second account could not read project, board, card or attachment')
finally:
    if other is not None:
        request('DELETE', f"/api/users/{other['id']}")
    if attachment is not None:
        request('DELETE', f"/api/attachments/{attachment['id']}")
        assert session.get(base + attachment_path, timeout=10).status_code == 404
        result['checks'].append('Native attachment deletion made its download unavailable')
    request('DELETE', f"/api/projects/{project['id']}")
    deleted = session.get(base + f"/api/projects/{project['id']}", timeout=10)
    assert deleted.status_code == 404
    result['checks'].append('Native project deletion made the fictional project unavailable; native archival is separate')
request('DELETE', '/api/access-tokens/me')
assert session.get(base + '/api/projects', timeout=10).status_code == 401
result['checks'].append('Native logout revoked the test access token')
output = Path('/opt/utilibre/reports/planka-fork-20261009/native-check.json')
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
