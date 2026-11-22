import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('retained', Path(__file__).with_name('retain-reviews.py'))
retained = importlib.util.module_from_spec(spec)
spec.loader.exec_module(retained)


class RetainedRoles(unittest.TestCase):
    def test_completed_group_and_partial_shared_image(self):
        retained.role_scope(['a', 'b'], ['b', 'a'], ['a', 'b'], ['a', 'b'])
        retained.role_scope(['a', 'b'], ['a'], ['a'], ['a', 'b'], True)

    def test_missing_receipt_added_role_and_ambiguous_identity_rejected(self):
        for args in [
            (['a', 'b'], ['a'], ['a'], ['a', 'b'], False),
            (['a', 'b'], ['a', 'b'], ['a'], ['a', 'b'], True),
            (['a', 'b'], ['a', 'c'], ['a', 'c'], ['a', 'b'], True),
            (['a', 'b'], ['a'], ['a'], ['a'], True),
            (['a', 'b'], ['a'], ['a', 'a'], ['a', 'b'], True),
            (['a', 'b'], [], [], ['a', 'b'], True),
        ]:
            with self.subTest(args=args), self.assertRaises(AssertionError):
                retained.role_scope(*args)


if __name__ == '__main__':
    unittest.main()
