"""Compile ordinary UAPI consumers and verify every runtime byte stayed intact."""
import json,hashlib,os,subprocess,tempfile,re
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
H=Path(__file__).resolve().parent;R=Path('/var/lib/utilibre-maintenance/security-20261114/headers');I=json.loads((H/'headers-inputs.json').read_text());compiler=json.load(open(R.parent/'native-builder/build.json'))
source='''#include <linux/version.h>
#include <linux/types.h>
#include <linux/netlink.h>
#include <linux/in6.h>
#include <linux/fs.h>
#include <asm/ioctls.h>
_Static_assert(sizeof(struct in6_addr)==16,"IPv6 UAPI");
_Static_assert(sizeof(struct sockaddr_nl)==12,"netlink UAPI");
_Static_assert(LINUX_VERSION_CODE==EXPECTED_VERSION,"version");
int ordinary(void){return NLMSG_SPACE(32)>32 && FS_IOC_GETFLAGS!=0;}
'''
f=R/'fixture.c';f.write_text(source);f.chmod(0o644)
for s in I['rows']:
 out=R/'vendor-debian'/s['key'];b=json.load(open(out/'build.json'));scope=json.load(open(out/'scope.json'));assert b['fullImageScopeVerified'] and scope['allRuntimeFilesUnchanged'] and scope['vendorInstalledPayloadMatches']
 assert hashlib.sha256((out/'scope.json').read_bytes()).hexdigest()==b['scopeSha256']
 p=I['packages'][s['packages']['linux-libc-dev']['package']];version=tuple(map(int,p['version'].split('-')[0].split('.')));expected=(version[0]<<16)+(version[1]<<8)+min(version[2],255)
 with tempfile.TemporaryDirectory(prefix='utilibre-headers-',dir='/dev/shm') as temp:
  subprocess.run(['dpkg-deb','-x',str(R/'debian-acquisition'/p['file']),temp],check=True,timeout=30)
  vendor_version=(Path(temp)/'usr/include/linux/version.h').read_text();expected=int(re.search(r'^#define LINUX_VERSION_CODE (\d+)$',vendor_version,re.M)[1])
  result=subprocess.run(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','.5','--memory','256m','--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,size=16m,mode=1777','-v',temp+':/headers:ro','-v',str(f)+':/fixture.c:ro','--entrypoint','gcc',compiler['imageId'],'-Werror','-DEXPECTED_VERSION='+str(expected),'-I/headers/usr/include','-I/headers/usr/include/x86_64-linux-gnu','-c','/fixture.c','-o','/tmp/fixture.o'],capture_output=True,timeout=60)
  (out/'headers-compile.log').write_bytes(result.stdout+result.stderr);assert result.returncode==0,'Header compilation failed'
 proof={'passed':True,'date':datetime.now(timezone.utc).isoformat(),'base':s['base'],'imageId':b['imageId'],'headerCompilation':True,'allRuntimeFilesUnchanged':True,'scopeSha256':b['scopeSha256'],'compiler':compiler['imageId'],'fixtureSha256':hashlib.sha256(f.read_bytes()).hexdigest(),'network':'none','productionChanged':False,'limitations':'UAPI compatibility and unchanged runtime payload; this does not update or assess the running kernel.'}
 (out/'application.json').write_text(json.dumps(proof,indent=2)+'\n');print(s['key']+': UAPI compilation and runtime preservation passed',flush=True)
