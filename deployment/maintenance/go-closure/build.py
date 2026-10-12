#!/usr/bin/env python3
"""Serial staged Go closure builds; no production configuration or state mounts."""
import argparse, hashlib, json, os, pathlib, shutil, subprocess, tarfile, tempfile, time

os.umask(0o077)
HERE=pathlib.Path(__file__).resolve().parent
ROOT=pathlib.Path('/var/lib/utilibre-maintenance/go-closure-20261012')
ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
COMPILER='sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade'
parser=argparse.ArgumentParser();parser.add_argument('application',choices=['ferretdb','anubis']);args=parser.parse_args()
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
argv += [COMPILER,'sh','/reviewed/build-'+args.application+'.sh']
try:
 with (output/'build.log').open('wb') as log:
  completed=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,timeout=1800)
 assert completed.returncode==0, 'Go build failed; inspect private build/test receipts'
 assert shutil.disk_usage('/').free>=8*1024**3
 result={'status':'passed','date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'compiler':COMPILER,'application':args.application,'productionChanged':False,'artifacts':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in output.iterdir() if p.is_file() and p.name!='build.json'}}
 (output/'build.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
finally:
 subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 # Only this invocation's generated compiler source/cache, never application data.
 assert build.parent==ROOT and build.name.startswith(args.application+'-build-')
 shutil.rmtree(build)
