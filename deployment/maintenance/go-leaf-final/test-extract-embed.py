import hashlib
import importlib.util
import pathlib
import struct
import unittest

spec = importlib.util.spec_from_file_location("extract_embed", pathlib.Path(__file__).with_name("extract-embed.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def fixture(name="site/app.html", data=b"Fictional sample", corrupt=False):
    blob = bytearray(16384)
    blob[:7] = b"\x7fELF\x02\x01\x01"
    struct.pack_into("<H", blob, 18, 62)
    struct.pack_into("<Q", blob, 32, 64)
    struct.pack_into("<HH", blob, 54, 56, 1)
    struct.pack_into("<IIQQQQQQ", blob, 64, 1, 4, 0, 0x400000, 0, len(blob), len(blob), 4096)
    struct.pack_into("<QQQ", blob, 256, 0x400000 + 280, 1, 1)
    raw = name.encode()
    struct.pack_into("<QQQQ", blob, 280, 0x400000 + 4096, len(raw), 0x400000 + 8192, len(data))
    if len(data) <= 1024:
        digest = bytearray(hashlib.sha256(data).digest())
        digest[0] ^= 0xff
    else:
        digest = hashlib.sha256(b"\x01" + data).digest()
    blob[312:328] = bytes(16) if corrupt else digest[:16]
    blob[4096:4096 + len(raw)] = raw
    blob[8192:8192 + len(data)] = data
    return bytes(blob)

class EmbedTests(unittest.TestCase):
    def test_small_hash_encoding(self):
        files, tables = module.extract(fixture(), ["site"])
        self.assertEqual(files, {"site/app.html": b"Fictional sample"})
        self.assertEqual(tables, [{"records": 1, "selectedFiles": 1}])

    def test_large_hash_encoding(self):
        self.assertEqual(module.extract(fixture(data=b"x" * 4096), ["site"])[0]["site/app.html"], b"x" * 4096)

    def test_integrity_rejection(self):
        with self.assertRaises(AssertionError): module.extract(fixture(corrupt=True), ["site"])

    def test_traversal_rejection(self):
        for name in ["site/../bad", "/site/evil", "site//bad", "site/\\bad", "site/\0bad"]:
            with self.subTest(name=name), self.assertRaises(AssertionError): module.extract(fixture(name), ["site"])

    def test_missing_prefix_rejected(self):
        with self.assertRaises(AssertionError): module.extract(fixture(), ["site", "missing"])

    def test_wrong_table_rejected(self):
        with self.assertRaises(AssertionError): module.extract(fixture(), ["site"], 2)

    def test_unmapped_data_rejected(self):
        blob = bytearray(fixture());struct.pack_into("<Q", blob, 296, 0xffffffffffffffff)
        with self.assertRaises(AssertionError): module.extract(bytes(blob), ["site"])

    def test_wrong_arch_rejected(self):
        blob = bytearray(fixture());struct.pack_into("<H", blob, 18, 183)
        with self.assertRaises(AssertionError): module.extract(bytes(blob), ["site"])

    def test_root_file_allowed(self):
        self.assertIn("xess.css", module.extract(fixture("xess.css"), ["xess.css"])[0])

if __name__ == "__main__": unittest.main()
