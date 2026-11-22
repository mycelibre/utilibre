import unittest
from adapter_scope import relocate_directory


class AdapterScopeTests(unittest.TestCase):
    def test_nested_source_literal_remains_usable(self):
        source = '''from pathlib import Path
HERE=Path(__file__).resolve().parent
def nested_script(code):
    return code.replace('HERE=Path(__file__).resolve().parent', 'HERE=Path("/fixture")')
'''
        namespace = {}
        exec(relocate_directory(source, '/private/fixture'), namespace)
        self.assertEqual(str(namespace['HERE']), '/private/fixture')
        self.assertEqual(namespace['nested_script']('HERE=Path(__file__).resolve().parent'),
                         'HERE=Path("/fixture")')

    def test_missing_or_ambiguous_anchor_is_rejected(self):
        anchor = 'HERE = Path(__file__).resolve().parent\n'
        for source in ['', anchor + anchor, 'code = "HERE=Path(__file__).resolve().parent"\n']:
            with self.subTest(source=source), self.assertRaises(AssertionError):
                relocate_directory(source, '/private/fixture')


if __name__ == '__main__':
    unittest.main()
