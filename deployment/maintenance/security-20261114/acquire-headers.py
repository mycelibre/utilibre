"""Authenticate exact stable header archives using the existing downloader."""
from pathlib import Path
import sys,json,hashlib,os
os.umask(0o077)
HERE=Path(__file__).resolve().parent;ROOT=Path('/var/lib/utilibre-maintenance/security-20261114/headers');ROOT.mkdir(exist_ok=True)
assert sys.argv[1:] in (['debian'],['ubuntu'])
ubuntu=sys.argv[1]=='ubuntu';original=HERE.parent/'security-20261109/acquire-debian.py';code=original.read_text()
a=code.index("root=Path('/var/lib/");b=code.index('\nroot.mkdir',a)
code=code[:a]+"root=Path("+repr(str(ROOT))+ ") / ('ubuntu-acquisition' if ubuntu else 'debian-acquisition')"+code[b:]
a=code.index("want={'trixie':");b=code.index("\norigin=",a)
want={'jammy':{'linux-libc-dev':'5.15.0-203.213'}} if ubuntu else {'trixie':{'linux-libc-dev':'6.12.117-1'},'bookworm':{'linux-libc-dev':'6.1.190-1'}}
code=code[:a]+'want='+repr(want)+code[b:]
adapter=ROOT/('acquire-'+sys.argv[1]+'.py')
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
sys.argv=[str(adapter),'--download']+(['--ubuntu'] if ubuntu else [])
exec(compile(code,str(adapter),'exec'),{'__name__':'__main__','__file__':str(original)})
