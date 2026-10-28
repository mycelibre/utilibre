#!/usr/bin/env python3
"""Serial staged Go closure builds; no production configuration or state mounts."""
import argparse, hashlib, json, os, pathlib, shutil, subprocess, tarfile, tempfile, time

os.umask(0o077)
HERE=pathlib.Path(__file__).resolve().parent
PRIOR=pathlib.Path('/var/lib/utilibre-maintenance/go-closure-20261012')
ROOT=PRIOR
ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
COMPILER='sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade'
parser=argparse.ArgumentParser();parser.add_argument('application',choices=['ferretdb','anubis']);parser.add_argument('--oct28',choices=['download','build']);parser.add_argument('--codec',action='store_true');args=parser.parse_args()
assert not args.codec or args.application=='ferretdb' and args.oct28
if args.oct28:
 ROOT=pathlib.Path('/var/lib/utilibre-maintenance/security-20261028/'+('codec' if args.codec else 'go-closure'));ROOT.mkdir(mode=0o700,parents=True,exist_ok=True)
 COMPILER=subprocess.check_output(['docker','image','inspect','--format','{{.Id}}','utilibre-go-compiler:1.26.10-20261028'],text=True).strip()
 assert COMPILER=='sha256:5bba7feafd0a05a85a6454714b44e5909beebda3dfda1018bb0f4fd5acc66d1f'
 previous=json.loads((PRIOR/args.application/'build.json').read_text())
 reviewed=ROOT/'reviewed'/args.application;reviewed.mkdir(parents=True,exist_ok=True)
 for f in ['go.mod','go.sum']:
  source=PRIOR/args.application/(args.application+'-'+f)
  assert hashlib.sha256(source.read_bytes()).hexdigest()==previous['artifacts'][source.name]
  if args.codec:
   inputs=json.loads((HERE.parent/'security-20261028/codec-inputs.json').read_text());spec=next(s for s in inputs['rows'] if s['key']=='ferretdb')
   source=HERE.parent/'security-20261028/locks/codec/ferretdb'/f
   assert hashlib.sha256(source.read_bytes()).hexdigest()==spec['locks'][f]
  shutil.copyfile(source,reviewed/f)
 assert not (ROOT/args.application/'build.json').exists(),'Preserve completed candidate'

assert shutil.disk_usage('/').free >= 8*1024**3+2*1024**3, 'Two-GiB bounded build reserve above eight-GiB floor required'
name='maintenance-go-closure-'+args.application
assert not subprocess.check_output(['docker','ps','-aq','--filter','name=^/'+name+'$']).strip()
build=pathlib.Path(tempfile.mkdtemp(prefix=args.application+'-build-',dir=ROOT))
output=ROOT/args.application;output.mkdir(mode=0o700,exist_ok=True)
argv=['docker','run','--rm','--name',name,'--cpus','2','--memory','2g','--memory-swap','2g','--pids-limit','256','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,exec,size=384m,mode=1777','-v',str(build)+':/build','-v',str(output)+':/output','-v',str(HERE)+':/reviewed:ro']
if args.application=='ferretdb':
 archive=pathlib.Path('/var/lib/utilibre-maintenance/ferretdb-libraries-20261011/source.tar.gz')
 assert hashlib.sha256(archive.read_bytes()).hexdigest()=='7f17d04d55e272365208291473045cbc3d8e460033a94b8085c373b22a57f5c1'
 with tarfile.open(archive) as source:
  source.extractall(build,filter='data')
 (build/'FerretDB-0d5eb3343a50b800634cc08ace608bb6f3a3f74b').rename(build/'source')
 result=subprocess.run(['patch','--batch','--fuzz=0','-p1','-i',str(HERE/'ferretdb-mcp-v1.patch')],cwd=build/'source',stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 assert result.returncode==0, 'Exact MCP adapter patch failed'
 shutil.copyfile(HERE/'mcp_contract_test.go',build/'source/internal/mcp/utilibre_contract_test.go')
 argv += ['-v','/var/lib/utilibre-maintenance/ferretdb-libraries-20261011:/input:ro','-v',str(HERE.parent/'ferretdb-libraries')+':/previous:ro']
else:
 argv += ['-v','/var/lib/utilibre-maintenance/go-leaf-final-20261011/source/anubis:/source:ro','-v','/var/lib/utilibre-maintenance/go-leaf-final-20261011/input/anubis-assets:/assets:ro','-v',str(HERE.parent/'go-leaf-final/locks/anubis')+':/previous:ro']
if args.oct28:
 modules=ROOT/'modules';modules.mkdir(exist_ok=True)
 argv += ['--network','bridge' if args.oct28=='download' else 'none','-e','EXPECTED_GO=1.26.10','-e','UTILIBRE_PHASE='+args.oct28,'-v',str(modules)+':/modules'+('' if args.oct28=='download' else ':ro'),'-v',str(reviewed)+':/locks:ro','-e','UTILIBRE_LOCKS=/locks']
 if args.application=='anubis':
  source=pathlib.Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/source/anubis')
  assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()=='d39e26cedcc96bea5e4915297c756e7eec74aaf7'
  assert not subprocess.check_output(['git','-C',str(source),'status','--porcelain']).strip()
argv += [COMPILER,'sh','/reviewed/build-'+args.application+'.sh']
try:
 with (output/((args.oct28 or 'build')+'.log')).open('wb') as log:
  completed=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,timeout=1800)
 assert completed.returncode==0, 'Go build failed; inspect private build/test receipts'
 assert shutil.disk_usage('/').free>=8*1024**3
 result={'status':'passed','date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'compiler':COMPILER,'application':args.application,'productionChanged':False,'phase':args.oct28 or 'legacy','network':'none' if args.oct28=='build' else 'controlled dependency acquisition','artifacts':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in output.iterdir() if p.is_file() and p.name!='build.json'}}
 (output/('download.json' if args.oct28=='download' else 'build.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
finally:
 subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 # Only this invocation's generated compiler source/cache, never application data.
 assert build.parent==ROOT and build.name.startswith(args.application+'-build-')
 shutil.rmtree(build)
