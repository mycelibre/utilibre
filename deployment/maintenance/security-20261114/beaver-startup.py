"""Native app startup and auth boundary, fresh synthetic sqlite only."""
import json,os
from pathlib import Path
assert os.environ['DATABASE_URL']=='sqlite+aiosqlite:////tmp/fictional.db'
assert not Path('/tmp/fictional.db').exists()
os.environ.update(ADMIN_EMAIL='fictional-admin@example.com',HABITS_STORAGE='DATABASE',ENV='production',REQUIRE_ADMIN_FOR_REGISTRATION='true',ENABLE_DAILY_BACKUP='false',ENABLE_PLAN='false',NICEGUI_STORAGE_PATH='/app/.user/.nicegui',UMAMI_ANALYTICS_ID='',UMAMI_SCRIPT_URL='',SENTRY_DSN='',HIGHLIGHT_KEY='',GOOGLE_ONE_TAP_ENABLED='false',TRUSTED_EMAIL_HEADER='',TRUSTED_LOCAL_EMAIL='')
from fastapi.testclient import TestClient
from beaverhabits.main import app
with TestClient(app) as client:
 assert client.get('/health').status_code in (200,404)
 assert client.get('/api/v1/habits/export').status_code==401
 assert client.get('/api/v1/habits/export',headers={'Remote-User':'fictional@example.com','X-Forwarded-Email':'fictional@example.com'}).status_code==401
 assert client.post('/auth/register',json={'email':'fictional@example.com','password':'Fictional-only-unapproved-password'}).status_code==401
print(json.dumps({'passed':True,'nativeStartup':True,'anonymousExportDenied':True,'forgedHeaderDenied':True,'unapprovedRegistrationDenied':True,'limitation':'DNS/email validation separately tested; no new saved-habit or real-account verification.'}))
