"""Reuse reviewed isolated native checks; only adapt private evidence destinations."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261109/zlib')
manifest=json.loads((HERE/'zlib-inputs.json').read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def checked(path):
 p=(HERE/path).resolve();assert sha(p)==manifest['consumerFixtureHashes'][path];return p

def adapter(path, replacements, variant=""):
 p=checked(path);code=p.read_text()
 for old,new,count in replacements:
  assert code.count(old)==count,(path,old,code.count(old));code=code.replace(old,new)
 out=ROOT/'adapters'/(p.stem+variant+p.suffix);out.parent.mkdir(exist_ok=True)
 if out.exists():assert out.read_text()==code
 else:out.write_text(code)
 return p,out

def execute(args,log,timeout=240):
 with log.open('x') as f:subprocess.run(args,stdout=f,stderr=f,check=True,timeout=timeout,preexec_fn=lambda: os.umask(0o022))

def consumer(path,keys):
 changes=[('/var/lib/utilibre-maintenance/security-20261109/musl',str(ROOT),1)]
 if keys==['binternet-onion-tor']:
  changes.append(("version = run(args + ['--version']).stdout.decode().strip()", "version = run(args + ['--version']).stdout.decode().strip()\n    assert ', Zlib 1.3.2,' in version or ', Zlib 1.4,' in version\n    (ROOT / 'binternet-onion-tor' / ('tor-version-'+image[7:]+'.txt')).write_text(version+'\\n')\n    version = version.replace(', Zlib 1.3.2,', ', Zlib REVIEWED,').replace(', Zlib 1.4,', ', Zlib REVIEWED,')",1))
 p,a=adapter(path,changes,'-tor' if keys==['binternet-onion-tor'] else '')
 sys.argv=[str(p),*keys]
 exec(compile(a.read_text(),str(a),'exec'),{'__file__':str(p),'__name__':'__main__'})
 for key in keys:
  f=ROOT/key/'consumer.json';r=json.loads(f.read_text());r['adapter']={'originalFixture':str(p),'originalSha256':sha(p),'path':str(a),'sha256':sha(a),'changes':['private evidence root', *(['normalize only the two pinned zlib version strings in tor --version; raw strings retained'] if keys==['binternet-onion-tor'] else [])]};f.write_text(json.dumps(r,indent=2)+'\n')

assert sys.argv[1:] and len(set(sys.argv[1:]))==len(sys.argv[1:])
keys=sys.argv[1:]
for key in keys:
 spec=next(r for r in manifest['rows'] if r['key']==key);d=ROOT/key;b=json.loads((d/'build.json').read_text());assert b['passed'] and b['base']==spec['base']
 if key in ['community-ntfy','opengist-opengist']:
  p=checked('../go-leaf-final/'+('check-ntfy.py' if key=='community-ntfy' else 'check-opengist.py'))
  for label,image in [('before',b['base']),('after',b['imageId'])]:execute(['python3',str(p),'--image-id',image,'--output',str(d/(label+'-native.json'))],d/(label+'-native.log'))
  consumer('check-musl-proxy.py',[key])
 elif key in ['pack-galene-galene','additions-fmd']:
  filename='../go-final/check-galene.mjs' if key.startswith('pack-') else '../go-runtime-20261011/check-fmd.mjs'
  changes=[(r'\/musl\/',r'\/zlib\/',1)]
  if key=='pack-galene-galene':
   child,child_adapter=adapter('../../pack/check-galene-lifecycle.mjs',[('/var/lib/utilibre-maintenance/security-20261109/musl/',str(ROOT)+'/',1),('../../portal/node_modules/playwright-core/index.mjs','/home/ubuntu/freetools/portal/node_modules/playwright-core/index.mjs',1)])
   changes.append(('deployment/pack/check-galene-lifecycle.mjs',str(child_adapter),1))
  p,a=adapter(filename,changes)
  for label,image in [('before',b['base']),('after',b['imageId'])]:
   out=d/label;out.mkdir(exist_ok=False)
   args=['node',str(a),'--image-id',image]
   if key=='additions-fmd':args+=['--base-id',b['base']]
   execute(args+['--output',str(out)],d/(label+'-native.log'))
  consumer('check-musl-special.py',[key])
 elif key=='binternet-onion-tor':consumer('check-musl-special.py',[key])
 elif key in ['reader-evaluation-safetwitch-backend','reader-evaluation-gothub']:
  alias='safetwitch' if 'safetwitch' in key else 'gothub'
  p,a=adapter('../go-final/check-native.mjs',[('/var/lib/utilibre-maintenance/security-20261109/musl',str(ROOT),1)])
  execute(['node',str(a),'--musl-nov9',alias],d/'native.log')
  f=d/'application.json';r=json.loads(f.read_text());assert r['fixtureSha256']==sha(a);r['adapterSha256']=sha(a);r['fixtureSha256']=sha(p);r['originalFixture']=str(p);f.write_text(json.dumps(r,indent=2)+'\n')
  consumer('check-musl-proxy.py',[key])
 else:raise AssertionError('Not a reviewed native consumer')
 print(key+': isolated native fixtures passed',flush=True)
