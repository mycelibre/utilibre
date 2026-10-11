"""Small synthetic checks of the separate PairDrop option; no file/user traffic."""
import hashlib
import hmac
import json
import os
from pathlib import Path
import socket
import ssl
import struct
import subprocess

COOKIE = 0x2112A442
settings = json.loads(Path('/opt/utilibre/turn/settings.json').read_text())
password = Path('/opt/utilibre/turn/credential').read_text().strip().encode()


def attr(kind, value):
    return struct.pack('!HH', kind, len(value)) + value + b'\0' * (-len(value) % 4)


def attrs(data):
    result, pos = {}, 20
    while pos + 4 <= len(data):
        kind, length = struct.unpack('!HH', data[pos:pos + 4])
        result[kind] = data[pos + 4:pos + 4 + length]
        pos += 4 + (length + 3) // 4 * 4
    return result


def error_code(data):
    value = attrs(data).get(9, b'\0\0\0\0')
    return value[2] * 100 + value[3]


def peer_attr(address, port):
    return attr(0x12, struct.pack('!BBHI', 0, 1, port ^ (COOKIE >> 16), int.from_bytes(socket.inet_aton(address)) ^ COOKIE))


class Client:
    def __init__(self, wrong=False, family=1):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.settimeout(2)
        self.sock.connect((settings['bind'], settings['port']))
        self.password = b'wrong' if wrong else password
        self.family = family
        self.realm = self.nonce = None
        self.allocated = False

    def send(self, kind, body=b'', authenticated=True):
        tx = os.urandom(12)
        if authenticated:
            body += attr(6, b'pairdrop') + attr(0x14, self.realm) + attr(0x15, self.nonce)
            header = struct.pack('!HHI', kind, len(body) + 24, COOKIE) + tx
            key = hashlib.md5(b'pairdrop:' + self.realm + b':' + self.password).digest()
            packet = header + body + attr(8, hmac.new(key, header + body, hashlib.sha1).digest())
        else:
            packet = struct.pack('!HHI', kind, len(body), COOKIE) + tx + body
        self.sock.send(packet)
        data = self.sock.recv(4096)
        assert data[8:20] == tx
        return data

    def allocate(self):
        body = attr(0x19, b'\x11\0\0\0')
        if self.family != 1:
            body += attr(0x17, bytes([self.family, 0, 0, 0]))
        challenge = self.send(3, body, authenticated=False)
        assert error_code(challenge) == 401, 'Anonymous allocation was not challenged'
        self.realm, self.nonce = attrs(challenge)[0x14], attrs(challenge)[0x15]
        result = self.send(3, body)
        self.allocated = struct.unpack('!H', result[:2])[0] == 0x103
        if self.allocated:
            _, family, port, address = struct.unpack('!BBHI', attrs(result)[0x16])
            assert family == 1
            self.relay = (socket.inet_ntoa((address ^ COOKIE).to_bytes(4)), port ^ (COOKIE >> 16))
        return result

    def send_data(self, peer, payload):
        body = peer_attr(*peer) + attr(0x13, payload)
        self.sock.send(struct.pack('!HHI', 0x16, len(body), COOKIE) + os.urandom(12) + body)

    def close(self):
        try:
            if self.allocated:
                self.send(4, attr(0x0D, struct.pack('!I', 0)))
        finally:
            self.sock.close()


with socket.create_connection((settings['bind'], settings['tlsPort']), timeout=3) as tcp:
    with ssl.create_default_context().wrap_socket(tcp, server_hostname=settings['host']) as tls:
        assert tls.version() in ('TLSv1.2', 'TLSv1.3')

wrong = Client(wrong=True)
try:
    assert error_code(wrong.allocate()) == 401
finally:
    wrong.close()
