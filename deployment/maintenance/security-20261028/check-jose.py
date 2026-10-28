"""Upstream native suites and bounded before/after regression; network disabled."""
import pathlib,json,subprocess,zipfile,hashlib,os
os.umask(0o077)
root=pathlib.Path('/var/lib/utilibre-maintenance/security-20261028/jose');here=pathlib.Path(__file__).resolve().parent
rows=[]
for ver in ['v4.1.4','v4.1.5','v4.1.6']:
 archive=root/'input'/(ver+'.zip'); sha=hashlib.file_digest(archive.open('rb'),'sha256').hexdigest(); dest=root/'regression'/ver;dest.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(archive) as z:
  prefix='github.com/go-jose/go-jose/'+ver.replace('v4.','v4@v4.')+'/'
  for entry in z.infolist():
   assert entry.filename.startswith(prefix);rel=pathlib.PurePosixPath(entry.filename[len(prefix):]);assert not rel.is_absolute() and '..' not in rel.parts
   p=dest/rel
   if entry.is_dir():p.mkdir(parents=True,exist_ok=True)
   else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(entry))
 (dest/'utilibre_regression_test.go').write_bytes((here/'jose-regression_test.go').read_bytes())
 with (root/('regression-'+ver+'.log')).open('w') as log:
  r=subprocess.run(['docker','run','--rm','--network','none','--read-only','--cpus','2','--memory','2g','--memory-swap','2g','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=1500m','-v',str(dest)+':/source:ro','-e','GOTELEMETRY=off','-e','GOTOOLCHAIN=local','-e','GOPROXY=off','-e','GOSUMDB=off','-e','GOCACHE=/work/cache','-e','GOPATH=/work/go','-e','TMPDIR=/work/tmp','-e','GOMAXPROCS=2','-e','UTILIBRE_FIXED='+('1' if ver=='v4.1.6' else '0'),'sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b','sh','-c','mkdir -p /work/src /work/tmp; cp -a /source/. /work/src; cd /work/src; go test -count=1 -p 2 -json ./...'],stdout=log,stderr=log,timeout=420)
 assert r.returncode==0,ver+' tests failed; private evidence retained'
 events=[]
 for line in (root/('regression-'+ver+'.log')).read_text().splitlines():
  try:events.append(json.loads(line))
  except json.JSONDecodeError:pass
 passed=[x for x in events if x.get('Action')=='pass' and x.get('Test')];assert any(x['Test']=='TestUtilibreModulusBoundary' for x in passed)
 rows.append(dict(version=ver,archiveSha256=sha,passedTests=len(passed),modulusBoundaryRejected=ver=='v4.1.6',nativeRoundTrips=True))
 print(ver+': native suite and bounded regression passed',flush=True)
(root/'regression.json').write_text(json.dumps(dict(passed=True,version='v4.1.6',fixtureSha256=hashlib.sha256((here/'jose-regression_test.go').read_bytes()).hexdigest(),rows=rows,limits='No CPU exhaustion benchmark or live attack. Old versions accept a 4097-bit public modulus; fixed version rejects it. Full upstream suites plus legitimate JWK/JWS/JWE round trips run offline.'),indent=2)+'\n')
