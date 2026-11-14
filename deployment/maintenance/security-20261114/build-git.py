"""Pinned native Git build; isolated CPU/memory-bounded upstream regression suite."""
import os,json,hashlib,subprocess
from pathlib import Path
os.umask(0o077)
r=Path('/var/lib/utilibre-maintenance/security-20261114');out=r/'git';out.mkdir(exist_ok=True);source=Path('/var/lib/utilibre-maintenance/git-vendor-20261112/source/git-2.54.1.tar.xz');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(source)=='ca988eb9af7d8770339df7cdc38106fec8244664ff886840767cb9be3ef0e16c'
c=json.load(open(r/'native-builder/build.json'));assert c['passed'];script=Path(__file__).with_suffix('.sh');assert not (out/'build.json').exists()
args=['docker','run','--rm','--name','utilibre-git-native-build-nov14','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','2','--memory','3g','--memory-swap','3g','--pids-limit','256','--log-driver','none','--tmpfs','/work:rw,exec,size=2g,mode=1777','--tmpfs','/tmp:rw,exec,size=128m,mode=1777','-v',str(source)+':/input/git-2.54.1.tar.xz:ro','-v',str(script)+':/recipe.sh:ro','-v',str(out)+':/output','--entrypoint','sh',c['imageId'],'/recipe.sh']
with (out/'build.log').open('wb') as f:p=subprocess.run(args,stdout=f,stderr=f,timeout=2400)
assert p.returncode==0,'Private Git build log retained'
proof={'passed':True,'compiler':c['imageId'],'sourceSha256':sha(source),'scriptSha256':sha(script),'runtimeSha256':sha(out/'git-runtime.tar.xz'),'upstreamTests':{p.name:sha(p) for p in (out/'test-results').iterdir() if p.is_file()},'network':'none','productionChanged':False}
(out/'build.json').write_text(json.dumps(proof,indent=2)+'\n');print('Git native build and upstream tests passed')
