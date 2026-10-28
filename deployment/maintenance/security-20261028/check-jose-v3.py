"""Test the finite v3 RSA backport; this never builds/deploys an application."""
import pathlib,json,subprocess,zipfile,hashlib,os,sys
os.umask(0o077)
root=pathlib.Path('/var/lib/utilibre-maintenance/security-20261028/jose');here=pathlib.Path(__file__).resolve().parent
spec=json.loads((here/'jose-v3-inputs.json').read_text());archive=root/'input/v3.0.5.zip';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(archive)==spec['archiveSha256'];assert sha(here/'jose-v3-rsa.patch')==spec['patchSha256']
(root/'v3-cache').mkdir(exist_ok=True)
fixture=(here/'jose-regression_test.go').read_text().replace('key any;pub any','key interface{};pub interface{}').replace('github.com/go-jose/go-jose/v4','github.com/go-jose/go-jose/v3').replace('jose.ParseSigned(serial,[]jose.SignatureAlgorithm{c.alg})','jose.ParseSigned(serial)').replace('jose.ParseSigned(strings.Join(parts,"."),[]jose.SignatureAlgorithm{c.alg})','jose.ParseSigned(strings.Join(parts,"."))').replace('jose.ParseEncrypted(wire,[]jose.KeyAlgorithm{jose.DIRECT},[]jose.ContentEncryption{jose.A256GCM})','jose.ParseEncrypted(wire)')
rows=[]
for fixed in [False,True]:
 name='v3-fixed' if fixed else 'v3-baseline';dest=root/'regression'/name;dest.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(archive) as z:
  prefix='github.com/go-jose/go-jose/v3@v3.0.5/'
  for entry in z.infolist():
   assert entry.filename.startswith(prefix);rel=pathlib.PurePosixPath(entry.filename[len(prefix):]);assert not rel.is_absolute() and '..' not in rel.parts;p=dest/rel
   if entry.is_dir():p.mkdir(parents=True,exist_ok=True)
   else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(entry))
 assert sha(dest/'jwk.go')==spec['beforeSha256']
 if fixed:
  subprocess.run(['git','apply','--check',str(here/'jose-v3-rsa.patch')],cwd=dest,check=True)
  subprocess.run(['git','apply',str(here/'jose-v3-rsa.patch')],cwd=dest,check=True)
  assert sha(dest/'jwk.go')==spec['afterSha256']
 (dest/'utilibre_regression_test.go').write_text(fixture)
 download='--download' in sys.argv
 args=['docker','run','--rm','--network','bridge' if download else 'none','--read-only','--cpus','1','--memory','2g','--memory-swap','2g','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=1500m','-v',str(dest)+':/source:ro','-v',str(root/'v3-cache')+':/modules'+('' if download else ':ro'),'-e','GOTELEMETRY=off','-e','GOTOOLCHAIN=local','-e','GOCACHE=/work/cache','-e','GOPATH=/work/go','-e','GOMODCACHE=/modules','-e','TMPDIR=/work/tmp','-e','GOMAXPROCS=1','-e','UTILIBRE_FIXED='+('1' if fixed else '0')]
 if not download:args+=['-e','GOPROXY=off','-e','GOSUMDB=off']
 args+=['sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b','sh','-c','mkdir -p /work/src /work/tmp; cp -a /source/. /work/src; cd /work/src; '+('go mod download all; go mod verify' if download else 'go test -count=1 -p 1 -json ./...')]
 log=root/(name+('-download' if download else '')+'.log')
 if log.exists():
  previous=log.with_name(log.stem+'-previous-'+hashlib.sha256(log.read_bytes()).hexdigest()[:12]+'.log');log.rename(previous)
 with log.open('w') as out:r=subprocess.run(args,stdout=out,stderr=out,timeout=420)
 assert r.returncode==0,name+' failed; private evidence retained'
 if download:continue
 events=[]
 for line in log.read_text().splitlines():
  try:events.append(json.loads(line))
  except json.JSONDecodeError:pass
 passed=[e for e in events if e.get('Action')=='pass' and e.get('Test')];assert any(e['Test']=='TestUtilibreModulusBoundary' for e in passed)
 rows.append(dict(patched=fixed,passedTests=len(passed),modulusBoundaryRejected=fixed,sourceSha256=sha(dest/'jwk.go')));print(name+': native suites passed',flush=True)
if rows:(root/'v3-regression.json').write_text(json.dumps(dict(passed=True,rows=rows,patchSha256=spec['patchSha256'],fixtureSha256=hashlib.sha256(fixture.encode()).hexdigest(),applicationVerification=False,deployed=False),indent=2)+'\n')
