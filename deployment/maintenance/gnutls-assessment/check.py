#!/usr/bin/env python3
"""Reproduce native GnuTLS defects in exact disposable images; never waive them."""
import argparse
import datetime
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import urllib.request
import uuid


def run(argv, **options):
    return subprocess.run(argv, check=True, text=True, capture_output=True,
                          timeout=60, **options).stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--headers', required=True, type=pathlib.Path)
    parser.add_argument('--fixtures', required=True, type=pathlib.Path)
    parser.add_argument('--images', required=True, type=pathlib.Path)
    parser.add_argument('--output', required=True, type=pathlib.Path)
    parser.add_argument('--expect', choices=['baseline', 'fixed'], default='baseline')
    args = parser.parse_args()
    assert shutil.disk_usage('/').free >= 8 * 1024**3, '8 GiB free-space floor'
    assert not args.output.exists(), 'Use a new report filename'
    here = pathlib.Path(__file__).resolve().parent
    manifest = json.loads((here / 'fixtures.json').read_text())
    for item in manifest['files']:
        path = args.fixtures / item['path']
        if not path.exists():
            url = ('https://raw.githubusercontent.com/lkloliver/poc/' +
                   manifest['commit'] + '/' + item['path'])
            with urllib.request.urlopen(url, timeout=20) as response:
                body = response.read(65537)
            assert len(body) <= 65536
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
        assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], item['path']
    args.output.parent.mkdir(parents=True, exist_ok=True)
    binary = args.output.parent / 'native-check'
    run(['gcc', '-O2', '-Wall', '-Wextra', '-Werror', '-D_FORTIFY_SOURCE=2',
         '-I', str(args.headers), str(here / 'native-check.c'),
         '-Wl,-z,relro,-z,now', '-l:libgnutls.so.30', '-o', str(binary)])
    expected = {'malformed-srv': args.expect == 'baseline',
                'well-formed-srv': False, 'cn-mismatch': False, 'cn-match': True,
                'permitted-dn-outside': args.expect == 'baseline',
                'excluded-srv-match': args.expect == 'baseline',
                'excluded-dn-outside': args.expect == 'fixed'}
    results = []
    for spec in json.loads(args.images.read_text()):
        assert re.fullmatch(r'sha256:[a-f0-9]{64}', spec['image']), 'Immutable image required'
        name = 'maintenance-gnutls-check-' + str(uuid.uuid4())
        command = ['docker', 'run', '--name', name, '--rm', '--network', 'none', '--read-only',
                   '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                   '--user', '65534:65534', '--memory', '192m', '--cpus', '1',
                   '--pids-limit', '32', '--volume', str(binary.resolve()) + ':/check:ro',
                   '--volume', str(args.fixtures.resolve()) + ':/fixtures:ro',
                   '--entrypoint', '/check', spec['image'], '/fixtures']
        try:
            output = run(command)
        finally:
            # Terminating the Docker CLI alone does not stop its container.
            subprocess.run(['docker', 'rm', '-f', name], check=False,
                           capture_output=True, timeout=15)
        rows = [json.loads(line) for line in output.splitlines()]
        assert len(rows) == 16 and rows[0]['kind'] == 'runtime'
        assert sum(row['kind'] == 'tls' for row in rows) == 8
        actual_keys = [(row['kind'], row.get('case'), row.get('version')) for row in rows[1:]]
        assert len(actual_keys) == len(set(actual_keys)), 'Duplicate or missing case'
        mismatches = []
        for row in rows[1:]:
            if row['accepted'] != expected[row['case']]:
                mismatches.append(row)
            if row['kind'] == 'tls':
                assert row['echo'] == row['accepted'], 'Accepted TLS must exchange exact bytes'
                if not row['accepted']:
                    assert row['result'] == -348 and row['verification'] != 0, 'Must reject certificate, not fail transport'
        results.append({'image': spec['image'], 'packageVersion': spec['version'],
                        'observations': rows, 'mismatches': mismatches})
    report = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'expectedBehavior': args.expect,
              'meaning': 'Baseline success reproduces vulnerabilities; it is not a security clearance.',
              'fixtureCommit': manifest['commit'],
              'nativeCheckSha256': hashlib.sha256(binary.read_bytes()).hexdigest(),
              'results': results}
    with args.output.open('x') as stream:
        json.dump(report, stream, indent=2)
        stream.write('\n')
    passed = all(not item['mismatches'] for item in results)
    print(json.dumps({'expectedBehavior': args.expect, 'images': len(results),
                      'observations': sum(len(item['observations']) - 1 for item in results),
                      'matchesExpectedBehavior': passed, 'securityFindingsCleared': 0}))
    raise SystemExit(0 if passed else 2)


if __name__ == '__main__':
    main()
