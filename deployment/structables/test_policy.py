"""Offline checks; no upstream requests, accounts or production mounts."""
import io
import unittest
from urllib.error import URLError
from unittest.mock import patch
from structables import safe_http


class Response(io.BytesIO):
    headers = {}


class TransportTests(unittest.TestCase):
    def test_exact_upstream_hosts(self):
        safe_http.validate_url('https://content.instructables.com/F00/example.jpg')
        for url in ('http://www.instructables.com/', 'file:///etc/passwd',
                    'https://www.instructables.com.evil.invalid/',
                    'https://www.instructables.com@127.0.0.1/',
                    'https://cdn.instructables.com:444/', 'https://[::1]/',
                    'https://cdn.instructables.com/\\bad'):
            with self.subTest(url=url), self.assertRaises((ValueError, URLError)):
                safe_http.validate_url(url)

    def test_redirects_stop(self):
        with self.assertRaises(URLError):
            safe_http.NoRedirects().redirect_request(None, None, 302, '', {}, 'http://127.0.0.1/')

    def test_bounded_stream(self):
        with patch.object(safe_http, 'MAX_BYTES', 4):
            with safe_http.BoundedResponse(Response(b'abcd')) as r:
                self.assertEqual(r.read(), b'abcd')
            with safe_http.BoundedResponse(Response(b'abcde')) as r:
                self.assertEqual(r.read(3), b'abc')
                with self.assertRaises(URLError):
                    r.read(3)

    def test_headers_and_timeout(self):
        with patch.object(safe_http, 'build_opener') as op:
            op.return_value.open.return_value = Response(b'{}')
            self.assertEqual(safe_http.urlopen('https://www.instructables.com/', timeout=50).read(), b'{}')
            self.assertEqual(op.return_value.open.call_args.kwargs['timeout'], 10)


class WebTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Startup fetches fail closed; import never contacts an upstream here.
        with patch.object(safe_http, 'urlopen', side_effect=URLError('offline fixture')):
            import wsgi
        cls.wsgi = wsgi
        cls.client = wsgi.app.test_client()

    def test_real_function_and_blocked_routes(self):
        self.assertEqual(self.client.get('/healthz').data, b'ok\n')
        self.assertEqual(self.client.post('/').status_code, 405)
        self.assertEqual(self.client.post('/search', json={'q': 'test'}).status_code, 400)
        self.assertEqual(self.client.get('/cron/').status_code, 404)
        self.assertEqual(self.client.get('/iframe/?url=https://example.org').status_code, 404)
        self.assertEqual(self.client.get('/proxy/?url=http://127.0.0.1/').status_code, 400)
        self.assertEqual(self.client.get('/utilibre-source/etc/passwd').status_code, 404)

    def test_article_sanitizing(self):
        result = str(self.wsgi.clean_html('<p>Keep instructions <strong>bold</strong></p><script>alert(1)</script><img src="https://tracker.invalid/pixel"><a href="javascript:alert(1)">link</a>'))
        self.assertIn('<strong>bold</strong>', result)
        self.assertNotIn('<script', result)
        self.assertNotIn('tracker.invalid', result)
        self.assertNotIn('javascript:', result)
        valid = '/proxy/?url=https%3A%2F%2Fcontent.instructables.com%2Ftest.jpg'
        self.assertIn('src=', str(self.wsgi.clean_html(f'<img src="{valid}" alt="Example">')))

    def test_headers(self):
        r = self.client.get('/healthz')
        self.assertEqual(r.headers['Referrer-Policy'], 'no-referrer')
        self.assertIn("frame-src 'none'", r.headers['Content-Security-Policy'])
        self.assertNotIn('Set-Cookie', r.headers)

    def test_native_search_post_reaches_upstream_function(self):
        with patch('structables.routes.main.project_list', return_value='fixture results') as search:
            r = self.client.post('/search', data={'q': 'paper airplane'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, b'fixture results')
        search.assert_called_once()


if __name__ == '__main__':
    unittest.main()
