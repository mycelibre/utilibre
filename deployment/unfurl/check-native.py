"""Fictional header-only workflow in a disposable --network none container."""
import os
os.environ['UNFURL_HEADER_ONLY'] = 'true'
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from unfurl.core import Unfurl

hits = []
class Fixture(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def do_HEAD(self):
        hits.append((self.path, dict(self.headers)))
        assert self.command == 'HEAD'
        if self.path == '/start':
            self.send_response(302); self.send_header('Location', '/middle')
        elif self.path == '/middle':
            self.send_response(307); self.send_header('Location', '/final?book=fictional')
        elif self.path.startswith('/loop/'):
            n=int(self.path.rsplit('/',1)[1]); self.send_response(302)
            self.send_header('Location', f'/loop/{n+1}')
        else:
            self.send_response(200)
        self.send_header('Content-Length', '999999999')
        self.end_headers()
        # No body is sent. A body-reading client would hang/time out here.

server=ThreadingHTTPServer(('127.0.0.1',80), Fixture)
Thread(target=server.serve_forever,daemon=True).start()
def expand(url):
    u=Unfurl(remote_lookups=True)
    u.add_to_queue(data_type='url',key=None,value=url);u.parse_queue()
    return u
u=expand('http://127.0.0.1/start')
assert [h[0] for h in hits] == ['/start','/middle','/final?book=fictional'], hits
assert any(n.value=='http://127.0.0.1/final?book=fictional' for n in u.nodes.values())
assert not any('Cookie' in h or 'Authorization' in h for _,h in hits)
hits.clear(); u=expand('http://127.0.0.1/loop/0'); assert len(hits)==10,len(hits)
assert u.total_nodes<=100
server.shutdown()
print('PASS real fictional relative redirects, HEAD-only with no body read, no cookies/auth, ten-request bound; isolated test only')
