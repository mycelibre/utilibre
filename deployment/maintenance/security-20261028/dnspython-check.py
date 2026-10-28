"""Native DNS regression and real email-validator consumer, on isolated loopback."""
import importlib.metadata as metadata
import json
import socket
import struct
import sys
import threading
import dns.message
import dns.name
import dns.query
import dns.rcode
import dns.resolver
import dns.rrset
from email_validator import validate_email, EmailUndeliverableError

version, state = sys.argv[1:]
assert metadata.version('dnspython') == version
# Small bounded reproduction: 17 hops, not a CPU exhaustion attack.
wire = b'\0\0' + b''.join(struct.pack('!H', 0xC000 | n * 2) for n in range(17))
assert dns.name.from_wire(wire[:34], 32)[0] == dns.name.root
rejected = False
try:
    dns.name.from_wire(wire, 34)
except dns.exception.FormError as error:
    assert type(error).__name__ == 'PointerChainTooLong'
    rejected = True
assert rejected == (state == 'fixed')
for bad in [b'\xc0\x00', b'\xc0\xff', b'\x80']:
    try:
        dns.name.from_wire(bad, 0)
    except dns.exception.FormError:
        pass
    else:
        raise AssertionError('Malformed DNS accepted')

errors = []
udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp.bind(('127.0.0.1', 0)); port = udp.getsockname()[1]
tcp = socket.socket(); tcp.bind(('127.0.0.1', port)); tcp.listen(4)
stop = threading.Event()

def response(data):
    query = dns.message.from_wire(data)
    answer = dns.message.make_response(query)
    question = query.question[0]
    if str(question.name).startswith('missing.'):
        answer.set_rcode(dns.rcode.NXDOMAIN)
    else:
        records = {1: '192.0.2.1', 28: '2001:db8::1', 15: '10 mail.fixture.example.net.', 16: '"fictional DNS fixture"'}
        value = records.get(question.rdtype)
        if value:
            answer.answer.append(dns.rrset.from_text(question.name, 60, 'IN', question.rdtype, value))
    return answer.to_wire()

def serve_udp():
    udp.settimeout(.2)
    while not stop.is_set():
        try:
            data, peer = udp.recvfrom(4096); udp.sendto(response(data), peer)
        except socket.timeout:
            continue
        except Exception as error:
            errors.append(type(error).__name__); break

def receive_exact(conn, size):
    data = b''
    while len(data) < size:
        part = conn.recv(size - len(data))
        if not part: raise ValueError('Short TCP fixture message')
        data += part
    return data

def serve_tcp():
    tcp.settimeout(.2)
    while not stop.is_set():
        try:
            conn, _ = tcp.accept()
        except socket.timeout:
            continue
        try:
            with conn:
                conn.settimeout(1)
                size = struct.unpack('!H', receive_exact(conn, 2))[0]
                body = response(receive_exact(conn, size))
                conn.sendall(struct.pack('!H', len(body)) + body)
        except Exception as error:
            errors.append(type(error).__name__); break

threads = [threading.Thread(target=f, daemon=True) for f in [serve_udp, serve_tcp]]
for thread in threads: thread.start()
checks = 0
try:
    for transport in [dns.query.udp, dns.query.tcp]:
        for kind in ['A', 'AAAA', 'MX', 'TXT']:
            query = dns.message.make_query('fixture.example.net', kind)
            reply = transport(query, '127.0.0.1', port=port, timeout=2)
            assert len(reply.answer) == 1 and len(reply.answer[0]) == 1
            assert dns.message.from_wire(reply.to_wire()) == reply
            checks += 1
    resolver = dns.resolver.Resolver(configure=False)
    resolver.nameservers = ['127.0.0.1']; resolver.port = port; resolver.timeout = 1; resolver.lifetime = 2
    address = validate_email('fictional@fixture.example.net', dns_resolver=resolver)
    assert address.mx == [(10, 'mail.fixture.example.net')]
    try:
        validate_email('fictional@missing.example.net', dns_resolver=resolver)
    except EmailUndeliverableError:
        pass
    else:
        raise AssertionError('NXDOMAIN email accepted')
    checks += 2
finally:
    stop.set()
    for thread in threads: thread.join(1)
    udp.close(); tcp.close()
assert not errors, errors
print(json.dumps(dict(passed=True, version=version, excessiveChainRejected=rejected,
                     maximumChainAccepted=True, malformedCases=3, consumerChecks=checks,
                     network='Isolated loopback UDP/TCP; no external DNS or email sent')))
