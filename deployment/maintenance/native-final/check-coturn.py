"""Disposable Coturn native protocol checks. No production configuration/data."""
import hashlib
import hmac
import ipaddress
import json
import os
from pathlib import Path
import socket
import ssl
import struct
import subprocess
import sys
import tempfile
import time

IMAGE = sys.argv[1]
BASE = "utilibre-coturn:4.18.0-security-20261011"
NAME = f"maintenance-coturn-native-{os.getpid()}"
COOKIE = 0x2112A442
PASSWORD = os.urandom(24).hex().encode()
USERNAME = b"fictional-check"
PORT = 3478


def run(*args):
    return subprocess.check_output(args, text=True).strip()


def attr(kind, value):
    return struct.pack("!HH", kind, len(value)) + value + b"\0" * (-len(value) % 4)


def attrs(data):
    result, pos = {}, 20
    while pos + 4 <= len(data):
        kind, length = struct.unpack("!HH", data[pos:pos + 4])
        result[kind] = data[pos + 4:pos + 4 + length]
        pos += 4 + (length + 3) // 4 * 4
    return result


def code(data):
    value = attrs(data).get(9, b"\0\0\0\0")
    return value[2] * 100 + value[3]


def peer(address, port):
    return attr(0x12, struct.pack("!BBHI", 0, 1, port ^ (COOKIE >> 16), int.from_bytes(socket.inet_aton(address)) ^ COOKIE))


class Client:
    def __init__(self, address, wrong=False, transport="udp", cert=None):
        self.transport = transport
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM if transport == "udp" else socket.SOCK_STREAM)
        self.sock.settimeout(3)
        self.sock.connect((address, 5349 if transport == "tls" else PORT))
        if transport == "tls":
            self.sock = ssl.create_default_context(cafile=str(cert)).wrap_socket(self.sock, server_hostname="relay.invalid")
        self.password = b"wrong" if wrong else PASSWORD
        self.allocated = False

    def receive(self):
        if self.transport == "udp":
            return self.sock.recv(4096)
        def exact(length):
            data = b""
            while len(data) < length:
                part = self.sock.recv(length - len(data))
                assert part, "Unexpected EOF"
                data += part
            return data
        header = exact(20)
        return header + exact(struct.unpack("!H", header[2:4])[0])

    def send(self, kind, body=b"", authenticated=True):
        tx = os.urandom(12)
        if authenticated:
            body += attr(6, USERNAME) + attr(0x14, self.realm) + attr(0x15, self.nonce)
            header = struct.pack("!HHI", kind, len(body) + 24, COOKIE) + tx
            key = hashlib.md5(USERNAME + b":" + self.realm + b":" + self.password).digest()
            packet = header + body + attr(8, hmac.new(key, header + body, hashlib.sha1).digest())
        else:
            packet = struct.pack("!HHI", kind, len(body), COOKIE) + tx + body
        self.sock.sendall(packet)
        data = self.receive()
        assert data[8:20] == tx
        return data

    def allocate(self):
        body = attr(0x19, b"\x11\0\0\0")
        challenge = self.send(3, body, False)
        assert code(challenge) == 401, f"Expected anonymous challenge, received native code {code(challenge)}, message type {struct.unpack('!H', challenge[:2])[0]:04x}, attributes {list(attrs(challenge))}"
        self.realm, self.nonce = attrs(challenge)[0x14], attrs(challenge)[0x15]
        response = self.send(3, body)
        self.allocated = struct.unpack("!H", response[:2])[0] == 0x103
        if self.allocated:
            _, family, port, address = struct.unpack("!BBHI", attrs(response)[0x16])
            assert family == 1
            self.relay = socket.inet_ntoa((address ^ COOKIE).to_bytes(4)), port ^ (COOKIE >> 16)
        return response

    def close(self):
        try:
            if self.allocated:
                self.send(4, attr(0x0D, struct.pack("!I", 0)))
        finally:
            self.sock.close()


