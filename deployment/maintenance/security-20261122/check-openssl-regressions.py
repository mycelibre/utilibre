"""Run the two regression tests supplied by these exact upstream patches.

Only disposable, networkless containers and synthetic upstream fixtures. Other
patches retain full upstream-suite evidence; no invented failing baseline.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/openssl-runtime')
source = ROOT.parent / 'openssl-build-v2'
inputs = json.loads((HERE / 'openssl-runtime-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(source / 'built.json') == inputs['sourceBuildSha256']
build_source = json.loads((source / 'built.json').read_text())
assert build_source['passed'] and build_source['network'] == 'none'
for binary in ('x509_check_cert_pkey_test', 'ectest'):
    assert sha(source / binary) == build_source['artifacts'][binary]
upstream = source / 'openssl_3.5.9.orig.tar.gz'
assert sha(upstream) == build_source['artifacts'][upstream.name]
with tarfile.open(upstream) as tar:
    cert = tar.extractfile('openssl-3.5.9/test/certs/root-cert.pem').read()
assert (source / 'test-certs/root-cert.pem').read_bytes() == cert
limits = ['--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
          '--cpus', '.5', '--memory', '192m', '--memory-swap', '192m', '--pids-limit', '32',
          '--log-driver', 'none', '--ulimit', 'core=0', '--user', '65534:65534',
          '--tmpfs', '/tmp:rw,size=16m,mode=1777']
tests = [('pem-append', 'x509_check_cert_pkey_test', ['-test', 'test_PEM_X509_INFO_read_bio_append', '/root-cert.pem', '1'],
          'test_PEM_X509_INFO_read_bio_append', 'CVE-2026-107493'),
         ('ec-order', 'ectest', ['-test', 'keygen_invalid_order_test'], 'keygen_invalid_order_test', 'CVE-2026-107496')]
assert sys.argv[1:]
for key in sys.argv[1:]:
    row = next(r for r in inputs['rows'] if r['key'] == key)
    out = ROOT / 'vendor-debian' / key
    build = json.loads((out / 'build.json').read_text())
    assert build['passed'] and build['base'] == row['base']
    assert not (out / 'upstream-regression.json').exists(), 'Preserve completed evidence'
    checks = []
    for phase, image in [('before', row['base']), ('after', build['imageId'])]:
        for label, binary, args, test_name, advisory in tests:
            name = 'utilibre-openssl-regression-' + str(os.getpid())
            command = ['docker', 'run', '--rm', '--name', name, *limits,
                       '--mount', 'type=bind,src=' + str(source / binary) + ',dst=/test,readonly',
                       '--mount', 'type=bind,src=' + str(source / 'test-certs/root-cert.pem') + ',dst=/root-cert.pem,readonly',
                       '--entrypoint', '/test', image, *args]
            timed_out = False
            try:
                result = subprocess.run(command, capture_output=True, timeout=25)
                status, output = result.returncode, result.stdout + result.stderr
            except subprocess.TimeoutExpired as error:
                timed_out = True
                status, output = None, (error.stdout or b'') + (error.stderr or b'')
            finally:
                subprocess.run(['docker', 'rm', '-f', '-v', name], capture_output=True, timeout=20)
            log = out / (phase + '-' + label + '.log')
            log.write_bytes(output)
            if phase == 'after':
                assert not timed_out and status == 0 and test_name.encode() in output
                assert b'not ok' not in output
            # A timeout or unrelated loader/startup failure is recorded, never
            # presented as proof of the intended vulnerable behavior.
            demonstrated = (not timed_out and status not in (None, 0)
                            and test_name.encode() in output and b'not ok' in output)
            checks.append({'phase': phase, 'imageId': image, 'advisory': advisory,
                           'test': test_name, 'binarySha256': sha(source / binary),
                           'exitCode': status, 'timedOut': timed_out,
                           'baselineRegressionDemonstrated': phase == 'before' and demonstrated,
                           'logSha256': sha(log)})
    proof = {'passed': True, 'date': datetime.datetime.now(datetime.timezone.utc).isoformat(),
             'base': row['base'], 'imageId': build['imageId'], 'sourceBuildSha256': inputs['sourceBuildSha256'],
             'fixtureSha256': hashlib.sha256(cert).hexdigest(), 'checks': checks,
             'network': 'none', 'productionChanged': False,
             'limitations': 'Only the two tests provided by these upstream patches are rerun per runtime. '
                            'The other six fixes retain exact source and complete native-suite evidence. '
                            'A baseline timeout or unrelated failure does not establish a reproduced defect.'}
    (out / 'upstream-regression.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(key + ': both upstream regressions pass after repair; baseline outcomes retained', flush=True)
