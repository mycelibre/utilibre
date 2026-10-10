#!/usr/bin/env python3
"""Bounded native regression in two disposable, networkless, tmpfs databases.

Usage: python3 check-isolated.py IMAGE PRIVATE_REPORT_DIRECTORY
No live volumes, listeners, credentials or external SMTP are used. Do not remove
network isolation to make a failed check pass.
"""
import json, os, pathlib, secrets, shutil, subprocess, sys, time
os.umask(0o077)
image, report_arg = sys.argv[1:]
assert image.startswith('utilibre-simplelogin:')
report = pathlib.Path(report_arg).resolve()
assert str(report).startswith('/opt/utilibre/reports/')
report.mkdir(parents=True, exist_ok=False)
if shutil.disk_usage(report).free < 5 * 1024**3:
    raise SystemExit('Less than 5 GiB free')
source = pathlib.Path(__file__).resolve().parent
prefix = 'utilibre-sl-security-' + secrets.token_hex(4)
db, restored = prefix + '-db', prefix + '-restore'
pg = 'postgres:17.11-alpine@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73'
env = report / 'fictional.env'
env.write_text('\n'.join([
    'URL=https://simplelogin.example.invalid', 'EMAIL_DOMAIN=alias.example.org',
    'SUPPORT_EMAIL=support@example.org', 'EMAIL_SERVERS_WITH_PRIORITY=[(10,"mx.example.org")]',
    'DB_URI=postgresql+psycopg2://postgres@127.0.0.1:5432/simplelogin',
    'FLASK_SECRET=' + secrets.token_urlsafe(48), 'DISABLE_REGISTRATION=1',
    'DISABLE_ONBOARDING=1', 'EVENT_WEBHOOK_DISABLE=1', 'NOT_SEND_EMAIL=1',
    'LOCAL_FILE_UPLOAD=1', 'POSTFIX_SERVER=127.0.0.1', 'POSTFIX_PORT=1025',
]) + '\n')
created = []
def run(args, **kw):
    return subprocess.run(args, check=True, timeout=360, **kw)
def create_db(name):
    run(['docker','run','-d','--name',name,'--network','none','--memory','384m','--cpus','0.5','--pids-limit','64',
         '--tmpfs','/var/lib/postgresql/data:rw,size=512m','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=simplelogin',pg],stdout=subprocess.DEVNULL)
    created.append(name)
    for _ in range(60):
        if subprocess.run(['docker','exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:
            return
        time.sleep(.5)
    raise RuntimeError('Fixture DB did not initialize')
def app(name, command, log, selected_image=image):
    with (report/log).open('w') as out:
        run(['docker','run','--rm','--network','container:'+name,'--memory','512m','--cpus','0.75','--pids-limit','128',
             '--tmpfs','/code/static/upload:rw,size=8m,uid=1000,gid=1000','--env-file',str(env),'-e','PYTHONPATH=/code','-v',str(source)+':/verification:ro',
             '--entrypoint','/bin/sh',selected_image,'-c',command],stdout=out,stderr=subprocess.STDOUT)
try:
    create_db(db)
    app(db, 'alembic upgrade head && python init_app.py', 'migration.txt')
    app(db, 'python /verification/native-regression.py', 'native.txt')
    dump = report / 'fictional.dump'
    with dump.open('wb') as out:
        run(['docker','exec',db,'pg_dump','-U','postgres','-d','simplelogin','-Fc'],stdout=out)
    create_db(restored)
    with dump.open('rb') as inp:
        run(['docker','exec','-i',restored,'pg_restore','-U','postgres','-d','simplelogin','--no-owner'],stdin=inp)
    # Same native schema: both candidate and previous image can run Alembic at head.
    app(restored, 'alembic upgrade head', 'candidate-migration-on-restore.txt')
    app(restored, 'alembic upgrade head', 'previous-image-migration-on-restore.txt', 'utilibre-simplelogin:4.82.4-p4')
    app(restored, 'python /verification/fixture-cleanup.py', 'restored-native-deletion.txt')
    app(db, 'python /verification/fixture-cleanup.py', 'original-native-deletion.txt')
    (report/'result.json').write_text(json.dumps({'image':image,'network':'none/shared fixture loopback only','native_auth_csrf_sudo_csv_import_function_export':True,'native_oauth_cors_and_invalid_bearer_denial':True,'native_signed_token_and_pgp_roundtrips_tamper_denials':True,'requests_aiohttp_loopback':True,'native_http_login':True,'smtp_ehlo_noop_only':True,'fixture_dump_restore':True,'p4_schema_rollback_compatible':True,'native_alias_delete_and_model_account_cleanup':True,'external_mail_sent':False,'live_database_touched':False},indent=2)+'\n')
    print(report/'result.json')
finally:
    for name in reversed(created):
        subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
