"""Native ORM/HTTP fixture restricted to two fictional accounts, never existing users.
Run inside the pinned application with manage.py shell; writes private test state.
"""
import json
from pathlib import Path
from django.contrib.auth.models import User
from django.conf import settings
from django.test import Client
from bookmarks.models import Bookmark, ApiToken, GlobalSettings
from bookmarks.services import exporter, importer, tasks
from unittest.mock import patch
# Seed the verified operator's OIDC identity without a local password.
owner, created = User.objects.get_or_create(username='utilibre-admin', defaults={'email':'admin@utilibre.org','is_superuser':True,'is_staff':True})
assert owner.email=='admin@utilibre.org'
if created: owner.set_unusable_password();owner.save()
assert not owner.has_usable_password()
assert settings.LD_DISABLE_BACKGROUND_TASKS and not settings.LD_ENABLE_SNAPSHOTS
assert not settings.LD_FAVICON_PROVIDER and not settings.LD_ENABLE_REFRESH_FAVICONS
assert not settings.LD_ENABLE_AUTH_PROXY and settings.OIDC_VERIFY_SSL
assert settings.AUTHENTICATION_BACKENDS==['mozilla_django_oidc.auth.OIDCAuthenticationBackend']
g=GlobalSettings.get();assert not g.enable_link_prefetch
users=[]
for username in ['linkding-fixture-a','linkding-fixture-b']:
 existing=User.objects.filter(username=username).first()
 if existing:
  assert existing.email==username+'@example.invalid' and not existing.has_usable_password()
  existing.delete()
 u=User.objects.create_user(username=username,email=username+'@example.invalid',password=None);users.append(u)
a,b=users
# Native supported token, API create/edit/export/import without fetching a fictional URL.
token=ApiToken.objects.create(user=a,name='Fictional verification')
client=Client(HTTP_HOST='bookmarks.utilibre.org',HTTP_X_FORWARDED_PROTO='https')
body={'url':'https://example.invalid/fictional-bookmark','title':'Fictional bookmark','description':'Fictional description','notes':'Fictional private note','tag_names':['fictional','test'],'is_archived':True,'unread':True,'shared':False}
with patch('bookmarks.services.website_loader.load_website_metadata') as fetch:
 r=client.post('/api/bookmarks/?disable_scraping=true',data=json.dumps(body),content_type='application/json',HTTP_AUTHORIZATION='Token '+token.key)
 assert r.status_code==201,(r.status_code,r.content)
 assert fetch.call_count==0
bookmark=Bookmark.objects.get(owner=a);assert bookmark.notes==body['notes']
# User-selectable privacy-related options cannot start disabled jobs.
a.profile.enable_favicons=True;a.profile.web_archive_integration='enabled';a.profile.save()
assert not tasks.is_web_archive_integration_active(a)
with patch('bookmarks.services.tasks._load_favicon_task') as fetch:
 tasks.load_favicon(a,bookmark);assert fetch.call_count==0
client.force_login(a,backend='mozilla_django_oidc.auth.OIDCAuthenticationBackend')
r=client.get('/settings/export');assert r.status_code==200
html=r.content.decode();assert 'Fictional private note' in html and 'fictional-bookmark' in html
client.force_login(b,backend='mozilla_django_oidc.auth.OIDCAuthenticationBackend')
from django.core.files.uploadedfile import SimpleUploadedFile
r=client.post('/settings/import',{'import_file':SimpleUploadedFile('bookmarks.html',r.content,content_type='text/html')});assert r.status_code==302
restored=Bookmark.objects.get(owner=b);assert restored.url==body['url'] and restored.notes==body['notes'] and restored.is_archived and restored.unread and not restored.shared
assert set(restored.tag_names)==set(body['tag_names'])
# Keep fixtures for consistent backup/reopen; cleanup is a separate native operation.
Path('/etc/linkding/data/fixture-state.json').write_text(json.dumps({'users':[a.username,b.username],'ids':[bookmark.pk,restored.pk],'token':token.key,'export':html}))
print(json.dumps({'nativeApiCreate':True,'htmlExportImportRoundTrip':True,'notesTagsArchiveUnreadPreserved':True,'noExternalFaviconOrArchiveJobs':True,'anonymousDenied':client.logout() is None and Client().get('/api/bookmarks/').status_code in [401,403]}))
