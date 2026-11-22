import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('dhi_review', Path(__file__).with_name('review-dhi-successors.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class DhiReviewTests(unittest.TestCase):
    def test_only_reviewed_advisory_and_proven_metadata_versions(self):
        item = {'status': 'needs-review', 'scope': 'runtime-image', 'type': 'debian',
                'artifact': 'sha256:reviewed', 'containers': ['fixture'], 'package': 'libssl3t64',
                'installed': 'signed-current', 'id': 'CVE-2026-124709'}
        def eligible(value):
            return m.eligible(value, 'sha256:reviewed', ['fixture'], 'libssl3t64',
                              {'signed-current', 'proven-stale'}, m.CRYPTO_IDS)
        self.assertTrue(eligible(item))
        self.assertTrue(eligible({**item, 'installed': 'proven-stale'}))
        for field, value in [('artifact', 'other'), ('containers', ['other']), ('package', 'other'),
                             ('installed', 'unverified'), ('scope', 'host-os'), ('status', 'mitigated'),
                             ('id', 'CVE-2026-84786'), ('id', 'CVE-2026-95690')]:
            self.assertFalse(eligible({**item, field: value}), (field, value))


if __name__ == '__main__':
    unittest.main()
