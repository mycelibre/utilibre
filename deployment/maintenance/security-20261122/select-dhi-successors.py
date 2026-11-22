"""Select two exact Penpot DHI inputs; never resolve latest or activate them."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/dhi-successors')
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
target = HERE / 'dhi-successor-inputs.json'
assert not target.exists()
proof = ROOT / 'source/retained-fixes.json'
assert read(proof)['passed'] and len(read(proof)['patches']) == 8
previous = read(HERE / 'openssl-runtime-inputs.json')
leaf = read(HERE / 'debian-leaf-inputs.json')
assert shutil.disk_usage(ROOT).free >= previous['minimumFreeBytes']
scan = read(ROOT.parents[1] / 'security.json')
assert scan['status'] == 'checked'
packages = read(ROOT / 'debian-acquisition/authenticated.json')['packages']
rows = []
for role, expected in [('frontend', 'sha256:2b7368079850bcd17c58b5e7da21ddf72d1665b0ef7188b46e444b8364e92772'),
                       ('exporter', 'sha256:3c3680e456ea6f78118668190f1cc639417febfb4faaed3ceda1f65425b05bb3')]:
    container = 'utilibre-expanded-penpot-' + role + '-1'
    image, ref = subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}} {{.Config.Image}}', container], text=True, timeout=20).strip().split()
    assert image == expected
    assert any(i['status'] == 'checked' and i['id'] == image and i['containers'] == [container] for i in scan['images'])
    names = ['openssl', 'libssl3t64', 'openssl-provider-legacy']
    if role == 'exporter':
        names += ['libfreetype6', 'libnghttp2-14']
    selected = {}
    for name in names:
        version = subprocess.check_output(['docker', 'exec', container, 'dpkg-query', '-W', '-f=${Version}', name], text=True, timeout=20).strip()
        assert version == {'libfreetype6': '2.13.3+dfsg-1+deb13u1+dhi0', 'libnghttp2-14': '1.64.0-1.1+deb13u1+dhi3'}.get(name, '3.5.7-1~deb13u3+dhi0')
        selected[name] = {'installed': version, 'package': 'dhi/' + name}
    rows.append({'key': 'expanded-penpot-' + role, 'containers': [container], 'kind': 'debian',
                 'suite': 'trixie', 'base': image, 'oldRefs': [ref], 'packages': selected,
                 'candidate': 'utilibre-dhi-penpot-' + role + ':20261122', 'approval': 'preparation-only'})
before = ROOT / 'before'
before.mkdir()
shutil.copyfile(ROOT.parents[1] / 'security.json', before / 'security.json')
(ROOT / 'scan-cache').symlink_to(ROOT.parent / 'scan-cache', target_is_directory=True)
(ROOT / 'scanner-inputs.json').write_text(json.dumps(previous['database'], indent=2) + '\n')
fixtures = ROOT / 'fixtures'
fixtures.mkdir(mode=0o700)
for name, old in [('openssl', 'openssl-runtime'), ('curl', 'leaves')]:
    shutil.copyfile(ROOT.parent / old / 'fixtures' / name, fixtures / name)
    (fixtures / name).chmod(0o755)
manifest = {k: previous[k] for k in ('schemaVersion', 'minimumFreeBytes', 'database', 'exporterSha256', 'nativeFixture')}
manifest.update(packages=packages, rows=rows, sourceProofSha256=sha(proof),
                http2Fixture={**leaf['http2Fixture'], 'selectedKeys': ['expanded-penpot-exporter']})
target.write_text(json.dumps(manifest, indent=2) + '\n')
print('Two exact DHI Penpot candidates selected; no build or activation.')
