"""Reuse the existing distroless assembler and Yopass/native crypto fixtures.

No shell/provider/package manager is added just to satisfy a test. TLS requests
are supplied on stdin by the fixture driver instead of an in-container shell.
"""
import hashlib
import json
import os
from pathlib import Path
import io
import subprocess
import sys
import tarfile
import tempfile
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/openssl-distroless-runtime')
mode, *args = sys.argv[1:]
if mode == 'abi':
    assert not args
    out = ROOT / 'vendor-debian/community-yopass'
    proof = out / 'distroless-abi.json'
    assert not proof.exists()
    build = json.loads((out / 'build.json').read_text())
    assert build['passed']
    rows = []
    for name in ('libssl.so.3', 'libcrypto.so.3'):
        previous = None
        for image in (build['base'], build['imageId']):
            cid = subprocess.check_output(['docker', 'create', '--network', 'none', '--entrypoint', '/unused', image], text=True, timeout=15).strip()
            try:
                packed = subprocess.check_output(['docker', 'cp', '-L', cid + ':/usr/lib/x86_64-linux-gnu/' + name, '-'], timeout=20)
                assert len(packed) < 16 * 1024**2
                with tarfile.open(fileobj=io.BytesIO(packed)) as tar:
                    files = [m for m in tar if m.isfile()]
                    assert len(files) == 1
                    blob = tar.extractfile(files[0]).read()
            finally:
                subprocess.run(['docker', 'rm', '-v', cid], check=True, capture_output=True, timeout=15)
            with tempfile.NamedTemporaryFile(dir=ROOT) as temp:
                temp.write(blob); temp.flush()
                lines = subprocess.check_output(['readelf', '--dyn-syms', '--wide', temp.name], text=True, timeout=15)
                symbols = sorted({f[7] for line in lines.splitlines() if len(f := line.split()) >= 8 and f[4] in ('GLOBAL', 'WEAK') and f[6] != 'UND'})
                dynamic = subprocess.check_output(['readelf', '-d', temp.name], text=True, timeout=15)
                needed = sorted(line[line.index('('):] for line in dynamic.splitlines() if '(NEEDED)' in line or '(SONAME)' in line)
            assert len(symbols) > 50
            if previous:
                assert set(previous['symbols']) <= set(symbols) and previous['needed'] == needed
            previous = {'imageId': image, 'library': name, 'sha256': hashlib.sha256(blob).hexdigest(), 'symbols': symbols, 'needed': needed}
            rows.append(previous)
    proof.write_text(json.dumps({'passed': True, 'base': build['base'], 'imageId': build['imageId'],
        'rows': rows, 'bothLibraryAbisPreserved': True, 'productionChanged': False}, indent=2) + '\n')
    print('Both distroless SSL and crypto exported ABIs and loader dependencies preserved.')
    raise SystemExit(0)
names = {'prepare': '../security-20261109/vendor-yopass.py', 'check': 'check-yopass.py',
         'scan': 'scan-debian.py', 'release': 'release-debian.py',
         'tls': 'check-openssl-tls.py', 'regressions': 'check-openssl-regressions.py'}
assert mode in names
if mode == 'release':
    inputs = json.loads((HERE / 'openssl-distroless-runtime-inputs.json').read_text())
    row = inputs['rows'][0]
    out = ROOT / 'vendor-debian/community-yopass'
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    assert row['releaseApproval'] == 'approved'
    for name in ('native-tls.json', 'upstream-regression.json', 'distroless-abi.json'):
        assert sha(out / name) == row['opensslEvidence'][name]
        evidence = json.loads((out / name).read_text())
        assert evidence['passed'] and evidence['base'] == row['base']
        assert evidence['imageId'] == json.loads((out / 'build.json').read_text())['imageId']
    offer = json.loads((ROOT.parent / 'openssl-source-offer.json').read_text())
    assert offer['passed'] and offer['published'] and offer['sourceBuildSha256'] == inputs['sourceBuildSha256']
    assert sha(ROOT.parent / 'openssl-build-v2/built.json') == inputs['sourceBuildSha256']
    assert offer['sha256'] == row['opensslEvidence']['sourceArchiveSha256']
    for directory in offer['destinations']:
        assert sha(Path(directory) / offer['file']) == offer['sha256']
original = (HERE / names[mode]).resolve()
code = original.read_text()


def replace(before, after):
    global code
    assert code.count(before) == 1, (mode, before)
    code = code.replace(before, after)


