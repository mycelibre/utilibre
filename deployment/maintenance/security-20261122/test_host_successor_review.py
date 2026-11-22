import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('successor_review', Path(__file__).with_name('review-host-successors.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class HostSuccessorScope(unittest.TestCase):
    def test_finite_vendor_scope(self):
        item = {'status': 'needs-review', 'scope': 'host-os', 'artifact': 'host-dpkg',
                'type': 'debian', 'package': 'qemu-utils', 'installed': m.VERSIONS['qemu-utils'],
                'id': 'CVE-2026-101291', 'containers': []}
        self.assertTrue(m.eligible(item))
        for key, value in [('scope', 'runtime-image'), ('artifact', 'other-host'),
                           ('installed', '1:11.1.3+ds-1'), ('type', 'ubuntu'),
                           ('id', 'CVE-9999-11111'), ('package', 'qemu-system-x86'),
                           ('status', 'accepted-risk'), ('containers', ['guest'])]:
            with self.subTest(key=key):
                self.assertFalse(m.eligible({**item, key: value}))
        sudo = {**item, 'package': 'sudo', 'installed': m.VERSIONS['sudo'], 'id': 'CVE-2026-96512'}
        self.assertTrue(m.eligible(sudo))
        self.assertFalse(m.eligible({**sudo, 'id': 'CVE-2005-1119'}))
        for advisory in ('CVE-2026-111819', 'CVE-2022-3872', 'CVE-2023-1386'):
            self.assertTrue(m.eligible({**item, 'id': advisory}))
            self.assertFalse(m.eligible({**item, 'id': advisory, 'installed': '1:11.1.2+ds-1'}))
            self.assertFalse(m.eligible({**sudo, 'id': advisory}))


if __name__ == '__main__':
    unittest.main()
