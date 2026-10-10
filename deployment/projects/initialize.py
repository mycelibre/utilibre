#!/usr/bin/env python3
"""Initialize only the new Projects instance. Existing state is never overwritten."""
import json,os,pathlib,secrets
os.umask(0o077)
root=pathlib.Path('/opt/utilibre/projects');private=root/'private';private.mkdir(parents=True,exist_ok=True,mode=0o700)
assert not (private/'runtime.env').exists(),'Existing Projects settings preserved'
owner=json.loads((private/'operator.json').read_text());oidc=json.loads((private/'oidc.json').read_text());assert owner['email'] and oidc['client_id']=='utilibre-projects'
password=secrets.token_hex(24);database={'POSTGRES_USER':'projects','POSTGRES_DB':'projects','POSTGRES_PASSWORD':password,'POSTGRES_INITDB_ARGS':'--auth-host=scram-sha-256'}
values={
 'DATABASE_URL':f'postgresql://projects:{password}@db:5432/projects',
 'SECRET_KEY':secrets.token_hex(32),'BASE_URL':'https://projects.utilibre.org',
 'DEFAULT_ADMIN_EMAIL':owner['email'],'DEFAULT_ADMIN_PASSWORD':secrets.token_hex(32),
 'OIDC_ISSUER':'https://auth.utilibre.org/application/o/projects/',
 'OIDC_CLIENT_ID':oidc['client_id'],'OIDC_CLIENT_SECRET':oidc['client_secret'],
 'OIDC_SCOPES':'openid email profile','OIDC_CLAIMS_SOURCE':'id_token','OIDC_FULLNAME_ATTRIBUTES':'name',
 'OIDC_USERNAME_ATTRIBUTE':'preferred_username','OIDC_EMAIL_ATTRIBUTE':'email',
 'OIDC_ID_TOKEN_SIGNED_RESPONSE_ALG':'RS256','OIDC_USE_DEFAULT_RESPONSE_MODE':'true',
 'OIDC_ENFORCED':'true','OIDC_IGNORE_ROLES':'true','OIDC_IGNORE_USERNAME':'true','ALLOW_ALL_TO_CREATE_PROJECTS':'true',
 'SERVICE_NAME':'Projects · Utilibre','TRUST_PROXY':'1','WEBHOOKS':'[]','LOG_FILE':'/dev/null',
 'NODE_OPTIONS':'--max-old-space-size=384',
 'THEME':json.dumps({'feedback':{'default':{'items':[{'type':'chat','title':'More tools / Más herramientas','description':'Return to Utilibre / Volvé a Utilibre','href':'https://utilibre.org/'}]}}},ensure_ascii=False,separators=(',',':')),
}
for name,data in [('runtime.env',values),('database.env',database)]:
 with (private/name).open('x') as f:f.write(''.join(k+'='+v+'\n' for k,v in data.items()))
for name in ['avatars','backgrounds','attachments']:
 p=root/'data'/name;p.mkdir(parents=True,exist_ok=True,mode=0o750);os.chown(p,1000,1000)
p=root/'database';p.mkdir(mode=0o700,exist_ok=True);os.chown(p,70,70)
(root/'backups').mkdir(mode=0o700,exist_ok=True)
print('New Projects private configuration initialized; verified operator mapping, native OIDC, no SMTP/webhooks/stats token.')
