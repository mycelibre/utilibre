"""Refuse missing, ambiguous and wrong-branch vendor claims."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('review', Path(__file__).with_name('review-rssbridge-nginx.py'))
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


class FixedRecordTests(unittest.TestCase):
    def test_explicit_vendor_fix(self):
        review.fixed_record('<li>CVE-2026-123007<br>Not vulnerable: 1.31.9+, 1.30.7+<br></li>', 'CVE-2026-123007', '1.30.7')

    def test_no_blanket_version_or_advisory_acceptance(self):
        text = '<li>CVE-2026-123007<br>Not vulnerable: 1.31.9+<br></li>'
        for advisory, version in [('CVE-2026-123007', '1.30.7'), ('CVE-2026-12300', '1.31.9'), ('CVE-2026-123008', '1.31.9')]:
            with self.subTest(advisory=advisory, version=version), self.assertRaises(AssertionError):
                review.fixed_record(text, advisory, version)

    def test_ambiguous_primary_record(self):
        text = '<li>CVE-2026-123007<br>Not vulnerable: 1.30.7+<br></li>'
        with self.assertRaises(AssertionError):
            review.fixed_record(text + text, 'CVE-2026-123007', '1.30.7')


if __name__ == '__main__':
    unittest.main()