clients = []
try:
    for _ in range(settings['quota']):
        client = Client()
        clients.append(client)
        assert struct.unpack('!H', client.allocate()[:2])[0] == 0x103, 'Reservation budget failed before the allocation quota'
    extra = Client()
    clients.append(extra)
    assert error_code(extra.allocate()) == 486, 'Excess allocation must be refused'
    for address in ['127.0.0.1', '10.10.1.20', '169.254.169.254', '172.29.99.10', '192.168.1.1']:
        peer = peer_attr(address, 48001)
        assert error_code(clients[0].send(8, peer)) == 403, 'Private or own-host peer was not rejected'
    a, b = clients[:2]
    # Permissions do not send traffic to the named address.
    public_permission = a.send(8, peer_attr('1.1.1.1', 48001))
    assert struct.unpack('!H', public_permission[:2])[0] == 0x108, f'Public IPv4 permission failed: {error_code(public_permission)}'
    for sender, receiver in [(a, b), (b, a)]:
        assert receiver.relay[0] == settings['publicIp']
        assert settings['relayMin'] <= receiver.relay[1] <= settings['relayMax']
        permission = sender.send(8, peer_attr(*receiver.relay))
        assert struct.unpack('!H', permission[:2])[0] == 0x108, f'Relay peer permission failed: {error_code(permission)}'
    payload = b'Utilibre synthetic relay-to-relay check'
    a.send_data(b.relay, payload)
    assert attrs(b.sock.recv(4096))[0x13] == payload, 'Relay-to-relay payload mismatch'
    b.send_data(a.relay, payload)
    assert attrs(a.sock.recv(4096))[0x13] == payload, 'Reverse relay-to-relay payload mismatch'
    # Permission is IP-based; the independent firewall must refuse the same
    # public IP outside PairDrop's relay ports. Observe only aggregate counters.
    def self_drops():
        rules = subprocess.check_output(['iptables', '-w', '-L', 'UTILIBRE-PAIRDROP-TURN', '-n', '-v', '-x'], text=True)
        return sum(int(line.split()[0]) for line in rules.splitlines() if 'DROP' in line and ('10.0.0.0/8' in line or settings['publicIp'] in line))
    before = self_drops()
    a.send_data((settings['publicIp'], 48001), payload)
    import time
    for _ in range(10):
        if self_drops() > before:
            break
        time.sleep(0.05)
    assert self_drops() > before, 'Own-host non-relay port was not firewall-blocked'
    print(json.dumps({'passed':True, 'checks':['valid TLS certificate', 'anonymous challenge', 'wrong credential refused', 'eight allocation reservations and ninth refused', 'private, metadata and Galene peers refused', 'bidirectional exact-byte relay-to-relay transfer', 'own-public-IP non-relay port firewall-blocked'], 'limits':{'allocations':settings['quota'],'perAllocationBytesPerSecond':settings['bps'],'reservationCapacity':settings['total']}, 'notTested':['external NAT', 'public browser forced-relay transfer', 'bandwidth throughput']}))
finally:
    for client in clients:
        client.close()

# A responsive negative control tests the independent firewall, not a timeout
# against an absent host. No listener or fixture survives the test.
with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as target:
    target.bind((settings['bind'], 0))
    target.settimeout(1)
    port = target.getsockname()[1]
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as control:
        control.sendto(b'Utilibre firewall fixture', (settings['bind'], port))
        assert target.recv(128) == b'Utilibre firewall fixture'
    code = '''import socket,sys
s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
for port in range(49700,49732):
 try:s.bind(('10.10.1.43',port));break
 except OSError:continue
else:raise AssertionError('No free test relay port')
try:s.sendto(b'Utilibre firewall fixture',('10.10.1.43',int(sys.argv[1])))
except PermissionError:pass
finally:s.close()
'''
    subprocess.run(['setpriv', '--reuid=4005', '--regid=4005', '--clear-groups', 'python3', '-c', code, str(port)], check=True)
    try:
        target.recv(128)
    except socket.timeout:
        pass
    else:
        raise AssertionError('Relay UID reached the responsive private destination')
print(json.dumps({'uidFirewallPrivatePeerDenialPassed': True}))

# Run the unavailable-family check last: a rejected allocation can retain native
# reservation state until its allocation-establishment timeout. This script is
# a pre-activation quota test, not a check to run against active visitors.
ipv6 = Client(family=2)
try:
    assert error_code(ipv6.allocate()) == 440, 'IPv6 allocation must not be available'
finally:
    ipv6.close()
subprocess.run(['ip6tables', '-w', '-C', 'OUTPUT', '-m', 'owner', '--uid-owner', '4005', '-j', 'DROP'], check=True)
print(json.dumps({'ipv6AllocationRefusedAndEgressBlocked': True}))
