"""Rebuild one native executable; preserve every installed script/config/data file."""
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess

old = pathlib.Path('/inputs/qemu-guest-agent_10.0.13+ds-0+deb13u1_amd64.deb')
root = pathlib.Path('/work/package')
run = lambda *args: subprocess.check_output(args, text=True).strip()
subprocess.check_call(['dpkg-deb', '-R', str(old), str(root)])
binary = root / 'usr/sbin/qemu-ga'
shutil.copy2('/work/compiled/qga/qemu-ga', binary)
subprocess.check_call(['strip', '--strip-unneeded', str(binary)])
os.chmod(binary, 0o755)

def needed(file):
    return sorted(re.findall(r'Shared library: \[(.*?)\]', run('readelf', '-d', str(file))))

before = needed('/work/native/usr/sbin/qemu-ga')
after = needed(binary)
assert before == after, (before, after)
assert 'not found' not in run('ldd', str(binary))
def payload(base):
    result = {}
    for file in base.rglob('*'):
        rel = file.relative_to(base).as_posix()
        if rel.startswith('DEBIAN/') or file.is_dir():
            continue
        result[rel] = {'mode': file.lstat().st_mode & 0o7777,
                      'link': os.readlink(file)} if file.is_symlink() else {
            'mode': file.stat().st_mode & 0o7777,
            'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
    return result

native = payload(pathlib.Path('/work/native'))
candidate = payload(root)
assert native.keys() == candidate.keys()
changed = [name for name in native if native[name] != candidate[name]]
assert changed == ['usr/sbin/qemu-ga'], changed
control = root / 'DEBIAN/control'
text = control.read_text()
assert text.count('Version: 1:10.0.13+ds-0+deb13u1\n') == 1
text = text.replace('Version: 1:10.0.13+ds-0+deb13u1\n', 'Version: 1:10.0.13+ds-0+deb13u1+utilibre1\n')
size = sum(p.stat().st_size for p in root.rglob('*') if p.is_file() and 'DEBIAN' not in p.parts)
text = re.sub(r'^Installed-Size: \d+$', 'Installed-Size: ' + str((size + 1023) // 1024), text, flags=re.M)
control.write_text(text)
md5file = root / 'DEBIAN/md5sums'
lines = md5file.read_text().splitlines()
digest = hashlib.md5(binary.read_bytes()).hexdigest()
assert sum(line.endswith('  usr/sbin/qemu-ga') for line in lines) == 1
md5file.write_text('\n'.join(digest + '  usr/sbin/qemu-ga' if line.endswith('  usr/sbin/qemu-ga') else line for line in lines) + '\n')
archive = '/output/qemu-guest-agent_10.0.13+ds-0+deb13u1+utilibre1_amd64.deb'
subprocess.check_call(['dpkg-deb', '--root-owner-group', '-b', str(root), archive])
pathlib.Path('/output/package-proof.json').write_text(json.dumps({
    'passed': True, 'version': '1:10.0.13+ds-0+deb13u1+utilibre1',
    'nativePayload': native, 'candidatePayload': candidate,
    'changedPayloadFiles': changed, 'needed': after,
    'archiveSha256': hashlib.sha256(pathlib.Path(archive).read_bytes()).hexdigest(),
    'maintainerScriptsUnmodified': True,
    'note': 'Native source rebuild plus upstream stable one-file patch; package is locally rebuilt, not a Debian-signed binary.'
}, indent=2) + '\n')
