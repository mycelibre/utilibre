"""Reuse the distroless payload assembler for one authenticated libc update.

The runtime has no init, dpkg, shell, running build processes or ldconfig
consumer. Debian's maintainer scripts handle those system-package lifecycle
operations; they are reviewed/pinned, not run inside or copied into this image.
The existing distroless loader paths and every exported ABI must still match.
"""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
original = HERE.parent / 'security-20261109/vendor-yopass.py'
code = original.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, old
    code = code.replace(old, new)


replace("here = Path(__file__).resolve().parent", 'here = Path(' + repr(str(HERE)) + ')')
replace("root = Path('/var/lib/utilibre-maintenance/security-20261109')", 'root = Path(' + repr(str(ROOT)) + ')')
replace("here / 'vendor-debian-inputs.json'", "here / 'debian-inputs.json'")
replace("context = d / 'context'; context.mkdir(exist_ok=True)", "context = d / 'context-v3'; context.mkdir(exist_ok=False)")
replace("control = d / 'control'", "control = d / 'control-v3'")
code = code.replace('zlib1g', 'libc6')
replace("assert not any((control / n).exists() for n in ['preinst','postinst','prerm','postrm'])", """scripts = {
 'preinst': '964a417b9c330f80213fe8aebb1f44eaea307203962aecb0de493742583bb454',
 'postinst': 'ff2a3a7a0e74ceac331ca5ad22e7ef57c974a7b891a9b1e7f3def4377ec6f1b5',
 'postrm': 'd911893b23b52a371e843a621a27d49060f0aefdc07c8cb43ef77563a84fbd5b',
 'triggers': 'c67ab4558a59eb1e96d899a5bdbb153d6a2ab0e580f4acf5bfb1e4e6150ad2f4',
}
assert not (control / 'prerm').exists()
for name,digest in scripts.items(): assert sha((control/name).read_bytes()) == digest
assert s['packages']['libc6']['installed'] == '2.41-12+deb13u4'
""")
replace("assert '/var/lib/dpkg/status.d/libc6' in before", """assert '/var/lib/dpkg/status.d/libc6' in before
assert not any(path in before for path in ['/bin/sh','/usr/bin/dpkg','/usr/bin/systemctl','/etc/ld.so.cache'])
""")
replace("assert changed <= allowed and any('libz.so' in p for p in changed)", """assert changed <= allowed and any('libc.so' in p for p in changed)
assert all(before[p] == after.get(p) for p in before if p.startswith('/etc/'))
assert not any(path in after for path in ['/bin/sh','/usr/bin/dpkg','/usr/bin/systemctl','/etc/ld.so.cache'])
""")
replace("binary=root/'vendor-debian/zlib-native'", "binary=root/'fixtures/libc-distroless-native'")
replace("inputs['fixture']['binarySha256']", "inputs['libcDistrolessFixture']['binarySha256']")
replace("answer=='ZLIB_NATIVE_PASSED checks=7'", "answer=='LIBC_DISTROLESS_PASSED c-locale-wide-scanf-regex-thread-address-loader-memory-time'")
replace("'checks':7", "'checks':9")
code = code.replace('libz.so.1', 'libc.so.6')
replace("print('Distroless Yopass: signed zlib payload, unchanged unrelated files/configuration, seven native checks and ABI passed')", "print('Distroless Yopass: exact libc payload, unchanged unrelated files/configuration, nine native checks and ABI passed')")
replace("'limitation':'Stable vendor native zlib/ABI checks; no hostile exploit reproduction claimed.'", "'limitation':'Vendor libc/native ABI checks; no per-advisory exploit reproduction. Distroless assembly preserves absence of shell, package manager, init and loader cache.'")
adapter = ROOT / 'prepare-yopass-adapter-v3.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT / 'prepare-yopass-adapter.json').write_text(json.dumps({'originalSha256': sha(original), 'adapterSha256': sha(adapter),
    'purpose': 'Finite libc6 update using the existing distroless payload builder; signed control-script identities and runtime absence checks.'}, indent=2) + '\n')
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})
