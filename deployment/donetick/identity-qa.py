"""Run with ak shell. Only distinct fictional Donetick fixtures are touched."""
import json,os,secrets
from pathlib import Path
from django.db import transaction
from authentik.core.models import User,Group,Session,AuthenticatedSession,Token
from authentik.providers.oauth2.models import AccessToken,RefreshToken
from authentik.stages.authenticator_totp.models import TOTPDevice
p=Path('/data/private/donetick-native-qa.json')
action=os.environ.get('UTILIBRE_DONETICK_QA_ACTION')
with transaction.atomic():
 if action=='prepare':
  assert not p.exists(), 'Unfinished fixture lifecycle exists'
  records=[]
  for suffix in ['a','b']:
   username='utilibre-donetick-qa-20261009-'+suffix
   assert not User.objects.filter(username=username).exists()
   email=username+'@example.invalid';password=secrets.token_urlsafe(32);key=secrets.token_hex(20)
   user=User.objects.create(username=username,name='Fictional chore tester '+suffix,email=email,path='service-checks',is_active=True,attributes={'synthetic_test_account':True,'verified_email':email})
   user.set_password(password);user.save(update_fields=['password'])
   user.ak_groups.add(Group.objects.get(name='utilibre-approved'))
   TOTPDevice.objects.create(user=user,name='Temporary Donetick fixture',key=key,confirmed=True)
   records.append({'username':username,'password':password,'totpKey':key})
  with os.fdopen(os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'w') as f:json.dump(records,f)
 elif action=='retire':
  records=json.loads(p.read_text())
  for record in records:
   u=User.objects.get(username=record['username'],path='service-checks');assert u.attributes.get('synthetic_test_account') and not u.is_superuser
   u.is_active=False;u.set_unusable_password();u.save(update_fields=['is_active','password']);u.ak_groups.clear()
   Session.objects.filter(pk__in=AuthenticatedSession.objects.filter(user=u).values('session_id')).delete()
   for model in [Token,AccessToken,RefreshToken,TOTPDevice]:model.objects.filter(user=u).delete()
  p.write_text(json.dumps([{'username':r['username'],'retired':True}for r in records]))
 else:raise ValueError('Explicit prepare/retire required')
print('Only two marked fictional Donetick identities changed.')
