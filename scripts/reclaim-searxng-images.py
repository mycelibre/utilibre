#!/usr/bin/env python3
"""Bound old official SearXNG image history without touching running images.

Default is read-only. The weekly disk-reclaim unit uses --apply. No registry
requests, image pulls, service restarts, or notifications occur here.
"""

import argparse
from datetime import datetime, timedelta, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
STATE = Path('/var/lib/utilibre-searx-updater')
OFFICIAL = re.compile(r'^(?:docker\.io/)?searxng/searxng@sha256:[0-9a-f]{64}$')
DIGEST = re.compile(r'sha256:[0-9a-f]{64}')
KEEP_DAYS = 14
KEEP_NEWEST = 3


def docker(*args):
    result = subprocess.run(['docker', *args], capture_output=True, text=True,
                            check=False, timeout=120)
    if result.returncode:
        raise RuntimeError(f'Docker {args[0]} failed ({result.returncode})')
    return result.stdout


def protected_digests():
    # Read these locally; never print .env or expanded Compose configuration.
    paths = [ROOT / '.env', ROOT / 'compose.yaml', STATE / 'last-run.json',
             ROOT / 'scripts/searxng-maintain.py']
    # Operational records can name exact rollback or repair images. Retain
    # those inputs even when they are older than the normal local history.
    paths.extend((ROOT / 'docs').rglob('*.md'))
    found = set()
    for path in paths:
        if path.exists():
            found.update(DIGEST.findall(path.read_text()))
    return found


def image_inventory():
    ids = sorted(set(docker('image', 'ls', '-a', '-q', '--no-trunc',
                            'searxng/searxng').splitlines()))
    images = json.loads(docker('image', 'inspect', *ids)) if ids else []
    containers = docker('container', 'ls', '-aq').splitlines()
    inspected = json.loads(docker('container', 'inspect', *containers)) if containers else []
    used = {item['Image'] for item in inspected}
    return images, used


def select_candidates(images, used, protected, moment):
    if moment.tzinfo is None:
        raise ValueError('A timezone-aware clock is required')
    eligible = []
    for image in images:
        identifier = image.get('Id')
        tags = image.get('RepoTags') or []
        digests = image.get('RepoDigests') or []
        if not isinstance(identifier, str) or not DIGEST.fullmatch(identifier):
            raise ValueError('Invalid Docker image identity')
        if not isinstance(tags, list) or not isinstance(digests, list):
            raise ValueError('Invalid Docker image references')
        if not tags or any(not isinstance(tag, str) or not OFFICIAL.fullmatch(tag) for tag in tags):
            continue  # Mixed or unfamiliar tags require manual review.
        created = datetime.fromisoformat(image['Created'].replace('Z', '+00:00'))
        if created.tzinfo is None or created > moment + timedelta(minutes=5):
            raise ValueError('Invalid Docker image creation time')
        eligible.append((created, identifier, image))

    newest = {identifier for _, identifier, _ in
              sorted(eligible, key=lambda row: (row[0], row[1]), reverse=True)[:KEEP_NEWEST]}
    cutoff = moment - timedelta(days=KEEP_DAYS)
    selected = []
    for created, identifier, image in eligible:
        references = image['RepoTags'] + (image.get('RepoDigests') or [])
        hashes = {match for ref in references for match in DIGEST.findall(ref)}
        if (created >= cutoff or identifier in newest or identifier in used or
                identifier in protected or hashes.intersection(protected)):
            continue
        selected.append({'id': identifier, 'created': created.isoformat(),
                         'created_raw': image['Created'], 'tags': image['RepoTags'],
                         'digests': image.get('RepoDigests') or []})
    return sorted(selected, key=lambda item: item['created'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Remove only reviewed old candidates')
    options = parser.parse_args()
    if options.apply and os.geteuid() != 0:
        raise SystemExit('Image removal requires root')
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (STATE / 'lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SystemExit('SearXNG maintenance is active; image cleanup deferred')
        if (STATE / 'pending.json').exists():
            raise SystemExit('Interrupted SearXNG update needs recovery before image cleanup')
        images, used = image_inventory()
        candidates = select_candidates(images, used, protected_digests(),
                                       datetime.now(timezone.utc))
        removed = []
        if options.apply:
            for item in candidates:
                # Docker refuses images still used by containers; do not force.
                current = json.loads(docker('image', 'inspect', item['id']))[0]
                if (current['Id'] != item['id'] or current.get('RepoTags') != item['tags'] or
                        (current.get('RepoDigests') or []) != item['digests'] or
                        current['Created'] != item['created_raw']):
                    raise RuntimeError('Image changed since inventory; cleanup stopped')
                docker('image', 'rm', item['id'])
                removed.append(item['id'])
        print(json.dumps({'mode': 'apply' if options.apply else 'check',
                          'keep_days': KEEP_DAYS, 'keep_newest': KEEP_NEWEST,
                          'candidates': len(candidates), 'removed': len(removed),
                          'ids': [item['id'] for item in candidates]}, sort_keys=True))


if __name__ == '__main__':
    main()
