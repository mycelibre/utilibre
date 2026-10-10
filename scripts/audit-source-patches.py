#!/usr/bin/env python3
"""Apply/reverse reviewed patches in disposable Git indexes; never edit sources.

Run from the repository root after obtaining the exact upstream revisions in
locations recorded by deployment/source-patches.json. No network or build occurs.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'deployment/source-patches.json').read_text())
patch_records = {row['patch']: row for row in manifest}
results = []
for row in manifest:
    source = Path(row['source'])
    with tempfile.TemporaryDirectory(prefix='utilibre-patch-audit-') as directory:
        env = dict(os.environ, GIT_INDEX_FILE=directory + '/index')
        def git(*args):
            return subprocess.check_output(['git', '-C', str(source), *args], env=env, text=True).strip()
        git('read-tree', row['revision'])
        for prerequisite in row['prerequisites']:
            prerequisite_flags = ['--unidiff-zero'] if patch_records.get(prerequisite, {}).get('unidiffZero', False) else []
            git('apply', '--cached', '--whitespace=nowarn', *prerequisite_flags, str(root / prerequisite))
        before = git('write-tree')
        patch = str(root / row['patch'])
        # Some reviewed dependency-only diffs use zero context. Require that
        # choice per record; do not weaken matching for unrelated patches.
        flags = ['--unidiff-zero'] if row.get('unidiffZero', False) else []
        git('apply', '--cached', '--whitespace=nowarn', *flags, patch)
        git('apply', '--cached', '--whitespace=nowarn', *flags, '--reverse', patch)
        assert git('write-tree') == before, row['patch'] + ' did not reverse exactly'
        sizes = subprocess.check_output(['git', 'apply', '--numstat', patch], text=True).splitlines()
        results.append({'patch': row['patch'], 'revision': row['revision'], 'files': len(sizes), 'applies': True, 'reversible': True})
print(json.dumps({'checks': results, 'limitations': 'Patch reconstruction only; this does not replace builds, dependency review or application tests.'}, indent=2))
