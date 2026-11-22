import unittest
from scanner_inventory import validate_inventory


class ScannerInventoryTests(unittest.TestCase):
    def record(self, name, version):
        return {'Name': name, 'Version': version}

    def test_current_and_inherited_versions_are_both_required(self):
        rows = [self.record('perl', 'current'), self.record('perl', 'older')]
        self.assertEqual(validate_inventory(rows, {'perl': 'current'}, {'perl': ['older']}),
                         ({'perl': 'current'}, {'perl': ['older']}))
        for records in (rows[:1], rows[1:], rows + [self.record('perl', 'unexpected')]):
            with self.assertRaises(ValueError):
                validate_inventory(records, {'perl': 'current'}, {'perl': ['older']})

    def test_undeclared_duplicates_and_package_changes_rejected(self):
        current = self.record('library', '1')
        for records in ([current, self.record('library', '0')], [self.record('other', '1')], []):
            with self.assertRaises(ValueError):
                validate_inventory(records, {'library': '1'}, {})

    def test_repeated_identical_metadata_does_not_hide_a_version(self):
        p = self.record('library', '1')
        self.assertEqual(validate_inventory([p, p], {'library': '1'}, {}), ({'library': '1'}, {}))
        with self.assertRaises(ValueError):
            validate_inventory([p], {'library': '1'}, {'library': ['1']})

    def test_upgraded_native_version_keeps_original_extra(self):
        expected = {'openssl': '3.5.9+dhi0'}
        inherited = {'openssl': ['3.5.3+dhi1']}
        rows = [self.record('openssl', '3.5.9+dhi0'), self.record('openssl', '3.5.3+dhi1')]
        self.assertEqual(validate_inventory(rows, expected, inherited), (expected, inherited))
        for records in (rows[:1], rows[1:], rows + [self.record('openssl', '3.5.7+dhi0')]):
            with self.assertRaises(ValueError):
                validate_inventory(records, expected, inherited)


if __name__ == '__main__':
    unittest.main()
