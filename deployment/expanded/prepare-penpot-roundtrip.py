#!/usr/bin/env python3
"""Prepare, but do not start, a blank RAM-backed Penpot native export check.

No production mounts, outbound network, mail, identity-provider writes or image
pulls. Run from this checkout. See docs/penpot-roundtrip-2026-10-09.md for the
startup, loopback relay, checker and exact disposable cleanup commands.
"""
import json,os,secrets,socket,tempfile,pathlib,shutil
repo=pathlib.Path(__file__).resolve().parents[2]
if shutil.disk_usage('/').free < 5 * 1024**3:
    raise SystemExit('Leave the 5 GiB recovery floor intact before starting this disposable check')
report=pathlib.Path(tempfile.mkdtemp(prefix='penpot-native-roundtrip-',dir='/opt/utilibre/reports'))
ram=pathlib.Path(tempfile.mkdtemp(prefix='utilibre-penpot-roundtrip-',dir='/dev/shm'))
assets=ram/'assets';assets.mkdir();os.chown(assets,1001,1001);os.chmod(ram,0o755)
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
name='utilibre-penpot-roundtrip-'+report.name.rsplit('-',1)[1]
flags='enable-demo-users enable-login-with-password disable-registration disable-email-verification disable-onboarding disable-telemetry disable-smtp disable-log-emails disable-log-invitation-tokens disable-prepl-server disable-mcp disable-admin-console disable-secure-session-cookies disable-google-fonts-provider disable-dashboard-templates-section enable-air-gapped-conf'
password=secrets.token_urlsafe(32);secret=secrets.token_urlsafe(48)
base={'restart':'no','networks':['isolated'],'security_opt':['no-new-privileges:true'],'logging':{'driver':'local','options':{'max-size':'2m','max-file':'2'}},'pids_limit':256,'cpus':1}
services={
'penpot-db':dict(base,image='postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73',user='70:70',read_only=True,environment={'POSTGRES_USER':'penpot','POSTGRES_DB':'penpot','POSTGRES_PASSWORD':password},tmpfs=['/var/lib/postgresql/data:rw,nosuid,nodev,noexec,size=512m,uid=70,gid=70','/var/run/postgresql:rw,nosuid,nodev,noexec,size=16m,uid=70,gid=70','/tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777'],mem_limit='384m',healthcheck={'test':['CMD','pg_isready','-U','penpot'],'interval':'2s','timeout':'2s','retries':30}),
'penpot-valkey':dict(base,image='valkey/valkey:9.1.1-alpine@sha256:de31910896150d5e754a07d57d227cfdde4e258ddd0d1aa4607f2d2f95843715',command=['valkey-server','--save','','--appendonly','no','--maxmemory','64mb','--maxmemory-policy','allkeys-lru'],tmpfs=['/data:rw,nosuid,nodev,noexec,size=80m'],mem_limit='128m'),
'penpot-backend':dict(base,image='penpotapp/backend:2.18.2@sha256:5f362bda5b8df6684a5710c4c273f7c8aadb759ba6ebcd0cde18a348ad9b9828',user='1001:1001',environment={'PENPOT_PUBLIC_URI':f'http://127.0.0.1:{port}','PENPOT_FLAGS':flags,'PENPOT_SECRET_KEY':secret,'PENPOT_DATABASE_URI':'postgresql://penpot-db/penpot','PENPOT_DATABASE_USERNAME':'penpot','PENPOT_DATABASE_PASSWORD':password,'PENPOT_REDIS_URI':'redis://penpot-valkey/0','PENPOT_OBJECTS_STORAGE_BACKEND':'fs','PENPOT_OBJECTS_STORAGE_FS_DIRECTORY':'/opt/data/assets','PENPOT_TELEMETRY_ENABLED':'false','JAVA_TOOL_OPTIONS':'-Xms256m -Xmx768m -XX:ActiveProcessorCount=2'},volumes=[f'{assets}:/opt/data/assets'],tmpfs=['/tmp:rw,nosuid,nodev,exec,size=128m,mode=1777'],mem_limit='1200m',cpus=2,depends_on={'penpot-db':{'condition':'service_healthy'}}),
'penpot-frontend':dict(base,image='penpotapp/frontend:2.18.2@sha256:3619f48cbdd0c9197ad23bd3db1c9b4391d7c9c3137e22e806cd7f9c945c1c8e',user='1001:1001',command=['/bin/sh','/usr/local/bin/utilibre-penpot-nginx-start.sh'],environment={'PENPOT_PUBLIC_URI':f'http://127.0.0.1:{port}','PENPOT_FLAGS':flags,'PENPOT_EXPORTER_URI':'http://penpot-backend:6061'},volumes=[f'{assets}:/opt/data/assets:ro',f'{repo}/deployment/expanded/penpot-nginx-start.sh:/usr/local/bin/utilibre-penpot-nginx-start.sh:ro'],ports=[f'127.0.0.1:{port}:8080'],mem_limit='256m',depends_on=['penpot-backend'])}
config={'name':name,'services':services,'networks':{'isolated':{'internal':True}}}
(report/'compose.json').write_text(json.dumps(config,indent=2));os.chmod(report/'compose.json',0o600)
(report/'metadata.json').write_text(json.dumps({'name':name,'port':port,'ram':str(ram),'report':str(report)},indent=2))
print(json.dumps({'report':str(report),'port':port,'ram':str(ram),'name':name}))
