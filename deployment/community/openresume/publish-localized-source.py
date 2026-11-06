"""Publish only this exact reviewed application's tracked source and integration files."""
from pathlib import Path
import argparse, hashlib, os, shutil, subprocess, tarfile, tempfile
here = Path(__file__).resolve().parent
repo = here.parents[2]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('source', type=Path)
p.add_argument('--publish', action='store_true', help='Explicitly replace the existing corresponding-source offer')
a = p.parse_args(); src = a.source.resolve()
assert subprocess.check_output(['git','-c','safe.directory='+str(src),'rev-parse','HEAD'],cwd=src,text=True).strip() == '4f8255a2c763479837f69f1dccf2a3338730cd79'
files = subprocess.check_output(['git','-c','safe.directory='+str(src),'ls-files','-z'],cwd=src).decode().split('\0')
assert 'src/app/lib/utilibre-locale.ts' in files
stage = Path(tempfile.mkdtemp(prefix='openresume-source-', dir='/var/lib/utilibre-maintenance/cv-20261106'))
archive = stage/'openresume-utilibre.tar.gz'
def scrub(info):
    info.uid=info.gid=0;info.uname=info.gname='';return info
with tarfile.open(archive,'w:gz') as t:
    for relative in files:
        if not relative: continue
        file=src/relative
        assert not file.is_symlink() and file.is_file()
        assert not any(x in {'.git','node_modules','.env','.env.local','.env.production'} for x in Path(relative).parts)
        t.add(file,arcname='openresume/'+relative,filter=scrub)
    for name in ['build.py','build-localized.py','privacy-static.patch','spanish-workflow.patch','ResumePDFIcon.tsx','nginx.conf','Dockerfile.localized','check-workflow.mjs','README.md']:
        t.add(here/name,arcname='openresume/utilibre-deployment/'+name,filter=scrub)
    for name in ['resume-examples.ts']:
        t.add(repo/'portal/src/pages'/name,arcname='openresume/utilibre-deployment/'+name,filter=scrub)
if a.publish:
    target=Path('/opt/utilibre/toolbox-public/openresume-utilibre.tar.gz')
    shutil.copyfile(target,stage/'previous-openresume-utilibre.tar.gz')
    shutil.copyfile(archive,stage/'publish.tar.gz');os.replace(stage/'publish.tar.gz',target);target.chmod(0o644)
print(('Published' if a.publish else 'Prepared'),archive,hashlib.sha256(archive.read_bytes()).hexdigest())
