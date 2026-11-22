import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('bookkeeping', Path(__file__).with_name('restore-fips-bookkeeping.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BookkeepingTests(unittest.TestCase):
    def blobs(self):
        before = b'Package: zlib1g\nPriority: required\nVersion: 1\n\n'
        before += b''.join(('Package: ' + n + '\nVersion: 1\n\n').encode() for n in sorted(module.SELECTED))
        after = before.replace(b'Priority: required', b'Priority: optional')
        after = after.replace(b'Version: 1', b'Version: 2')[0:]
        after = after.replace(b'Package: zlib1g\nPriority: optional\nVersion: 2', b'Package: zlib1g\nPriority: optional\nVersion: 1')
        return before, after

    def test_only_exact_unrelated_field_restored(self):
        before, after = self.blobs()
        self.assertEqual(module.restore(before, after), after.replace(b'Priority: optional', b'Priority: required'))

    def test_other_changes_are_rejected(self):
        before, after = self.blobs()
        for bad in (after.replace(b'Priority: optional', b'Priority: extra'),
                    after.replace(b'Version: 1', b'Version: 3'),
                    after + b'Package: other\nVersion: 1\n\n', before):
            with self.assertRaises(AssertionError):
                module.restore(before, bad)


if __name__ == '__main__':
    unittest.main()
