"""Keep DHI's exact native dependencies with the same rebuilt Git payload."""
import hashlib,json,os,subprocess
from pathlib import Path
os.umask(0o077)
h=Path(__file__).resolve().parent;r=Path('/var/lib/utilibre-maintenance/security-20261114/git')
i=json.loads((h/'git-inputs.json').read_text());s=next(x for x in i['rows'] if x['key']=='penpot-exporter')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
base=r/i['packages']['git']['file'];assert sha(base)==i['packages']['git']['sha256']
deps='libc6 (>= 2.41), libcurl4t64 (>= 8.14.1), libexpat1 (>= 1.95.8), libpcre2-8-0 (>= 10.46), zlib1g (>= 1:1.2.3.3.dfsg-1), perl, liberror-perl'
out=r/i['packages']['git-dhi']['file']
if out.exists():
 assert sha(out)==i['packages']['git-dhi']['sha256'];print('Exact DHI Git candidate already present; no rebuild');raise SystemExit(0)
actual=subprocess.check_output(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--pids-limit','32','--log-driver','none','--entrypoint','dpkg-query',s['base'],'-W','-f=${Depends}','git'],text=True).strip();assert actual==deps
d=r/'package-dhi';assert not d.exists();subprocess.run(['dpkg-deb','--raw-extract',str(base),str(d)],check=True,timeout=30)
c=d/'DEBIAN/control';lines=c.read_text().splitlines();assert sum(l.startswith('Depends: ') for l in lines)==1
c.write_text('\n'.join('Depends: '+deps if l.startswith('Depends: ') else l for l in lines)+'\n')
subprocess.run(['dpkg-deb','--root-owner-group','-Zxz','--build',str(d),str(out)],check=True,timeout=120)
print('DHI candidate repackaged with native dependencies; reassess resulting artifact identity before release')
