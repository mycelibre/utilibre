"""Controlled signed dependency acquisition, then a network-free native builder.

Only the disposable compiler changes; no host packages or production mounts.
Archived replay uses its exact DEBs and does not resolve versions again.
"""
import hashlib,json,os,subprocess,sys,shutil
from pathlib import Path
os.umask(0o077)
r=Path('/var/lib/utilibre-maintenance/security-20261114/native-builder');r.mkdir(exist_ok=True)
assert sys.argv[1:] in (['download'],['build']);base=json.loads((r/'base.json').read_text())['id']
def run(args,log,timeout=600):
 with (r/log).open('wb') as f:p=subprocess.run(args,stdout=f,stderr=f,timeout=timeout,env={**os.environ,"DOCKER_BUILDKIT":"0"})
 assert p.returncode==0,'Private '+log+' retained'
def sha(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
assert shutil.disk_usage(r).free>8*1024**3
if sys.argv[1]=='download':
 assert not (r/'inputs.json').exists()
 packages='build-essential dpkg-dev autoconf automake libtool pkgconf flex bison quilt xutils-dev xfonts-utils x11proto-dev xtrans-dev libxau-dev libxdmcp-dev libxfont-dev libpixman-1-dev libxkbfile-dev nettle-dev libudev-dev libselinux1-dev libaudit-dev libdrm-dev libglvnd-dev mesa-common-dev libunwind-dev libxshmfence-dev libepoxy-dev libegl1-mesa-dev libgbm-dev libdbus-1-dev libsystemd-dev libbsd-dev xauth x11-utils x11-xkb-utils xkb-data qpdf libcurl4-gnutls-dev libpcre2-dev gettext'
 run(['docker','run','--rm','--name','utilibre-native-deps-nov14','--memory','512m','--cpus','.75','--pids-limit','96','--cap-drop','ALL','--cap-add','CHOWN','--cap-add','SETUID','--cap-add','SETGID','--cap-add','FOWNER','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--log-driver','none','-v',str(r)+':/evidence','--entrypoint','sh',base,'-ec','mkdir -p /evidence/archives/partial; apt-get -o APT::Update::Error-Mode=any update; apt-get -y --download-only --no-install-recommends -o Dir::Cache::archives=/evidence/archives install '+packages+'; cp -a /var/lib/apt/lists /evidence/lists; dpkg-query -W -f=\'${Package} ${Version}\\n\' > /evidence/base-packages.txt'],'download-retry.log')
 archives=[]
 for p in sorted((r/'archives').glob('*.deb')):
  v=subprocess.check_output(['dpkg-deb','-f',str(p),'Package','Version','Architecture'],text=True)
  archives.append({'file':p.name,'sha256':sha(p),'bytes':p.stat().st_size,'control':v})
 assert archives
 (r/'inputs.json').write_text(json.dumps({'base':base,'packagesRequested':packages.split(),'archives':archives,'aptAuthenticatedIndexes':{p.name:sha(p) for p in (r/'lists').iterdir() if p.is_file()},'baseInventorySha256':sha(r/'base-packages.txt'),'method':'APT authenticated finite compiler dependency acquisition; archived DEBs replayed offline'},indent=2)+'\n')
 print('Authenticated compiler inputs captured')
else:
 i=json.loads((r/'inputs.json').read_text());assert i['base']==base
 context=r/'context';context.mkdir(exist_ok=True)
 for p in i['archives']:
  source=r/'archives'/p['file'];assert sha(source)==p['sha256'];shutil.copyfile(source,context/p['file']);(context/p['file']).chmod(0o644)
 (context/'Dockerfile').write_text('FROM '+base+'\nCOPY *.deb /tmp/native-deps/\nRUN printf \'#!/bin/sh\\nexit 101\\n\' > /usr/sbin/policy-rc.d && chmod 755 /usr/sbin/policy-rc.d && dpkg -i /tmp/native-deps/*.deb && test -z "$(dpkg --audit)" && rm -r /tmp/native-deps\n')
 run(['docker','build','--network','none','--pull=false','--memory','1g','--cpu-period','100000','--cpu-quota','100000','-t','utilibre-native-compiler:20261114',str(context)],'build.log')
 image=subprocess.check_output(['docker','image','inspect','--format','{{.Id}}','utilibre-native-compiler:20261114'],text=True).strip()
 (r/'build.json').write_text(json.dumps({'passed':True,'base':base,'imageId':image,'inputsSha256':sha(r/'inputs.json'),'network':'none','productionChanged':False},indent=2)+'\n');print('Native compiler prepared offline')
