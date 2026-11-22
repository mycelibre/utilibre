import importlib.util
import io
from pathlib import Path
import tarfile
import unittest

spec = importlib.util.spec_from_file_location('crypto_review', Path(__file__).with_name('review-openssl.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def archive(text, name='libssl3t64', extra=False, link=False):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w') as tar:
        item = tarfile.TarInfo(name)
        item.size = len(text.encode())
        if link:
            item.type = tarfile.SYMTYPE
            item.linkname = '/etc/passwd'
            item.size = 0
        tar.addfile(item, None if link else io.BytesIO(text.encode()))
        if extra:
            tar.addfile(tarfile.TarInfo('unexpected'))
    return output.getvalue()


class PackageRecord(unittest.TestCase):
    def test_exact_record(self):
        m.distroless_version(archive('Package: libssl3t64\nVersion: reviewed-version\n'), 'libssl3t64', 'reviewed-version')

    def test_rejects_wrong_or_ambiguous_input(self):
        good = 'Package: libssl3t64\nVersion: reviewed-version\n'
        cases = [archive(good.replace('reviewed-version', 'old-version')),
                 archive(good + 'Version: reviewed-version\n'),
                 archive(good.replace('libssl3t64', 'other-package')),
                 archive(good, '../libssl3t64'), archive(good, extra=True),
                 archive(good, link=True), b'invalid archive']
        for packed in cases:
            with self.subTest(size=len(packed)):
                with self.assertRaises((AssertionError, tarfile.TarError)):
                    m.distroless_version(packed, 'libssl3t64', 'reviewed-version')


if __name__ == '__main__':
    unittest.main()
