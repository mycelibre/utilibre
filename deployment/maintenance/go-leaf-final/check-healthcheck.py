"""Wakapi's unchanged upstream healthcheck protocol, with fictional local HTTP."""
import json
import os
import pathlib
import subprocess
import threading
import time
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

root = pathlib.Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011')
assert all(a=='--oct28' for a in sys.argv[1:])
if '--oct28' in sys.argv:
    root = pathlib.Path('/var/lib/utilibre-maintenance/security-20261028/go-leaf')
binary = root / 'output/wakapi-healthcheck'
state = {'status': 200, 'delay': 0}

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        assert self.path == '/api/health'
        time.sleep(state['delay'])
        self.send_response(state['status'])
        self.end_headers()

    def log_message(self, *args): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    results = []
    for code, delay, expected in [(200, 0, 0), (503, 0, 1), (200, 2.5, 1)]:
        state.update(status=code, delay=delay)
        result = subprocess.run([str(binary)], env={'WAKAPI_PORT': str(server.server_port)},
                                capture_output=True, timeout=4)
        assert result.returncode == expected
        results.append({'status': code, 'delaySeconds': delay, 'exit': result.returncode})
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=3)
result = {'passed': True, 'results': results, 'network': 'loopback only'}
(root / 'output/wakapi-healthcheck-tests.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
