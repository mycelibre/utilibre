"""Replace KitchenOwl's same-version binary-wheel extension with its native build.
The bundled directory is replaced by native libpq and its existing system deps;
no source version, account, database or application configuration is changed.
"""
import ast,hashlib,json,os,subprocess,shutil,tarfile,sys
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
here=Path(__file__).resolve().parent;root=Path('/var/lib/utilibre-maintenance/security-20261110')
i=json.loads((here/'kerberos-driver-inputs.json').read_text());d=root/'kerberos/kitchenowl';out=d/'output';ctx=d/'context';ctx.mkdir(exist_ok=True)
assert not (d/'driver.json').exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
def run(a,**kw):return subprocess.check_output(a,stderr=subprocess.PIPE,timeout=180,**kw)
limits=['--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--cpus','1','--log-driver','none']
def native(image,exe,*args):return run(['docker','run','--rm',*limits,'--entrypoint',exe,image,*args])
assert sha((d/'psycopg2_binary-2.9.12.tar.gz').read_bytes())==i['sourceSha256']
for f in [i['binary'],i['package']]:
 assert sha((out/f['file']).read_bytes())==f['sha256'];shutil.copyfile(out/f['file'],ctx/f['file']);(ctx/f['file']).chmod(0o644)
site=i['site'];ext=site+'/psycopg2/'+i['binary']['file'];dist=site+'/psycopg2_binary-2.9.12.dist-info'
files=native(i['base'],'find',site+'/psycopg2_binary.libs','-type','f').decode().splitlines();assert len(files)==15 and all(f.endswith(tuple(['.so.2.1','.so.1','.so.3','.so.2.2','.so.3.1','.so.3.3','.so.0.1','.so.1.5','.so.2.0.200','.so.1.2.0','.so.5.17','.so.3.0.0'])) for f in files)
assert native(i['base'],'python','-c','import importlib.metadata as m;assert m.version("psycopg2-binary")=="2.9.12"')==b''
metadata='''import base64,csv,hashlib,io,pathlib
site=pathlib.Path('/opt/venv/lib/python3.14/site-packages');dist=site/'psycopg2_binary-2.9.12.dist-info'
wheel=dist/'WHEEL';wheel.write_text('Wheel-Version: 1.0\\nGenerator: Utilibre same-source native rebuild\\nRoot-Is-Purelib: false\\nTag: cp314-cp314-linux_x86_64\\n')
record=dist/'RECORD';rows=list(csv.reader(io.StringIO(record.read_text())));out=[]
for row in rows:
 if row[0].startswith('psycopg2_binary.libs/'):continue
 if row[0].endswith('/WHEEL') or row[0].startswith('psycopg2/_psycopg.'):
  data=(site/row[0]).read_bytes();row=[row[0],'sha256='+base64.urlsafe_b64encode(hashlib.sha256(data).digest()).decode().rstrip('='),str(len(data))]
 out.append(row)
with record.open('w',newline='') as f:csv.writer(f).writerows(out)
'''
(ctx/'metadata.py').write_text(metadata);(ctx/'metadata.py').chmod(0o644)
cfg=lambda image:json.loads(run(['docker','image','inspect','--format','{{json .Config}}',image]))
oldcfg=cfg(i['base']);user=oldcfg['User'];assert user=='1000:1000'
(ctx/'Dockerfile').write_text(f'''FROM {i['base']}
USER 0
COPY {i['package']['file']} /tmp/libpq.deb
RUN dpkg --force-confold -i /tmp/libpq.deb && test -z "$(dpkg --audit)" && rm /tmp/libpq.deb
COPY {i['binary']['file']} {ext}
COPY metadata.py /tmp/metadata.py
RUN rm -r {site}/psycopg2_binary.libs && PYTHONDONTWRITEBYTECODE=1 python /tmp/metadata.py && rm /tmp/metadata.py
USER {user}
''')
run(['docker','build','--network','none','--pull=false','-t',i['candidate'],str(ctx)],env={**os.environ,'DOCKER_BUILDKIT':'0'})
image=run(['docker','image','inspect','--format','{{.Id}}',i['candidate']]).decode().strip();assert cfg(image)==oldcfg
inventory=lambda image:dict(l.split('\t') for l in native(image,'dpkg-query','-W','-f=${Package}\t${Version}\n').decode().splitlines())
before=inventory(i['base']);after=inventory(image);assert after.pop('libpq5')==i['package']['version'];assert after==before
# Reuse the existing full-image inventory routine, without executing its CLI.
tree=ast.parse((here/'../go-final/verify.py').read_text());fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='files')
ns={'subprocess':subprocess,'tarfile':tarfile,'hashlib':hashlib,'ZOD':False};exec(compile(ast.Module(body=[fn],type_ignores=[]),'existing-files-inventory','exec'),ns)
a,b=ns['files'](i['base']),ns['files'](image);changed=sorted(p for p in a.keys()|b.keys() if a.get(p)!=b.get(p))
pkgctx=ctx/'libpq';run(['dpkg-deb','-x',str(out/i['package']['file']),str(pkgctx)])
allowed=set(files+[ext,dist+'/WHEEL',dist+'/RECORD','/etc/ld.so.cache','/var/cache/ldconfig/aux-cache','/var/lib/dpkg/status','/var/lib/dpkg/status-old','/var/lib/dpkg/triggers/Unincorp','/var/log/dpkg.log'])
allowed.update('/'+str(p.relative_to(pkgctx)) for p in pkgctx.rglob('*') if p.is_file() or p.is_symlink())
allowed.update(p for p in changed if p.startswith('/var/lib/dpkg/info/libpq5:amd64.'))
assert set(changed)<=allowed,sorted(set(changed)-allowed)
assert all(f not in b for f in files);assert b[ext]==i['binary']['sha256']
assert not any('psycopg2_binary.libs/' in p for p in b)
text=native(image,'sh','-ec','ldd '+ext).decode();assert 'not found' not in text and 'psycopg2_binary.libs' not in text and 'libpq.so.5' in text
native(image,'python','-c','import psycopg2,psycopg2.extensions as e;assert psycopg2.__version__.startswith("2.9.12");assert e.libpq_version()==170011;assert e.adapt(42).getquoted()==b"42";assert e.parse_dsn("host=localhost dbname=fictional")["dbname"]=="fictional"')
proof={'date':datetime.now(timezone.utc).isoformat(),'passed':True,'base':i['base'],'imageId':image,'candidate':i['candidate'],'configurationUnchanged':True,'unrelatedPackagesUnchanged':True,'changedFiles':changed,'unchangedFiles':len(b)-len(changed),'removedBundledLibraries':files,'newNativePackage':i['package'],'nativeExtension':i['binary'],'fixtureSha256':sha(Path(__file__).read_bytes()),'inventoryFixtureSha256':sha((here/'../go-final/verify.py').read_bytes()),'libraryResolution':text,'network':'none','scope':'Same-version source rebuild and native system dependencies. No application deployment or database mutation.'}
(d/'driver.json').write_text(json.dumps(proof,indent=2)+'\n');print('KitchenOwl same-version native driver built; full image scope verified.')
