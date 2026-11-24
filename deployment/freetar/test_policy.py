"""Offline behavior checks for the reviewed Freetar source and deployment boundary."""
import unittest
from unittest.mock import patch

import wsgi
from freetar import ug


class Tests(unittest.TestCase):
    def setUp(self):
        self.client = wsgi.app.test_client()

    def test_local_provider_and_privacy_boundary(self):
        self.assertTrue(ug.LOCAL_MODE)
        response = self.client.get('/healthz')
        self.assertEqual(response.data, b'ok\n')
        self.assertEqual(response.headers['Referrer-Policy'], 'no-referrer')
        self.assertIn("connect-src 'none'", response.headers['Content-Security-Policy'])
        self.assertEqual(self.client.post('/search').status_code, 405)
        self.assertEqual(self.client.get('/search?search_term=' + 'x' * 257).status_code, 414)

    def test_tab_text_escapes_upstream_markup_but_keeps_chords(self):
        data = {'store': {'page': {'data': {
            'tab_view': {'wiki_tab': {'content': '<img src=x onerror=alert(1)>[ch]C[/ch]'},
                         'ug_difficulty': None, 'applicature': None,
                         'meta': {}, 'versions': []},
            'tab': {'artist_name': 'Example', 'song_name': 'Song', 'version': 1,
                    'type': 'Chords', 'rating': 0,
                    'tab_url': 'https://tabs.ultimate-guitar.com/tab/example/song-1'},
        }}}}
        song = ug.SongDetail(data)
        self.assertIn('&lt;img', song.tab)
        self.assertNotIn('<img', song.tab)
        self.assertIn('class="chord', song.tab)

    def test_native_search_route_is_preserved(self):
        with patch('freetar.backend.Search') as search:
            search.return_value.results = []
            search.return_value.total_pages = 0
            search.return_value.current_page = 1
            response = self.client.get('/search?search_term=guantanamera')
        self.assertEqual(response.status_code, 200)
        search.assert_called_once_with('guantanamera', 1)


if __name__ == '__main__':
    unittest.main()
