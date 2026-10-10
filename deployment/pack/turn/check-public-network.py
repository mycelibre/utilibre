"""External check of temporary bounded echo listeners, before starting coturn."""
import concurrent.futures
import json
import os
import socket
import urllib.request

payload = ('Utilibre-forward-check:' + os.environ['TURN_CHECK_TOKEN']).encode()


def check(item):
    protocol, port = item
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM if protocol == 'tcp' else socket.SOCK_DGRAM) as sock:
            sock.settimeout(5)
            sock.connect(('turn.utilibre.org', port))
            sock.sendall(payload)
            assert sock.recv(1024) == payload
        return {'protocol': protocol, 'port': port, 'passed': True}
    except (OSError, AssertionError):
        return {'protocol': protocol, 'port': port, 'passed': False}


with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    checks = list(pool.map(check, [('tcp', 3478), ('tcp', 5349), ('udp', 3478)] + [('udp', p) for p in range(49160, 49192)]))
try:
    with urllib.request.urlopen('http://turn.utilibre.org/.well-known/acme-challenge/utilibre-readiness', timeout=6) as response:
        challenge = response.read() == b'Utilibre TURN certificate endpoint ready\n'
except OSError:
    challenge = False
print(json.dumps({'portChecks': checks, 'certificateChallengeRouteReady': challenge}), flush=True)
assert all(c['passed'] for c in checks), 'Some forwarded ports did not return the exact synthetic payload'
