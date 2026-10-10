#!/usr/bin/env python3
"""Rebuild reviewed source without changing runtime state."""
from pathlib import Path
import tempfile,subprocess,shutil,json,hashlib
root=Path(__file__).resolve().parents[2];recipe=root/'deployment/chhoto'
revision='e18a8a0111e94be03145e95c30dcd7f41891633d'
with tempfile.TemporaryDirectory(prefix='utilibre-chhoto-build-') as temporary:
 source=Path(temporary)/'source'
 subprocess.run(['git','clone','--quiet','--no-hardlinks','/opt/utilibre/calendar-src/chhoto-url',str(source)],check=True)
 subprocess.run(['git','-C',str(source),'checkout','--quiet','--detach',revision],check=True)
 for patch in ['no-analytics-local-assets.patch', 'layout.patch']:
  subprocess.run(['git','-C',str(source),'apply',str(recipe/patch)],check=True)
 for item in json.loads((recipe/'vendor/SOURCES.json').read_text()):
  assert hashlib.sha256((recipe/'vendor'/item['file']).read_bytes()).hexdigest()==item['sha256']
 shutil.copytree(recipe/'vendor',source/'frontend/static/vendor',dirs_exist_ok=True)
 subprocess.run(['docker','build','-f',str(recipe/'Dockerfile'),'-t','utilibre-chhoto:7.8.3-p3',str(source)],check=True)
