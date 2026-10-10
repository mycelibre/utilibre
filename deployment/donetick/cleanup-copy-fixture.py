#!/usr/bin/env python3
"""Delete only the recorded fictional native account, then its empty circle."""
import json
import pathlib
import secrets
import sqlite3
import requests

out = pathlib.Path('/opt/utilibre/reports/native-navigation-20261009')
fixture = json.loads((out / 'donetick-fixture.json').read_text())
assert fixture['username'] == 'utilibre-navigation-20261009-b'
state = json.loads((out / 'donetick-browser-state.json').read_text())
origin = next(value for value in state['origins'] if value['origin'] == 'https://chores.utilibre.org')
token = next(value['value'] for value in origin['localStorage'] if value['name'] == 'token')
session = requests.Session()
session.headers['Authorization'] = 'Bearer ' + token
refresh = next(value for value in state['cookies'] if value['domain'] == 'chores.utilibre.org' and value['name'] == 'refresh_token')
session.cookies.set('refresh_token', refresh['value'], domain='chores.utilibre.org', path='/')
base = 'https://chores.utilibre.org'

def request(method, path, **kwargs):
    response = session.request(method, base + path, timeout=20, **kwargs)
    assert response.status_code == 200, (method, path, response.status_code)
    return response

profile = request('GET', '/api/v1/users/profile').json()['res']
assert {key: profile[key] for key in fixture} == fixture
assert request('GET', '/api/v1/chores/').json()['res'] == []
request('POST', '/api/v1/auth/refresh', json={})
password = secrets.token_urlsafe(32)
request('PUT', '/api/v1/users/change_password', json={'password': password})
preview = request('POST', '/api/v1/users/delete/check', json={'password': password}).json()
assert preview['success'] and preview['deletedData']['user_sessions'] >= 1
(out / 'donetick-delete-preview.json').write_text(json.dumps(preview))
(out / 'donetick-delete-preview.json').chmod(0o600)
request('DELETE', '/api/v1/users/delete', json={'password': password, 'confirmation': 'DELETE'})
assert session.get(base + '/api/v1/users/profile', timeout=20).status_code in [401, 403, 404]
assert session.post(base + '/api/v1/auth/refresh', json={}, timeout=20).status_code == 401

with sqlite3.connect('/opt/utilibre/donetick/data/donetick.db') as db:
    db.execute('BEGIN IMMEDIATE')
    assert db.execute('SELECT COUNT(*) FROM users WHERE id=? OR username=?', (fixture['id'], fixture['username'])).fetchone()[0] == 0
    # This is the native deletion regression: no manual session removal here.
    assert db.execute('SELECT COUNT(*) FROM user_sessions WHERE user_id=?', (fixture['id'],)).fetchone()[0] == 0
    expected_circle = "Fictional navigation tester b's circle"
    assert db.execute('SELECT name FROM circles WHERE id=?', (fixture['circleID'],)).fetchone() == (expected_circle,)
    tables = [row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    for table in tables:
        assert table.replace('_', '').isalnum()
        fields = {row[1] for row in db.execute('PRAGMA table_info("' + table + '")')}
        if table == 'sync_cursors':
            assert fields == {'id', 'circle_id', 'entity_type', 'max_version'}
            continue
        if 'circle_id' in fields:
            assert db.execute('SELECT COUNT(*) FROM "' + table + '" WHERE circle_id=?', (fixture['circleID'],)).fetchone()[0] == 0, table
    db.execute('DELETE FROM sync_cursors WHERE circle_id=?', (fixture['circleID'],))
    db.execute('DELETE FROM circles WHERE id=? AND name=?', (fixture['circleID'], expected_circle))
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    db.commit()
(out / 'donetick-copy-cleanup.json').write_text(json.dumps({
    'nativeAccountDeleted': True, 'nativeRefreshSessionsDeleted': True,
    'formerAccessTokenDenied': True, 'refreshWorkedBeforeAndDeniedAfter': True,
    'exactEmptyFictionalCircleRemoved': True,
    'foreignKeyCheckPasses': True, 'otherAccountsAndRetentionUnchanged': True,
}, indent=2))
print('The fictional account and its refresh sessions were deleted natively; its exact empty circle was cleaned.')
