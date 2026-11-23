#!/usr/bin/env python3
"""Local selection tests; no Docker socket or production files are touched."""

import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('reclaim', Path(__file__).with_name('reclaim-searxng-images.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NOW = datetime(2026, 11, 23, tzinfo=timezone.utc)


def image(number, days, *, tags=None):
    digest = 'sha256:' + f'{number:064x}'
    return {'Id': digest, 'Created': (NOW - timedelta(days=days)).isoformat(),
            'RepoTags': tags if tags is not None else ['searxng/searxng@' + digest],
            'RepoDigests': ['searxng/searxng@' + digest]}


class SelectionTests(unittest.TestCase):
    def test_keeps_running_recent_newest_and_configured_images(self):
        images = [image(i, days) for i, days in enumerate([0, 1, 2, 8, 15, 20, 25, 30], 1)]
        result = m.select_candidates(images, {images[5]['Id']},
                                     {images[6]['Id']}, NOW)
        self.assertEqual([item['id'] for item in result], [images[7]['Id'], images[4]['Id']])

    def test_rejects_mixed_tags_and_protects_digest_reference(self):
        old = image(1, 30)
        mixed = image(2, 40, tags=['searxng/searxng@' + 'sha256:' + '2' * 64,
                                    'another/app:old'])
        fresh = [image(i, i) for i in range(3, 6)]
        self.assertEqual(m.select_candidates([old, mixed, *fresh], set(),
                         {old['Id']}, NOW), [])

    def test_malformed_identity_or_clock_stops_cleanup(self):
        with self.assertRaises(ValueError):
            m.select_candidates([{'Id': 'short', 'RepoTags': []}], set(), set(), NOW)
        with self.assertRaises(ValueError):
            m.select_candidates([], set(), set(), datetime(2026, 11, 23))

    def test_configured_and_repair_digests_are_protected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            (root / 'docs').mkdir()
            (root / '.env').write_text('SEARXNG_IMAGE=searxng/searxng@sha256:' + 'a' * 64)
            (root / 'compose.yaml').write_text('image: searxng/searxng@sha256:' + 'b' * 64)
            (root / 'scripts/searxng-maintain.py').write_text('REPAIR=sha256:' + 'c' * 64)
            (root / 'docs/updates.md').write_text('Rollback: sha256:' + 'd' * 64)
            with patch.object(m, 'ROOT', root), patch.object(m, 'STATE', root / 'state'):
                self.assertEqual(m.protected_digests(),
                                 {'sha256:' + letter * 64 for letter in 'abcd'})


if __name__ == '__main__':
    unittest.main()
