import unittest
from host_candidate import project_status


class HostCandidateTests(unittest.TestCase):
    def setUp(self):
        self.blob = b'Package: fixture\nStatus: hold ok installed\nVersion: 1\nSource: old (1)\n\nPackage: other\nStatus: install ok installed\nVersion: 7\n'
        self.controls = {'fixture': {'Package': 'fixture', 'Version': '2', 'Architecture': 'amd64', 'Source': 'new (2)'}}
        self.versions = {'fixture': ('1', '2')}

    def test_only_selected_version_and_source_change_hold_preserved(self):
        result = project_status(self.blob, self.versions, self.controls)
        self.assertIn(b'Status: hold ok installed', result)
        self.assertIn(b'Version: 2', result)
        self.assertIn(b'Source: new (2)', result)
        self.assertNotIn(b'Source: old', result)
        self.assertEqual(result.split(b'\n\n')[1], self.blob.split(b'\n\n')[1])

    def test_unsupported_or_ambiguous_input_rejected(self):
        for blob in (self.blob.replace(b'Version: 1', b'Version: 3'),
                     self.blob + b'\n' + self.blob,
                     self.blob.replace(b'Version: 1', b'Version: 1\nVersion: 1')):
            with self.assertRaises((AssertionError, ValueError)):
                project_status(blob, self.versions, self.controls)
        for field, value in [('Package', 'other'), ('Version', '3'), ('Architecture', 'arm64')]:
            with self.assertRaises(AssertionError):
                project_status(self.blob, self.versions, {'fixture': {**self.controls['fixture'], field: value}})


if __name__ == '__main__':
    unittest.main()
