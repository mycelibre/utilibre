#!/usr/bin/env python3
"""Rebuild reviewed source without changing runtime state."""
from pathlib import Path
import tempfile,subprocess,shutil,json,hashlib,os
os.environ['GIT_LFS_SKIP_SMUDGE']='1'
root=Path(__file__).resolve().parents[2];recipe=root/'deployment/chhoto'
revision='93881f699c1e2c900441b6bbb0aa0762b038f25e'
with tempfile.TemporaryDirectory(prefix='utilibre-chhoto-build-') as temporary:
 source=Path(temporary)/'source'
 subprocess.run(['git','clone','--quiet','--no-hardlinks','/opt/utilibre/src/chhoto-url-7.10.8',str(source)],check=True)
 subprocess.run(['git','-C',str(source),'checkout','--quiet','--detach',revision],check=True)
 for patch in ['no-analytics-local-assets.patch', 'layout.patch', 'abuse-report.patch']:
  subprocess.run(['git','-C',str(source),'apply',str(recipe/patch)],check=True)
 for item in json.loads((recipe/'vendor/SOURCES.json').read_text()):
  assert hashlib.sha256((recipe/'vendor'/item['file']).read_bytes()).hexdigest()==item['sha256']
 shutil.copytree(recipe/'vendor',source/'frontend/static/vendor',dirs_exist_ok=True)
 subprocess.run(['docker','build','--target','dependencies','-f',str(recipe/'Dockerfile'),'-t','utilibre-chhoto-dependencies:7.10.8-p2',str(source)],check=True)
 subprocess.run(['docker','build','--network','none','--pull=false','-f',str(recipe/'Dockerfile'),'-t','utilibre-chhoto:7.10.8-p2',str(source)],check=True)