if mode == 'prepare':
    assert not args
    replace('here = Path(__file__).resolve().parent', 'here = Path(' + repr(str(HERE)) + ')')
    replace("root = Path('/var/lib/utilibre-maintenance/security-20261109')", 'root = Path(' + repr(str(ROOT)) + ')')
    replace("'vendor-debian-inputs.json'", "'openssl-distroless-runtime-inputs.json'")
    code = code.replace('zlib1g', 'libssl3t64')
    replace("assert not any((control / n).exists() for n in ['preinst','postinst','prerm','postrm'])", """assert not any((control / n).exists() for n in ['preinst','postinst','prerm','postrm'])
assert sha((control/'triggers').read_bytes()) == '1be3347fdd7a85dfcaee9a86db35e52904fff2b116e10259ba02aa39ef637a66'
assert s['packages']['libssl3t64']['installed'] == '3.5.7-1~deb13u3'
""")
    replace("assert '/var/lib/dpkg/status.d/libssl3t64' in before", """assert '/var/lib/dpkg/status.d/libssl3t64' in before
assert not any(path in before for path in ['/bin/sh','/usr/bin/dpkg','/usr/bin/systemctl','/etc/ld.so.cache'])
""")
    replace("assert changed <= allowed and any('libz.so' in p for p in changed)", """assert changed <= allowed and any('libcrypto.so' in p for p in changed)
assert all(before[p] == after.get(p) for p in before if p.startswith('/etc/'))
assert not any(path in after for path in ['/bin/sh','/usr/bin/dpkg','/usr/bin/systemctl','/etc/ld.so.cache'])
""")
    replace("binary=root/'vendor-debian/zlib-native'", "binary=root/'fixtures/openssl'")
    replace("inputs['fixture']['binarySha256']", "inputs['nativeFixture']['cliSha256']")
    before = """    answer=docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','128m','--pids-limit','32','--log-driver','none','-v',str(binary)+':/native:ro','--entrypoint','/native',image_id)
    assert answer=='ZLIB_NATIVE_PASSED checks=7'; native.append({'imageId':image_id,'passed':True,'checks':7})"""
    after = """    prefix=['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','128m','--pids-limit','32','--log-driver','none','--user','65534:65534','-v',str(binary)+':/native:ro','--entrypoint','/native',image_id]
    assert run(prefix+['version']).decode().startswith('OpenSSL 3.5.')
    digest=run(prefix[:-1]+[image_id,'dgst','-sha256'],input=b'fictional crypto fixture').decode().strip()
    assert digest.endswith(sha(b'fictional crypto fixture'))
    assert len(run(prefix+['rand','-hex','16']).strip())==32
    assert b'default' in run(prefix+['list','-providers'])
    native.append({'imageId':image_id,'passed':True,'checks':4,'scope':'version, SHA256 input digest, random output and default provider; no legacy provider claim'})"""
    replace(before, after)
    # docker must keep stdin open for a real digest of the supplied fixture.
    replace("digest=run(prefix[:-1]+[image_id,'dgst','-sha256']", "digest=run(prefix[:3]+['-i']+prefix[3:]+['dgst','-sha256']")
    code = code.replace('libz.so.1', 'libssl.so.3')
    replace("print('Distroless Yopass: signed zlib payload, unchanged unrelated files/configuration, seven native checks and ABI passed')", "print('Distroless Yopass: exact crypto payload, unchanged unrelated files/configuration, default-provider native checks and ABI passed')")
    replace("'limitation':'Stable vendor native zlib/ABI checks; no hostile exploit reproduction claimed.'", "'limitation':'Default-provider native checks and SSL ABI; full Yopass, TLS and upstream regression fixtures remain separate gates. No legacy provider is added.'")
else:
    code = relocate_directory(code, HERE)
    code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122/openssl-runtime')", 'Path(' + repr(str(ROOT)) + ')')
    code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')')
    code = code.replace("'debian-inputs.json'", "'openssl-distroless-runtime-inputs.json'").replace('"debian-inputs.json"', '"openssl-distroless-runtime-inputs.json"')
    code = code.replace("'openssl-runtime-inputs.json'", "'openssl-distroless-runtime-inputs.json'")
    if mode == 'check':
        assert not args
        code = code.replace("packages['libc6']['installed'] == build['packages']['libc6']['installed']", "packages['libssl3t64']['installed'] == build['packages']['libssl3t64']['installed']")
        code = code.replace('signed libc6 payload', 'reviewed libssl3t64 payload')
    elif mode == 'scan':
        replace('"ROOT=m.ROOT; inputs=json.loads', '"ROOT=Path(' + repr(str(ROOT)) + '); inputs=json.loads')
    elif mode == 'tls':
        before = """p = run([*prefix, '--entrypoint', 'sh', image, '-ec',
                         "printf 'GET / HTTP/1.0\\\\r\\\\nHost: localhost\\\\r\\\\n\\\\r\\\\n' | /native/openssl s_client -quiet -ign_eof -ignore_unexpected_eof -connect 127.0.0.1:18443 -CAfile /ca.pem -verify_return_error -verify_hostname localhost -" + tls])"""
        after = """p = subprocess.run([*prefix[:3], '-i', *prefix[3:], '--entrypoint', '/native/openssl', image,
                         's_client', '-quiet', '-ign_eof', '-ignore_unexpected_eof', '-connect', '127.0.0.1:18443',
                         '-CAfile', '/ca.pem', '-verify_return_error', '-verify_hostname', 'localhost', '-' + tls],
                         input=b'GET / HTTP/1.0\\r\\nHost: localhost\\r\\n\\r\\n', capture_output=True, timeout=30)"""
        replace(before, after)
adapter = ROOT / ('run-' + mode + '.py')
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / ('adapter-' + mode + '.json')).write_text(json.dumps({'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(code.encode()).hexdigest(), 'purpose': 'Exact shell-free crypto update; unchanged isolated fixtures'}, indent=2) + '\n')
sys.argv = [str(adapter), *args]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})
