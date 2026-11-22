import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('host_crypto_review', Path(__file__).with_name('review-host-openssl.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class HostCryptoScope(unittest.TestCase):
    def test_exact_host_fix_only(self):
        item = {'status': 'needs-review', 'scope': 'host-os', 'artifact': 'host-dpkg',
                'type': 'debian', 'package': 'libssl3t64', 'installed': m.VERSION,
                'id': 'CVE-2026-107493', 'containers': []}
        ids = {item['id']}
        self.assertTrue(m.eligible(item, ids))
        for key, value in [('scope', 'runtime-image'), ('artifact', 'other-host'),
                           ('type', 'ubuntu'), ('installed', '3.5.9-1~deb13u1'),
                           ('package', 'bundled-crypto'), ('id', 'CVE-2026-84786'),
                           ('status', 'accepted-risk'), ('containers', ['some-service'])]:
            with self.subTest(key=key):
                self.assertFalse(m.eligible({**item, key: value}, ids))


if __name__ == '__main__':
    unittest.main()