clients = []
try:
    subnet_args = []
    if os.environ.get("UTILIBRE_COTURN_TEST_SUBNET"):
        explicit_subnet = ipaddress.ip_network(os.environ["UTILIBRE_COTURN_TEST_SUBNET"])
        assert explicit_subnet.version == 4 and explicit_subnet.prefixlen == 28
        assert explicit_subnet.subnet_of(ipaddress.ip_network("198.18.0.0/15")), "Use only the bounded benchmark lab range"
        routes = json.loads(run("ip", "-j", "route", "show", "table", "all"))
        assert not any(explicit_subnet.overlaps(ipaddress.ip_network(r["dst"], strict=False)) for r in routes if r.get("dst") not in (None, "default")), "Lab subnet overlaps a host route"
        subnet_args = ["--subnet", str(explicit_subnet)]
    run("docker", "network", "create", "--internal", *subnet_args, NAME)
    subnet = json.loads(run("docker", "network", "inspect", NAME))[0]["IPAM"]["Config"][0]["Subnet"]
    address = str(ipaddress.ip_network(subnet).network_address + 2)
    with tempfile.TemporaryDirectory(prefix="maintenance-coturn-native-") as temporary:
        directory = Path(temporary)
        directory.chmod(0o755)
        cert, key = directory / "cert.pem", directory / "key.pem"
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=relay.invalid", "-addext", "subjectAltName=DNS:relay.invalid", "-keyout", str(key), "-out", str(cert)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        key.chmod(0o644)  # Disposable synthetic TLS key, no production certificate.
        cert.chmod(0o644)
        config = directory / "turnserver.conf"
        config.write_text(f"""listening-ip={address}
relay-ip={address}
listening-port=3478
tls-listening-port=5349
min-port=49160
max-port=49179
realm=relay.invalid
user={USERNAME.decode()}:{PASSWORD.decode()}
lt-cred-mech
fingerprint
user-quota=4
total-quota=4
max-bps=1048576
bps-capacity=8388608
no-cli
no-dtls
no-multicast-peers
no-tcp-relay
no-rfc5780
no-stun-backward-compatibility
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
allowed-peer-ip={address}
cert=/fixture/cert.pem
pkey=/fixture/key.pem
pidfile=/tmp/turn.pid
log-file=/dev/null
no-stdout-log
""")
        # Readable by the isolated unprivileged relay even when the release
        # runner uses umask 077. These are freshly generated fixture credentials,
        # never production credentials. An unreadable config makes upstream fall
        # back to defaults, which the anonymous-allocation check correctly rejects.
        config.chmod(0o644)
        run("docker", "run", "-d", "--name", NAME, "--network", NAME, "--ip", address, "--cpus", "1", "--memory", "256m", "--pids-limit", "64", "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "-v", f"{directory}:/fixture:ro", "--entrypoint", "turnserver", IMAGE, "-c", "/fixture/turnserver.conf")
        for _ in range(30):
            try:
                with socket.create_connection((address, PORT), timeout=0.3):
                    break
            except OSError:
                time.sleep(0.2)
        else:
            raise AssertionError("Isolated relay did not listen")
        # Native binary and feature listing must remain byte-identical.
        digest = run("docker", "exec", NAME, "sha256sum", "/usr/bin/turnserver").split()[0]
        baseline = run("docker", "run", "--rm", "--network", "none", "--cpus", "1", "--memory", "128m", "--entrypoint", "sha256sum", BASE, "/usr/bin/turnserver").split()[0]
        assert digest == baseline
        packages = run("docker", "exec", NAME, "dpkg-query", "-W", "-f=${binary:Package}\n").splitlines()
        assert not {"bind9-dnsutils", "bind9-host", "bind9-libs", "liblmdb0", "libxml2"}.intersection(p.split(":")[0] for p in packages)
        wrong = Client(address, wrong=True)
        clients.append(wrong)
        assert code(wrong.allocate()) == 401
        for transport in ["udp", "tcp", "tls"]:
            client = Client(address, transport=transport, cert=cert)
            clients.append(client)
            assert struct.unpack("!H", client.allocate()[:2])[0] == 0x103
            assert 49160 <= client.relay[1] <= 49179
            for blocked in ["127.0.0.1", "10.10.1.20", "169.254.169.254"]:
                assert code(client.send(8, peer(blocked, 48001))) == 403
        fourth = Client(address)
        clients.append(fourth)
        assert struct.unpack("!H", fourth.allocate()[:2])[0] == 0x103
        extra = Client(address)
        clients.append(extra)
        assert code(extra.allocate()) == 486
        a, b = clients[1], clients[3]  # UDP and TLS clients: bidirectional relay.
        for sender, receiver in [(a, b), (b, a)]:
            assert struct.unpack("!H", sender.send(8, peer(*receiver.relay))[:2])[0] == 0x108
        payload = b"fictional native relay payload"
        for sender, receiver in [(a, b), (b, a)]:
            body = peer(*receiver.relay) + attr(0x13, payload)
            sender.sock.sendall(struct.pack("!HHI", 0x16, len(body), COOKIE) + os.urandom(12) + body)
            assert attrs(receiver.receive())[0x13] == payload
        for client in clients:
            client.close()
        clients.clear()
        print(json.dumps({"passed": True, "image": json.loads(run("docker", "inspect", NAME))[0]["Image"], "binarySha256": digest, "removedPackages": ["bind9-dnsutils", "bind9-host", "bind9-libs", "liblmdb0", "libxml2"], "checks": ["unchanged native relay binary", "authenticated UDP/TCP/TLS allocations", "anonymous challenge and wrong-password refusal", "private and metadata peer denial", "four-allocation quota and fifth refused", "exact-byte bidirectional UDP-to-TLS relay", "native refresh deletion"], "limits": "isolated internal network; four allocations; no production data or credentials", "notTested": ["external NAT", "public certificate", "production firewall", "bandwidth throughput"]}))
finally:
    for client in clients:
        try:
            client.close()
        except OSError:
            pass
    subprocess.run(["docker", "rm", "-f", NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(["docker", "network", "rm", NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
