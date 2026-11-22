"""Negative cases for the RSS-Bridge HTTP/2 configuration review."""
import importlib.util
from pathlib import Path
import unittest


MODULE = Path(__file__).with_name('review-rssbridge-nginx.py')
SPEC = importlib.util.spec_from_file_location('review_rssbridge_nginx', MODULE)
REVIEW = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REVIEW)


class Http2ConfigTests(unittest.TestCase):
    def test_plain_http_listener(self):
        self.assertFalse(REVIEW.has_http2_listener('http { server {\nlisten 8080;\n} }'))

    def test_http2_directive_blocks_review(self):
        self.assertTrue(REVIEW.has_http2_listener('http { http2 on; server {\nlisten 8080;\n} }'))

    def test_http2_listen_option_blocks_review(self):
        self.assertTrue(REVIEW.has_http2_listener('server {\nlisten 443 ssl http2;\n}'))

    def test_missing_listener_is_incomplete_evidence(self):
        with self.assertRaises(AssertionError):
            REVIEW.has_http2_listener('http { }')


if __name__ == '__main__':
    unittest.main()
