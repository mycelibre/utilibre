"""Finite reuse of native application fixtures; no live data or outbound mail."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[2];ROOT=Path('/var/lib/utilibre-maintenance/security-20261114/python')
I=json.loads((HERE/'python-inputs.json').read_text())
LIMITS=['--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','128','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777']
def run(args,**kw):return subprocess.run(args,capture_output=True,check=True,timeout=900,**kw)
for key in sys.argv[1:]:
 assert key in ('simplelogin-web','trip-app','records-candlr','13ft-app','unfurl-app','beaverhabits-app')
 s=next(r for r in I['rows'] if r['key']==key);out=ROOT/key;b=json.loads((out/'build.json').read_text());assert b['passed'];assert not (out/'application.json').exists()
 image=b['imageId'];assert run(['docker','image','inspect','--format','{{.Id}}',s['candidate']]).stdout.decode().strip()==image
 rows=[]
 try:
  if key=='simplelogin-web':
   fixture=REPO/'deployment/simplelogin/security/check-isolated.py';report=Path('/opt/utilibre/reports/python-20261114-simplelogin')
   p=run(['python3',str(fixture),image,str(report)]);native=json.loads((report/'result.json').read_text());assert not native['external_mail_sent'] and not native['live_database_touched'];rows.append(native)
  elif key=='records-candlr':
   fixture=HERE.parent/'patch-leaves-final/candlr-native.cjs'
   cmd="cd /app/backend && alembic upgrade head && uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log >/tmp/server.log 2>&1 & pid=$!; trap 'kill $pid 2>/dev/null || true' EXIT; for n in $(seq 1 40); do node -e \"fetch('http://127.0.0.1:8000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\" 2>/dev/null && break; sleep .5; done; node /fixture.cjs"
   p=run(['docker','run','--rm',*LIMITS,'--user','1000:1000','--tmpfs','/app/backend/data:rw,size=64m,uid=1000,gid=1000','-v',str(fixture)+':/fixture.cjs:ro','-e','SECRET_KEY=Fictional-only-native-key-longer-than-thirty-two','-e','ENABLE_REGISTRATIONS=true','-e','OIDC_ENABLED=false','-e','OIDC_DISABLE_PASSWORD_LOGIN=false','-e','CARDDAV_SYNC_INTERVAL_MINUTES=0','-e','UTILIBRE_DISABLE_UPDATE_CHECK=true','--entrypoint','sh',image,'-c',cmd]);rows.append(json.loads(p.stdout.decode().strip().splitlines()[-1]))
  elif key=='trip-app':
   fixture=HERE.parent/'security-20261109/oauth-trip.py'
   p=run(['docker','run','--rm','-i',*LIMITS,'--tmpfs','/app/storage:rw,size=64m,uid=1000,gid=1000','-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','SQLITE_FILE=/app/storage/trip.sqlite','-e','SECRET_KEY=fictional-isolated-fixture-only','-e','REGISTER_ENABLE=false','-e','OIDC_CLIENT_ID=','-e','OIDC_CLIENT_SECRET=','--entrypoint',s['python'],image,'-B','-'],input=fixture.read_bytes());rows.append(json.loads(p.stdout.decode().strip().splitlines()[-1]))
  elif key in ('13ft-app','unfurl-app'):
   fixture=REPO/('deployment/13ft/check-fetch.py' if key=='13ft-app' else 'deployment/unfurl/check-native.py')
   # Both old and new selectors must preserve actual requested reading behavior.
   for candidate in [s['base'],image]:
    p=run(['docker','run','--rm','-i',*LIMITS,'-e','UNFURL_HEADER_ONLY=true','-e','PYTHONPATH='+('/upstream/app' if key=='13ft-app' else '/app'),'--entrypoint',s['python'],candidate,'-B','-'],input=fixture.read_bytes());rows.append({'imageId':candidate,'passed':True})
  else:
   # DNS is used through email-validator. Its ten ordinary/loopback checks are
   # already captured by prepare-python; retain startup/auth checks separately.
   fixture=HERE/'beaver-startup.py'
   p=run(['docker','run','--rm','-i',*LIMITS,'--tmpfs','/app/.user:rw,size=64m,uid=1000,gid=1000','-e','NICEGUI_STORAGE_SECRET=fictional-isolated-only','-e','DATABASE_URL=sqlite+aiosqlite:////tmp/fictional.db','--entrypoint',s['python'],image,'-B','-'],input=fixture.read_bytes());rows.append(json.loads(p.stdout.decode().strip().splitlines()[-1]))
  (out/'application-run.log').write_bytes(p.stdout+p.stderr)
  proof={'passed':True,'date':datetime.now(timezone.utc).isoformat(),'imageId':image,'base':s['base'],'fixture':str(fixture.relative_to(REPO)),'fixtureSha256':hashlib.sha256(fixture.read_bytes()).hexdigest(),'native':rows,'productionChanged':False,'network':'none; synthetic loopback/mocked fetch only','limitations':'Bounded native task/API checks; no live mail, public provider, or new physical-device test.'}
  (out/'application.json').write_text(json.dumps(proof,indent=2)+'\n');print(key+': native consumer checks passed',flush=True)
 except subprocess.CalledProcessError as e:
  (out/'application-error.log').write_bytes((e.stdout or b'')+(e.stderr or b''));raise SystemExit(key+': isolated check failed; private diagnostic retained')
