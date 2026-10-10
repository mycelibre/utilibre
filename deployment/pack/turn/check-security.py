"""Bounded native TURN authentication, peer isolation and port-isolation checks."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import sys
import time

COOKIE = 0x2112A442
SECRET = Path('/opt/utilibre/pack-secrets/galene-turn-secret').read_text().strip().encode()

# Regression for native ICE teardown: the SFU must reach its own authenticated
# TLS listener without router hairpin NAT. This exception must not expose other
# host services. A responsive ephemeral listener supplies the negative control.
pid = subprocess.check_output(['docker', 'inspect', 'utilibre-pack-galene-galene-1', '--format', '{{.State.Pid}}'], text=True).strip()
with socket.socket() as control:
    control.bind(('10.10.1.43', 0))
    control.listen(1)
    port = control.getsockname()[1]
    with socket.create_connection(('10.10.1.43', port), timeout=2):
        accepted, _ = control.accept()
        accepted.close()
    probe = '''import socket,ssl,sys
with socket.create_connection(('10.10.1.43',5349),timeout=3) as tcp:
 with ssl.create_default_context().wrap_socket(tcp,server_hostname='turn.utilibre.org') as tls:
  assert tls.version() in ('TLSv1.2','TLSv1.3')
try:
 s=socket.create_connection(('10.10.1.43',int(sys.argv[1])),timeout=2)
except (TimeoutError,ConnectionRefusedError):pass
else:
 s.close();raise AssertionError('Unrelated responsive host port is reachable')
'''
    subprocess.run(['nsenter', '-t', pid, '-n', sys.executable, '-c', probe, str(port)], check=True, timeout=10)


def attr(kind, value):
    return struct.pack('!HH', kind, len(value)) + value + b'\0' * (-len(value) % 4)


def attrs(data):
    result = {}
    pos = 20
    while pos + 4 <= len(data):
        kind, length = struct.unpack('!HH', data[pos:pos + 4])
        result[kind] = data[pos + 4:pos + 4 + length]
        pos += 4 + (length + 3) // 4 * 4
    return result


def error_code(data):
    value = attrs(data).get(9, b'\0\0\0\0')
    return value[2] * 100 + value[3]


def peer(address, port):
    return attr(0x12, struct.pack('!BBHI', 0, 1, port ^ (COOKIE >> 16), int.from_bytes(socket.inet_aton(address)) ^ COOKIE))


class Client:
    def __init__(self, expired=False, wrong=False):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.settimeout(2)
        self.sock.connect(('10.10.1.43', 3478))
        self.username = f'{int(time.time()) + (-60 if expired else 300)}:synthetic-check'.encode()
        self.password = base64.b64encode(hmac.new(SECRET, self.username, hashlib.sha1).digest()) if not wrong else b'wrong'
        self.realm = self.nonce = None

    def send(self, kind, body=b'', authenticated=True, indication=False):
        tx = os.urandom(12)
        if authenticated:
            body += attr(6, self.username) + attr(0x14, self.realm) + attr(0x15, self.nonce)
            header = struct.pack('!HHI', kind, len(body) + 24, COOKIE) + tx
            key = hashlib.md5(self.username + b':' + self.realm + b':' + self.password).digest()
            packet = header + body + attr(8, hmac.new(key, header + body, hashlib.sha1).digest())
        else:
            packet = struct.pack('!HHI', kind, len(body), COOKIE) + tx + body
        self.sock.send(packet)
        if indication:
            return
        data = self.sock.recv(4096)
        assert data[8:20] == tx
        return data

    def allocate(self):
        request = attr(0x19, b'\x11\0\0\0')
        data = self.send(3, request, authenticated=False)
        assert error_code(data) == 401, 'Anonymous allocation must be challenged'
        challenge = attrs(data)
        self.realm, self.nonce = challenge[0x14], challenge[0x15]
        return self.send(3, request)

    def close(self, allocated=False):
        try:
            if allocated:
                self.send(4, attr(0x0D, struct.pack('!I', 0)))
        finally:
            self.sock.close()


for kwargs in [{'expired': True}, {'wrong': True}]:
    client = Client(**kwargs)
    try:
        assert error_code(client.allocate()) == 401
    finally:
        client.close()

# Regression: bps-capacity reserves max-bps per allocation. Earlier settings
# accidentally admitted only four allocations, despite a larger count quota.
reservations = []
try:
    for _ in range(6):
        reservation = Client()
        response = reservation.allocate()
        if struct.unpack('!H', response[:2])[0] != 0x103:
            reservation.close()
            raise AssertionError('The reservation budget must admit at least six allocations')
        reservations.append(reservation)
finally:
    for reservation in reservations:
        reservation.close(allocated=True)

client = Client()
assert struct.unpack('!H', client.allocate()[:2])[0] == 0x103, 'Valid expiring credentials must allocate'
echo = None
try:
    for address in ['127.0.0.1', '10.10.1.43', '169.254.169.254', '172.29.98.3', '1.1.1.1']:
        code = error_code(client.send(8, peer(address, 48001)))
        assert code == 403, f'Relay must deny unrelated peer {address}; returned code {code}'
    # Responsive endpoints prove the distinction between allowed and blocked ports.
    pid = subprocess.check_output(['docker', 'inspect', 'utilibre-pack-galene-galene-1', '--format', '{{.State.Pid}}'], text=True).strip()
    code = '''import socket,selectors,json
sel=selectors.DefaultSelector();ports=[]
for candidates in [range(47800,48312),range(48400,48528)]:
 for port in candidates:
  s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
  try:s.bind(('172.29.99.10',port))
  except OSError:s.close();continue
  sel.register(s,selectors.EVENT_READ);ports.append(port);break
print(json.dumps(ports),flush=True)
while True:
 for key,_ in sel.select():
  data,addr=key.fileobj.recvfrom(1024)
  if data==b'Utilibre bounded relay check':key.fileobj.sendto(data,addr)
'''
    echo = subprocess.Popen(['nsenter', '-t', pid, '-n', 'python3', '-c', code], stdout=subprocess.PIPE, text=True)
    ports = json.loads(echo.stdout.readline())
    assert len(ports) == 2
    for port in ports:
        # Host control proves the otherwise-blocked service is actually responsive.
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as control:
            control.settimeout(2)
            control.sendto(b'Utilibre bounded relay check', ('172.29.99.10', port))
            assert control.recv(1024) == b'Utilibre bounded relay check'
        assert struct.unpack('!H', client.send(8, peer('172.29.99.10', port))[:2])[0] == 0x108
        client.send(0x16, peer('172.29.99.10', port) + attr(0x13, b'Utilibre bounded relay check'), authenticated=False, indication=True)
        try:
            reply = client.sock.recv(4096)
            assert port == ports[0] and attrs(reply)[0x13] == b'Utilibre bounded relay check'
        except socket.timeout:
            assert port == ports[1], 'Allowed Galene media must round-trip'
    print(json.dumps({'passed': True, 'checks': ['SFU local TURN TLS certificate verified', 'unrelated responsive host TCP service blocked', 'anonymous challenged', 'expired credentials denied', 'incorrect credentials denied', 'six concurrent bandwidth reservations', 'valid allocation', 'unrelated private/public peers denied', 'allowed Galene media roundtrip', 'responsive out-of-range Galene UDP service blocked']}))
finally:
    if echo:
        echo.terminate()
        echo.wait(timeout=3)
    client.close(allocated=True)
