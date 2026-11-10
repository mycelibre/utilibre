"""Full unstarted-image comparison for the finite Bookworm zlib package overlay."""
import importlib.util
import json
import os
from pathlib import Path
import sys
from datetime import datetime, timezone

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/zlib-bookworm')
module = importlib.util.spec_from_file_location('zlib_scope', HERE / 'zlib-check.py')
common = importlib.util.module_from_spec(module)
module.loader.exec_module(common)


def dpkg_records(data):
    records = {}
    for record in data.decode().strip().split('\n\n'):
        name = next(line[9:] for line in record.splitlines() if line.startswith('Package: '))
        assert name not in records
        records[name] = record
    return records


def main(key):
    spec = next(s for s in json.loads((HERE / 'zlib-bookworm-inputs.json').read_text())['rows'] if s['key'] == key)
    out = ROOT / key
    assert not (out / 'scope.json').exists(), 'Preserve previous evidence'
    stage = json.loads((out / 'stage.json').read_text())
    assert stage['base'] == spec['base']
    base, image = stage['base'], stage['imageId']
    before, after = [common.export_manifest(i) for i in (base, image)]
    # Package management changes only this exact record. Other package metadata
    # cannot be hidden by allowing the whole dpkg database file in the manifest.
    olddb, newdb = [dpkg_records(common.image_file(i, '/var/lib/dpkg/status')) for i in (base, image)]
    assert olddb.keys() == newdb.keys()
    assert {k: v for k, v in olddb.items() if k != 'zlib1g'} == {k: v for k, v in newdb.items() if k != 'zlib1g'}
    assert '\nVersion: ' + spec['installed'] + '\n' in olddb['zlib1g']
    assert '\nVersion: ' + spec['version'] + '\n' in newdb['zlib1g']
    allowed = {
        'usr/lib/x86_64-linux-gnu/libz.so.1.2.13',
        'lib/x86_64-linux-gnu/libz.so.1.2.13',
        'var/cache/ldconfig/aux-cache', 'etc/ld.so.cache',
        'var/lib/dpkg/info/zlib1g:amd64.md5sums',
        'var/lib/dpkg/info/zlib1g:amd64.triggers',
        'var/lib/dpkg/status', 'var/lib/dpkg/status-old', 'var/log/dpkg.log',
    }
    changed = {p: {'before': before.get(p), 'after': after.get(p)}
               for p in sorted(before.keys() | after.keys()) if before.get(p) != after.get(p)}
    assert changed and set(changed) <= allowed, 'Unexpected image changes: ' + repr(set(changed) - allowed)
    for p, values in changed.items():
        assert values['before'] and values['after'], 'Unexpected new or removed file: ' + p
        for field in ('type', 'mode', 'uid', 'gid', 'link'):
            assert values['before'][field] == values['after'][field], 'File metadata drift: ' + p
    proof = {'date': datetime.now(timezone.utc).isoformat(), 'passed': True,
             'base': base, 'imageId': image, 'changed': changed,
             'imageEntries': [len(before), len(after)],
             'allUnrelatedImageFilesUnchanged': True, 'unrelatedDpkgRecordsUnchanged': True,
             'scope': 'Full image content/type/ownership/mode/link comparison, exact zlib payload and dpkg/loader bookkeeping only; timestamps and Docker-generated hosts/hostname/resolv files excluded.',
             'fixtureSha256': common.sha(Path(__file__).read_bytes()),
             'exporterSha256': common.sha((HERE / 'zlib-check.py').read_bytes())}
    (out / 'scope.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(key + ': complete image scope passed')


if __name__ == '__main__':
    assert len(sys.argv) == 2
    main(sys.argv[1])
