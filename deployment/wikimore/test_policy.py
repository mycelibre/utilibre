"""Offline behavior checks; no Wikimedia request during import or tests."""
import io
import json
import unittest
from unittest.mock import patch
from urllib.error import URLError
from flask import send_file

PROJECTS = {'wiki': 'Wikipedia'}
LANGUAGES = {
    'en': {'name': 'English', 'projects': {'wiki': 'https://en.wikipedia.org'}},
    'es': {'name': 'Español', 'projects': {'wiki': 'https://es.wikipedia.org'}},
}
SITEMATRIX = {'sitematrix': {
    '0': {'name': 'English', 'code': 'en', 'site': [
        {'code': 'wiki', 'url': 'https://en.wikipedia.org', 'sitename': 'Wikipedia'}]},
    '1': {'name': 'Español', 'code': 'es', 'site': [
        {'code': 'wiki', 'url': 'https://es.wikipedia.org', 'sitename': 'Wikipedia'}]},
    'specials': [],
}}
with patch('urllib.request.urlopen', return_value=io.BytesIO(json.dumps(SITEMATRIX).encode())):
    import wsgi
from wikimore import media


class Response(io.BytesIO):
    headers = {'Content-Type': 'image/png', 'Content-Length': '4'}


class Tests(unittest.TestCase):
    def setUp(self):
        self.client = wsgi.app.test_client()

    def test_media_host_and_stream_boundaries(self):
        media.validate_url('https://upload.wikimedia.org/wikipedia/commons/a/a0/example.png')
        for url in ('http://upload.wikimedia.org/x', 'https://upload.wikimedia.org.evil.invalid/x',
                    'https://127.0.0.1/x', 'file:///etc/passwd',
                    'https://upload.wikimedia.org:444/x'):
            with self.subTest(url=url), self.assertRaises(ValueError):
                media.validate_url(url)
        with self.assertRaises(ValueError):
            media.SafeRedirects().redirect_request(None, None, 302, '', {}, 'http://127.0.0.1/')
        with patch.object(media, 'MAX_BYTES', 4):
            self.assertEqual(media.BoundedResponse(Response(b'abcd')).read(), b'abcd')
            with self.assertRaises(URLError):
                media.BoundedResponse(Response(b'abcde')).read()

    def test_native_routes_and_headers(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Referrer-Policy'], 'no-referrer')
        self.assertIn("img-src 'self' data:", response.headers['Content-Security-Policy'])
        self.assertEqual(self.client.post('/article').status_code, 405)
        self.assertEqual(self.client.get('/proxy?url=http://127.0.0.1/').status_code, 400)
        self.assertEqual(self.client.get('/healthz').data, b'ok\n')

    def test_source_archive_keeps_streaming(self):
        with patch.object(wsgi, 'send_from_directory',
                          side_effect=lambda *_args, **_kwargs: send_file(
                              io.BytesIO(b'archive'), download_name='source.tar.gz')):
            response = self.client.get('/utilibre-source/wikimore-utilibre.tar.gz')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, b'archive')
        self.assertEqual(response.headers['Referrer-Policy'], 'no-referrer')

    def test_no_external_browser_asset_or_image_fallback(self):
        from wikimore.app import get_proxy_url
        self.assertEqual(get_proxy_url('https://tracker.invalid/pixel'), '')
        self.assertTrue(get_proxy_url('https://upload.wikimedia.org/a.jpg').startswith('/proxy?'))
        with wsgi.app.test_request_context('/'):
            template = wsgi.app.jinja_env.get_template('interactivemap.html').render(
                title='Map', map_data={'markers': []}, map_image_url='', categories=[],
                interwiki=[], lang='en', project='wiki', domain='en.wikipedia.org', license=None,
                languages=LANGUAGES, wikimedia_projects=PROJECTS, extra_wikis=[])
        self.assertNotIn('nobsdelivr.private.coffee', template)
        self.assertIn('/static/vendor/leaflet-1.9.4/leaflet.js', template)
        self.assertIn('popupNode', template)


if __name__ == '__main__':
    unittest.main()
