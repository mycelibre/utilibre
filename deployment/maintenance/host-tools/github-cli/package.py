#!/usr/bin/env python3
"""Repackage the official native DEB, replacing only the reviewed CLI payload."""
import hashlib
import json
import pathlib
import re
import subprocess
import sys

recipe = pathlib.Path(__file__).resolve().parent
pins = json.loads((recipe / 'inputs.json').read_text())
assert len(sys.argv) == 2, 'package.py /absolute/prepared-stage'
stage = pathlib.Path(sys.argv[1]).resolve()
assert stage.is_relative_to('/var/lib/utilibre-maintenance')
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
assert sha(pins['previousPackage']) == pins['previousPackageSha256']
assert sha(stage / 'output/gh') == pins['binarySha256'], 'Rebuild bytes differ; review before packaging'
dest = stage / 'package-stage'
assert not dest.exists()
subprocess.run(['dpkg-deb', '-R', pins['previousPackage'], str(dest)], check=True)
assert sorted(p.name for p in (dest / 'DEBIAN').iterdir()) == ['control', 'md5sums']
control = (dest / 'DEBIAN/control').read_text()
assert 'Version: 2.103.3\n' in control
control = control.replace('Version: 2.103.3\n', 'Version: ' + pins['version'] + '\n')
control = re.sub(r'^Maintainer: .*$', 'Maintainer: Utilibre maintenance', control, flags=re.M)
(dest / 'DEBIAN/control').write_text(control)
(dest / 'usr/bin/gh').write_bytes((stage / 'output/gh').read_bytes())
(dest / 'usr/bin/gh').chmod(0o755)
doc = dest / 'usr/share/doc/gh'
doc.mkdir(parents=True, exist_ok=True)
(doc / 'copyright').write_bytes((stage / ('cli-' + pins['revision']) / 'LICENSE').read_bytes())
(doc / 'utilibre-maintenance.txt').write_text(
    'Upstream GitHub CLI 2.103.3; native Go dependency locks and Go 1.27.4.\n'
    'MIT notices retained. No application source patch. See Utilibre host-tools/github-cli.\n')
files = sorted(p for p in dest.rglob('*') if p.is_file() and 'DEBIAN' not in p.relative_to(dest).parts)
(dest / 'DEBIAN/md5sums').write_text(''.join(
    hashlib.md5(p.read_bytes()).hexdigest() + '  ' + str(p.relative_to(dest)) + '\n' for p in files))
output = stage / ('gh_' + pins['version'] + '_amd64.deb')
assert not output.exists()
subprocess.run(['dpkg-deb', '--root-owner-group', '--build', str(dest), str(output)], check=True)
print(json.dumps({'package': str(output), 'sha256': sha(output),
                  'requiresReview': True, 'byteReproducibilityClaimed': False}))
