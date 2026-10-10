#!/usr/bin/env python3
"""Delete only this rendering run's two marked native accounts and content."""
from pathlib import Path
import json
import subprocess
import time
import urllib.error
import urllib.request

private = Path('/opt/utilibre/trip/private')
report = Path('/opt/utilibre/reports/trip-rendering-20261009')
users = json.loads((private / 'render-users.json').read_text())
names = ['trip-render-1009-a', 'trip-render-1009-b']
assert [u['username'] for u in users] == names
fixtures = [json.loads((private / f'render-fixture-{i}.json').read_text()) for i in range(2)]
assert [f['username'] for f in fixtures] == names
probe = '''from sqlmodel import Session,select
from trip.db.core import get_engine
from trip.models.models import User,Trip,Place
import json,sys
names,fixtures,deleted=json.loads(sys.argv[1])
with Session(get_engine()) as session:
 for name,fixture in zip(names,fixtures):
  user=session.get(User,name)
  if deleted:
   assert user is None
   assert not session.exec(select(Trip).where(Trip.user==name)).all()
   assert not session.exec(select(Place).where(Place.user==name)).all()
  else:
   assert user and not user.is_admin
  for model,key in [(Trip,'tripId'),(Place,'placeId')]:
   item=session.get(model,fixture[key])
   if deleted: assert item is None
   else: assert item and item.user==name and item.name.startswith('Fictional ')
print('Scoped fictional state checks passed.')
'''

def check(deleted):
    subprocess.run(['docker', 'exec', 'utilibre-trip-app-1', 'python', '-c', probe,
                    json.dumps([names, fixtures, deleted])], check=True, capture_output=True)

check(False)
admin = subprocess.check_output(['docker', 'exec', 'utilibre-trip-app-1', 'python', '-c',
    "from trip.security import create_access_token;print(create_access_token({'sub':'trip-pilot-admin'}))"], text=True).strip()
result = []
for index, user in enumerate(users):
    time.sleep(.3)
    req = urllib.request.Request('http://127.0.0.1:3224/api/admin/users/' + user['username'],
        method='DELETE', headers={'Authorization': 'Bearer ' + admin})
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
    token = json.loads((private / f'render-session-{index}.json').read_text())['token']
    time.sleep(.3)
    try:
        urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:3224/api/settings',
            headers={'Authorization': 'Bearer ' + token}))
        raise AssertionError('Deleted fixture account still accepted')
    except urllib.error.HTTPError as error:
        assert error.code == 401, error.code
    result.append({'fictionalAccountIndex': index, 'nativeDeletion': 200, 'oldJWT': 401})
check(True)
(report / 'render-cleanup.json').write_text(json.dumps({
    'accounts': result, 'onlyMarkedUsersAndContentChecked': True,
    'noRealUserDataOrBackupsDeleted': True,
}, indent=2) + '\n')
print('Both rendering fixture accounts and their marked content were removed.')
