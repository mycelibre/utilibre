import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('glibc_review', Path(__file__).with_name('review-glibc.py'))
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


class ExactVendorReview(unittest.TestCase):
    def test_only_exact_fixed_runtime_identity(self):
        row = {'packages': {'libc6': {'package': 'trixie/libc6'}}, 'containers': ['service']}
        item = {'type': 'debian', 'scope': 'runtime-image', 'artifact': 'exact',
                'installed': review.VERSION, 'id': 'CVE-2026-6238',
                'package': 'libc6', 'containers': ['service']}
        self.assertTrue(review.eligible(item, row, 'exact'))
        for change in ({'artifact': 'other'}, {'installed': '2.41-12+deb13u4'},
                       {'id': 'CVE-2026-115819'}, {'scope': 'host-os'},
                       {'containers': ['other']}, {'package': 'unknown'}):
            self.assertFalse(review.eligible({**item, **change}, row, 'exact'))

    def test_missing_added_or_changed_payload_fails(self):
        expected = {'/usr/lib/libc.so': 'expected', '/usr/bin/getent': 'also-expected'}
        review.verify_hashes(expected, dict(expected))
        for observed in ({}, {'/usr/lib/libc.so': 'expected'},
                         {**expected, '/usr/lib/libc.so': 'tampered'},
                         {**expected, '/unexpected': 'other'}):
            with self.assertRaises(ValueError):
                review.verify_hashes(expected, observed)


if __name__ == '__main__':
    unittest.main()
