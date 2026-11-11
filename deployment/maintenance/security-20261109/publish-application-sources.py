#!/usr/bin/env python3
"""Publish reviewed source archives only; never copy a live application directory."""
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[3]
DEST = Path('/opt/utilibre/toolbox-public')
LEDGER = json.loads((ROOT / 'deployment/source-patches.json').read_text())
PACKS = {
    'chhoto': ('deployment/chhoto/abuse-report.patch', 'chhoto-utilibre.tar.gz',
               ['deployment/chhoto']),
    'yopass': ('deployment/community/yopass/source.patch', 'yopass-16.1.0-utilibre-source.tar.gz',
               ['deployment/community/yopass']),
}


def publish(key, held=False):
    if key == 'chhoto' and not held:
        raise SystemExit('Retired Chhoto source recipe: use chhoto --held-nov11 for the deployed 7.11.3 source offer')
    if held:
        inputs = json.loads((ROOT / 'deployment/maintenance/releases-20261111/held-inputs.json').read_text())
        spec = inputs['applications'][key]
        subprocess.run(['node', '--input-type=module', '-e',
            "import {verifyHeldUpgrade} from './deployment/maintenance/releases-20261111/held-policy.mjs'; verifyHeldUpgrade(process.argv[1]);", key], cwd=ROOT, check=True)
        source = Path('/var/lib/utilibre-maintenance/held-upgrades-20261111') / key
        receipt = json.loads((source / 'source-offer.json').read_text())
        assert hashlib.sha256((source / 'source.tar.gz').read_bytes()).hexdigest() == receipt['archiveSha256']
        name = spec['archive']
        assert name in ('chhoto-utilibre.tar.gz', 'bytestash-utilibre.tar.gz', 'wbo-utilibre.tar.gz', 'candlr-utilibre.tar.gz', 'kitchenowl-utilibre.tar.gz')
        dest = Path('/opt/utilibre/records/public') if key == 'candlr' else DEST
        if (dest / name).exists() and hashlib.sha256((dest / name).read_bytes()).hexdigest() == receipt['archiveSha256']:
            print(key + ': exact source offer already published; nothing changed')
            return
        publication = Path(tempfile.mkdtemp(prefix='source-update-', dir=dest.parent))
        if (dest / name).exists():
            shutil.copyfile(dest / name, publication / ('previous-' + name))
        shutil.copyfile(source / 'source.tar.gz', publication / name)
        (publication / name).chmod(0o644)
        (publication / name).replace(dest / name)
        (source / 'source-publication.json').write_text(json.dumps({'archiveSha256': receipt['archiveSha256'], 'previousDirectory': str(publication), 'file': name}, indent=2) + '\n')
        print(key + ': exact corresponding source published; previous archive retained')
        return
    patch, filename, recipes = PACKS[key]
    row = next(r for r in LEDGER if r['patch'] == patch)
    with tempfile.TemporaryDirectory(prefix='utilibre-publish-source-') as work:
        stage = Path(work)
        source = stage / 'source'
        source.mkdir()
        archive = subprocess.check_output(['git', '-c', 'filter.lfs.required=false',
            '-c', 'filter.lfs.process=', '-c', 'filter.lfs.smudge=', '-c', 'filter.lfs.clean=',
            '-C', row['source'], 'archive', row['revision']])
        with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
            tar.extractall(source, filter='data')
        for name in [*row['prerequisites'], patch]:
            subprocess.run(['git', 'apply', '--check', str(ROOT / name)], cwd=source, check=True)
            subprocess.run(['git', 'apply', str(ROOT / name)], cwd=source, check=True)
        if key == 'chhoto':
            vendor = ROOT / 'deployment/chhoto/vendor'
            for item in json.loads((vendor / 'SOURCES.json').read_text()):
                assert hashlib.sha256((vendor / item['file']).read_bytes()).hexdigest() == item['sha256']
            shutil.copytree(vendor, source / 'frontend/static/vendor', dirs_exist_ok=True)
        else:
            pins = json.loads((ROOT / 'deployment/maintenance/security-20261109/yopass-inputs.json').read_text())
            for name, digest in pins['locks'].items():
                assert hashlib.sha256((source / name).read_bytes()).hexdigest() == digest
            shutil.copyfile(ROOT / 'deployment/maintenance/security-20261109/yopass-inputs.json', stage / 'inputs.json')
        for directory in recipes:
            target = stage / 'integration' / directory
            for file in (ROOT / directory).rglob('*'):
                if not file.is_file() or '__pycache__' in file.parts:
                    continue
                assert not file.is_symlink()
                assert file.suffix in ('.py', '.mjs', '.js', '.md', '.json', '.css', '.patch', '.yaml', '.conf', '.html', '.service', '.timer') or file.name == 'Dockerfile' or file.name.endswith('-LICENSE')
                output = target / file.relative_to(ROOT / directory)
                output.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(file, output)
        (stage / 'PROVENANCE.json').write_text(json.dumps({
            'revision': row['revision'],
            'patches': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
                        for p in [*row['prerequisites'], patch]},
            'scope': 'Source and integration recipes only; no runtime configuration or user content.',
            'lfs': 'Git LFS pointers in optional upstream documentation remain pointers; no runtime build assets are fetched.',
        }, indent=2) + '\n')
        for p in stage.rglob('*'):
            if p.is_symlink():
                assert p.resolve().is_relative_to(source), 'Source link escapes the archive'
            assert p.name not in ('.env', 'node_modules', '.git')
        publication = Path(tempfile.mkdtemp(prefix='source-update-', dir=DEST.parent))
        output = publication / filename
        with tarfile.open(output, 'w:gz') as tar:
            for p in sorted(stage.iterdir()):
                tar.add(p, arcname=p.name)
        if (DEST / filename).exists():
            shutil.copyfile(DEST / filename, publication / ('previous-' + filename))
        digest = hashlib.sha256(output.read_bytes()).hexdigest()
        output.replace(DEST / filename)
        print(json.dumps({'file': filename, 'sha256': digest, 'previousDirectory': str(publication)}))


if __name__ == '__main__':
    import sys
    held = len(sys.argv) == 3 and sys.argv[2] == '--held-nov11'
    assert (held and sys.argv[1] in ('chhoto', 'bytestash', 'wbo', 'candlr', 'kitchenowl')) or (len(sys.argv) == 2 and sys.argv[1] in PACKS)
    publish(sys.argv[1], held)
