#!/usr/bin/env python3
"""Storage fixture solely for the logged-out native invite-footer render."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

os.umask(0o077)
out = Path('/opt/utilibre/reports/native-navigation-20261009')
record = out / 'rallly-footer-fixture.json'
title = 'Fictional footer navigation check'

def sql(query):
    return subprocess.check_output([
        'docker', 'exec', '-i', 'utilibre-community-rallly-db-1', 'psql',
        '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'rallly', '-d', 'rallly',
    ], input=query, text=True)

if sys.argv[1] == 'prepare':
    assert not record.exists(), 'Previous fixture lifecycle must be finished first'
    identifier = 'utilibrefooter' + secrets.token_hex(16)
    # All fields are fixed fictional values or generated alphanumeric IDs.
    sql("BEGIN; INSERT INTO polls(id,title,updated_at,disable_comments,muted) VALUES ('" + identifier + "','" + title + "',now(),true,true); "
        + "INSERT INTO options(id,poll_id,start_time) VALUES ('" + identifier + "a','" + identifier + "','2026-11-10 00:00:00'),('" + identifier + "b','" + identifier + "','2026-11-11 00:00:00'); COMMIT;")
    record.write_text(json.dumps({'id': identifier, 'title': title, 'fixtureOnly': True}))
    print('One fictional poll with two dates created for native footer rendering; no account or message created.')
elif sys.argv[1] == 'cleanup':
    fixture = json.loads(record.read_text())
    identifier = fixture['id']
    assert identifier.startswith('utilibrefooter') and identifier.isalnum() and fixture['title'] == title
    result = json.loads(sql("SELECT json_build_object('title',title,'user',user_id,'space',space_id,'participants',(SELECT count(*) FROM participants WHERE poll_id=p.id),'comments',(SELECT count(*) FROM comments WHERE poll_id=p.id),'invites',(SELECT count(*) FROM poll_invites WHERE poll_id=p.id),'votes',(SELECT count(*) FROM votes WHERE poll_id=p.id),'options',(SELECT count(*) FROM options WHERE poll_id=p.id)) FROM polls p WHERE id='" + identifier + "';"))
    assert result == {'title': title, 'user': None, 'space': None, 'participants': 0, 'comments': 0, 'invites': 0, 'votes': 0, 'options': 2}
    sql("DELETE FROM polls WHERE id='" + identifier + "' AND title='" + title + "' AND user_id IS NULL AND space_id IS NULL;")
    assert sql("SELECT count(*) FROM polls WHERE id='" + identifier + "';").strip() == '0'
    assert sql("SELECT count(*) FROM options WHERE poll_id='" + identifier + "';").strip() == '0'
    (out / 'rallly-footer-cleanup.json').write_text(json.dumps({'exactFictionalPollDeleted': True, 'twoFictionalOptionsCascaded': True, 'noOtherRecordTouched': True}))
    print('Only the exact fictional poll and its two date options were deleted.')
else:
    raise SystemExit('Use prepare or cleanup')
