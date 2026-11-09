#!/usr/bin/env python3
"""Apply the reviewed Brave module and provider disclosure, preserving settings.

Run only while holding the release lock, after privately backing up the current
engine directory and the two settings files. Argument: staged engine directory.
This does not activate an image or overwrite browser preferences/default engines.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys

RECIPE = Path(__file__).resolve().parent
ENGINES = Path('/opt/utilibre/community-src/degoog-searx-engines')
DATA = Path('/opt/utilibre/community-data/degoog')

def atomic(path, value):
    st = path.stat()
    tmp = path.with_suffix(path.suffix + '.search-repair.tmp')
    with tmp.open('x') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')
    os.chmod(tmp, st.st_mode & 0o777); os.chown(tmp, st.st_uid, st.st_gid)
    os.replace(tmp, path)

def main():
    assert len(sys.argv) == 2
    staged = Path(sys.argv[1]).resolve()
    provenance = json.loads((RECIPE / 'engine-source.json').read_text())
    manifest = json.loads((ENGINES / 'SOURCE.json').read_text())
    assert manifest['revision'] == 'd48c4b555421e824342c51d68482dd0898e54d0f'
    for name, digest in provenance['files'].items():
        assert hashlib.sha256((staged / name).read_bytes()).hexdigest() == digest
    settings = json.loads((DATA / 'server-settings.json').read_text())
    plugins = json.loads((DATA / 'plugin-settings.json').read_text())
    assert settings['settings']['blockClientLeaks'] is True
    assert settings['settings']['proxyEnabled'] is False
    settings['settings']['privacyPolicy'] = (RECIPE / 'privacy.txt').read_text().strip()
    plugins.setdefault('searx-brave-engine', {}).update({'searchTypeOverride': 'web', 'timeoutMs': '10000', 'score': '2'})
    for name, digest in provenance['files'].items():
        shutil.copyfile(staged / name, ENGINES / name); os.chmod(ENGINES / name, 0o644)
        manifest['hashes'][name] = digest
    manifest['engines'] = list(dict.fromkeys([*manifest['engines'], 'brave']))
    manifest.setdefault('engineSources', {})['brave'] = provenance
    atomic(ENGINES / 'SOURCE.json', manifest)
    atomic(DATA / 'plugin-settings.json', plugins)
    atomic(DATA / 'server-settings.json', settings)
    print('Brave module and provider disclosure updated; instance identity and existing choices preserved.')

if __name__ == '__main__':
    main()
