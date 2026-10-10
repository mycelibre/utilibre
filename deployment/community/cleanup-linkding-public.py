"""Remove only the exact empty synthetic app account after the public UI test."""
import json
import subprocess
from pathlib import Path

report = Path('/opt/utilibre/reports/linkding-public-20261009')
result = json.loads((report / 'public-result.json').read_text())
assert result['success'] and result['publicHttps'] and result['noInterception']
code = """
from django.contrib.auth.models import User
from bookmarks.models import Bookmark
u = User.objects.get(username='utilibre-linkding-public-20261009-a')
assert u.email == 'utilibre-linkding-public-20261009-a@example.invalid'
assert not u.is_superuser and not u.is_staff and not u.has_usable_password()
assert not Bookmark.objects.filter(owner=u).exists()
u.delete()
assert not User.objects.filter(username='utilibre-linkding-public-20261009-a').exists()
print('Only the empty fictional linkding application account was deleted.')
"""
r = subprocess.run(['docker', 'exec', '-i', 'utilibre-linkding-linkding-1', 'python', 'manage.py', 'shell', '-c', 'exec(__import__("sys").stdin.read())'], input=code, text=True, capture_output=True)
(report / 'native-account-retirement.log').write_text(r.stdout + r.stderr)
r.check_returncode()
identity = Path(__file__).with_name('linkding-public-identity-qa.py').read_text()
r = subprocess.run(['docker', 'exec', '-i', '-e', 'UTILIBRE_LINKDING_QA_ACTION=retire', 'utilibre-identity-server-1', 'ak', 'shell', '-c', 'exec(__import__("sys").stdin.read())'], input=identity, text=True, capture_output=True)
(report / 'identity-retirement.log').write_text(r.stdout + r.stderr)
r.check_returncode()
(report / 'cleanup.json').write_text(json.dumps({'onlyNamedFictionalIdentity': True, 'bookmarksAlreadyDeletedByNativeUI': True, 'nativeApplicationAccountDeleted': True, 'identityDisabledAndCredentialsRevoked': True}, indent=2) + '\n')
print('Only the empty fictional linkding account and its marked identity were retired.')
