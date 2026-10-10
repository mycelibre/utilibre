#!/usr/bin/env python3
"""Disposable native Django-client workflow against an isolated copy, never production."""
import json, os, tempfile, sqlite3
from pathlib import Path
from datetime import timedelta
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'utilibre.settings')
import django
django.setup()
from django.conf import settings
from django.db import connections
from django.test import Client
from django.utils import timezone
from django.core.management import call_command

with tempfile.TemporaryDirectory(prefix='chess-native-', dir='/tmp') as d:
    source = settings.DATABASES['default']['NAME']
    isolated = str(Path(d) / 'fixture.sqlite3')
    with sqlite3.connect(f'file:{source}?mode=ro', uri=True) as src, sqlite3.connect(isolated) as dst:
        src.backup(dst)
    connections.close_all()
    settings.DATABASES['default']['NAME'] = isolated
    connections['default'].settings_dict['NAME'] = isolated
    from game.models import Game
    before = Game.objects.count()
    clients = [Client(enforce_csrf_checks=True, HTTP_HOST='chess.utilibre.org', HTTP_X_FORWARDED_PROTO='https') for _ in range(3)]
    white, black, spectator = clients
    for c in clients:
        assert c.get('/').status_code == 200
    def post(c, path, body):
        token = c.cookies['csrftoken'].value
        return c.post(path, json.dumps(body), content_type='application/json', HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN='https://chess.utilibre.org')
    assert white.post('/new/').status_code == 403
    created = post(white, '/new/', {})
    assert created.status_code == 302, created.content
    path = created['Location']
    game_id = path.strip('/')
    for c in clients:
        assert c.get(path).status_code == 200
    for c, color in [(white, 'white'), (black, 'black')]:
        assert post(c, path+'reserve_color/', {'color':color}).json()['status'] == 'ok'
        assert post(c, path+'ready/', {}).json()['status'] == 'ok'
    assert post(spectator,path+'reserve_color/',{'color':'white'}).json()['status'] == 'error'
    assert post(spectator,path+'move/',{'from':'e2','to':'e4'}).json()['status'] == 'error'
    assert post(black,path+'move/',{'from':'e7','to':'e5'}).json()['status'] == 'error'
    assert post(white,path+'move/',{'from':'e2','to':'e4'}).json()['status'] == 'ok'
    assert post(black,path+'move/',{'from':'e7','to':'e5'}).json()['status'] == 'ok'
    g = Game.objects.get(game_id=game_id)
    assert len(g.move_history) == 2
    assert spectator.get(path+'state/').status_code == 200
    # A consistent SQLite backup can reopen the precise moved board independently.
    connections.close_all()
    restored = str(Path(d)/'restored.sqlite3')
    with sqlite3.connect(isolated) as src, sqlite3.connect(restored) as dst: src.backup(dst)
    with sqlite3.connect(restored) as db:
        assert db.execute('PRAGMA integrity_check').fetchone() == ('ok',)
        assert not db.execute('PRAGMA foreign_key_check').fetchall()
        row = db.execute('SELECT fen, move_history FROM game_game WHERE game_id=?',(game_id,)).fetchone()
        assert row[0] == g.fen and len(json.loads(row[1])) == 2
    # Native cleanup changes only this copied database. Preserve pre-existing rows.
    Game.objects.filter(game_id=game_id).update(created_at=timezone.now()-timedelta(days=8))
    call_command('cleanup_games')
    assert not Game.objects.filter(game_id=game_id).exists()
    assert Game.objects.count() <= before
    spanish = Client(HTTP_HOST='chess.utilibre.org', HTTP_X_FORWARDED_PROTO='https', HTTP_ACCEPT_LANGUAGE='es')
    page = spanish.get('/').content.decode()
    assert 'Español' in page and 'Crear' in page
    connections.close_all()
print(json.dumps({'passed':['CSRF rejection','two native seats','spectator denied move/seat','wrong-turn rejection','two legal moves','read-only spectator','SQLite backup and independent restored board','native seven-day cleanup on copy','Spanish gettext'], 'scope':'isolated copied database, fictional game only'}))
