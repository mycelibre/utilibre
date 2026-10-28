import unittest
from tar_hardlinks import resolve_hardlinks


class HardlinkTests(unittest.TestCase):
    def test_content_and_symlink_semantics(self):
        rows = {'/a':'a'*64, '/b':'hardlink:a', '/c':'hardlink:b', '/d':'link:a'}
        resolved = resolve_hardlinks(rows)
        self.assertEqual(resolved, {'/a':'a'*64, '/b':'a'*64, '/c':'a'*64, '/d':'link:a'})
        self.assertEqual(rows['/b'], 'hardlink:a')

    def test_missing_cycle_and_symlink_targets_fail(self):
        for rows in ({'/a':'hardlink:missing'}, {'/a':'hardlink:a'},
                     {'/a':'hardlink:b','/b':'hardlink:a'},
                     {'/a':'hardlink:b','/b':'link:c'},
                     {'/a':'hardlink:../b','/b':'b'*64}):
            with self.assertRaises(ValueError):
                resolve_hardlinks(rows)


if __name__ == '__main__':
    unittest.main()
