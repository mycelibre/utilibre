import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('review', Path(__file__).with_name('review-successor-payloads.py'))
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


class VendorSuccessors(unittest.TestCase):
    def test_exact_identity_and_vendor_open_rejection(self):
        item = {'status': 'needs-review', 'scope': 'runtime-image', 'type': 'debian',
                'artifact': 'exact', 'package': 'libmongoc-1.0-0t64', 'installed': '1.30.4-1+deb13u5',
                'id': 'CVE-2026-120956', 'containers': ['relay-a', 'relay-b']}
        check = lambda x: review.eligible(x, 'exact', ['relay-b', 'relay-a'], 'libmongoc-1.0-0t64')
        self.assertTrue(check(item))
        for change in ({'id': 'CVE-2026-93393'}, {'installed': '1.30.4-1+deb13u3+utilibre1'},
                       {'type': 'unknown'}, {'scope': 'host-os'}, {'artifact': 'other'},
                       {'containers': ['relay-a']}, {'status': 'mitigated'}, {'package': 'other'}):
            with self.subTest(change=change):
                self.assertFalse(check({**item, **change}))
        reviewed = {**item, 'status': 'mitigated'}
        self.assertTrue(review.eligible(reviewed, 'exact', ['relay-a', 'relay-b'], item['package'], True))
        self.assertFalse(review.eligible(reviewed, 'exact', ['relay-a'], item['package'], True))
        self.assertFalse(review.eligible({**reviewed, 'status': 'accepted-risk'}, 'exact', item['containers'], item['package'], True))

    def test_no_severity_is_excluded(self):
        item = {'status': 'needs-review', 'scope': 'runtime-image', 'type': 'debian',
                'artifact': 'exact', 'package': 'libfreetype6', 'installed': '2.13.3+dfsg-1+deb13u2',
                'id': 'CVE-2026-95512', 'containers': ['exporter']}
        for severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'):
            self.assertTrue(review.eligible({**item, 'severity': severity}, 'exact', ['exporter'], 'libfreetype6'))


if __name__ == '__main__':
    unittest.main()
