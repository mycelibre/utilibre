#!/usr/bin/env python3
"""Exercise only disposable fixture accounts, using a normal non-browser client."""
import base64
import json
import uuid
import urllib.request
import urllib.error
from pathlib import Path

report = Path('/opt/utilibre/reports/new-services-20261009')
credentials = json.loads((report / 'calendar-fixtures.json').read_text())
origin = 'https://calendar.utilibre.org/dav/'
username = 'utilibre-fixture-a'
created = []

def request(method, path, body=None, user=username, content_type='application/xml'):
    headers = {'Depth': '1', 'Content-Type': content_type}
    if user:
        headers['Authorization'] = 'Basic ' + base64.b64encode(
            f'{user}:{credentials[user]}'.encode()).decode()
    req = urllib.request.Request(origin + path, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()

try:
    assert request('PROPFIND', username + '/')[0] == 207
    for kind, extension, mime, payload in [
        ('calendar', 'ics', 'text/calendar', b'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Utilibre//Fictional verification//EN\r\nBEGIN:VEVENT\r\nUID:fictional-dav-check@invalid.example\r\nDTSTAMP:20261009T000000Z\r\nDTSTART:20261010T120000Z\r\nDTEND:20261010T123000Z\r\nSUMMARY:Fictional DAV workshop\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n'),
        ('addressbook', 'vcf', 'text/vcard', b'BEGIN:VCARD\r\nVERSION:3.0\r\nUID:fictional-dav-contact\r\nFN:Fictional DAV Contact\r\nEMAIL:fictional@invalid.example\r\nEND:VCARD\r\n'),
    ]:
        path = username + '/verify-' + uuid.uuid4().hex + '/'
        xml = ('<D:mkcol xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="urn:ietf:params:xml:ns:carddav"><D:set><D:prop><D:resourcetype><D:collection/>'
               + ('<C:calendar/>' if kind == 'calendar' else '<A:addressbook/>')
               + '</D:resourcetype><D:displayname>Fictional verification</D:displayname></D:prop></D:set></D:mkcol>').encode()
        assert request('MKCOL', path, xml)[0] == 201
        created.append(path)
        item = path + 'fictional.' + extension
        assert request('PUT', item, payload, content_type=mime)[0] == 201
        assert request('PROPFIND', path)[0] == 207
        status, exported = request('GET', path)
        assert status == 200 and b'Fictional DAV' in exported
        assert request('GET', item, user=None)[0] == 401
        assert request('GET', item, user='utilibre-fixture-b')[0] == 403
        imported = username + '/verify-' + uuid.uuid4().hex + '/'
        assert request('PUT', imported, exported, content_type=mime)[0] == 201
        created.append(imported)
        assert b'Fictional DAV' in request('GET', imported)[1]
        print(kind + ': public create, read, export/import and access isolation passed')
finally:
    for path in reversed(created):
        assert path.startswith(username + '/verify-')
        assert request('DELETE', path)[0] in (200, 204, 404)
print('Disposable collections removed; no real accounts or records used')
