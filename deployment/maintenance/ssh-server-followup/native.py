"""Bounded protocol regressions. Run only in the isolated, network-none fixture.

The fixture uses generated keys/accounts and loopback. No host SSH keys,
configuration, private sessions, or production service are mounted.
"""
import contextlib
import argparse
import hashlib
import json
import os
from pathlib import Path
import queue
import secrets
import socket
import subprocess
import tempfile
import threading
import time

import paramiko
from paramiko.message import Message

os.umask(0o077)
assert Path('/.dockerenv').exists()
ROOT = Path('/build')
WORK = Path(tempfile.mkdtemp(prefix='native-', dir=ROOT))
parser = argparse.ArgumentParser()
parser.add_argument('--candidate-version', choices=['10.0p1-7+deb13u4+utilibre2', '10.0p1-7+deb13u4+utilibre3'], default='10.0p1-7+deb13u4+utilibre2')
NEXT = parser.parse_args().candidate_version
OLD = '10.0p1-7+deb13u4+utilibre1'
RESULTS = []


def run(args, data=None, env=None, timeout=30, check=True):
    p = subprocess.run([str(a) for a in args], input=data, stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, timeout=timeout, env=env)
    if check and p.returncode:
        (WORK / 'failure.log').write_bytes(p.stdout + p.stderr)
        raise AssertionError('Fixture subprocess failed: ' + str(args[0]))
    return p


def record(name, **details):
    RESULTS.append(dict(name=name, passed=True, **details))
    print(json.dumps(RESULTS[-1]), flush=True)


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


PACKAGES = {}
for label, base, version in [('baseline', Path('/previous'), OLD), ('candidate', ROOT, NEXT)]:
    dest = WORK / label
    dest.mkdir()
    for package in ['openssh-client', 'openssh-server', 'openssh-sftp-server']:
        run(['dpkg-deb', '-x', base / (package + '_' + version + '_amd64.deb'), dest])
    PACKAGES[label] = dest

# This container has no published ports or external network. An unlocked root
# fixture account allows synthetic key and local Kerberos authentication.
run(['passwd', '-d', 'root'])
if run(['getent', 'passwd', 'sshd'], check=False).returncode:
    run(['useradd', '--system', '--home-dir', '/run/sshd', '--shell', '/usr/sbin/nologin', 'sshd'])
Path('/run/sshd').mkdir(exist_ok=True)
Path('/etc/pam.d/sshd').write_bytes((PACKAGES['candidate'] / 'etc/pam.d/sshd').read_bytes())
for name in ['host', 'client', 'wrong']:
    run([PACKAGES['candidate'] / 'usr/bin/ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', WORK / name])
KEY = paramiko.Ed25519Key.from_private_key_file(str(WORK / 'client'))


@contextlib.contextmanager
def daemon(label, *, disable=False, pam=False, extra='', env=None):
    tree = PACKAGES[label]
    port = free_port()
    config = WORK / ('sshd-' + secrets.token_hex(4) + '.conf')
    config.write_text(f'''ListenAddress 127.0.0.1
Port {port}
HostKey {WORK}/host
PidFile {WORK}/unused.pid
SshdAuthPath {tree}/usr/lib/openssh/sshd-auth
SshdSessionPath {tree}/usr/lib/openssh/sshd-session
AuthorizedKeysFile {WORK}/client.pub
PasswordAuthentication no
KbdInteractiveAuthentication yes
PubkeyAuthentication yes
GSSAPIAuthentication yes
GSSAPIKeyExchange yes
GSSAPIStrictAcceptorCheck no
UsePAM {'yes' if pam else 'no'}
PermitRootLogin yes
StrictModes yes
AllowTcpForwarding yes
AllowAgentForwarding yes
PermitTunnel yes
DisableForwarding {'yes' if disable else 'no'}
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 15
RekeyLimit 16K
LogLevel ERROR
Subsystem sftp {tree}/usr/lib/openssh/sftp-server
{extra}
''')
    run([tree / 'usr/sbin/sshd', '-t', '-f', config], env=env)
    log = open(WORK / 'fixture-daemons.log', 'ab')
    p = subprocess.Popen([str(tree / 'usr/sbin/sshd'), '-D', '-e', '-f', str(config)],
                         stdout=log, stderr=log, env=env)
    try:
        for _ in range(50):
            assert p.poll() is None, 'Fixture sshd failed'
            try:
                with socket.create_connection(('127.0.0.1', port), timeout=.1):
                    break
            except OSError:
                time.sleep(.05)
        else:
            raise AssertionError('Fixture listener timeout')
        yield port
    finally:
        p.terminate()
        p.wait(timeout=10)
        log.close()


def transport(port, authenticate=False):
    t = paramiko.Transport(socket.create_connection(('127.0.0.1', port), timeout=5))
    t.start_client(timeout=5)
    expected = paramiko.Ed25519Key(filename=str(WORK / 'host'))
    assert t.get_remote_server_key() == expected
    if authenticate:
        t.auth_publickey('root', KEY)
        assert t.is_authenticated()
    return t


def send(t, typ, *fields):
    m = Message()
    m.add_byte(bytes([typ]))
    for field in fields:
        if isinstance(field, int):
            m.add_int(field)
        else:
            m.add_string(field)
    t._send_user_message(m)


def packet_events(t, types):
    events = queue.Queue()
    t._handler_table = t._handler_table.copy()
    for typ in types:
        t._handler_table[typ] = lambda m, typ=typ: events.put((typ, m))
    if 1 in types:
        # Paramiko dispatches DISCONNECT before its ordinary handler table.
        t._parse_disconnect = lambda m: events.put((1, m))
    return events


def gss_limit(label, username='root', error_packet=65):
    with daemon(label) as port:
        t = transport(port)
        events = packet_events(t, [1, 6, 51, 60, 65])
        try:
            send(t, 5, 'ssh-userauth')
            assert events.get(timeout=5)[0] == 6
            responses = failures = 0
            disconnected = False
            for attempt in range(5):
                send(t, 50, username, 'ssh-connection', 'gssapi-with-mic', 1,
                     bytes.fromhex('06092a864886f712010202'))
                kind, message = events.get(timeout=5)
                assert kind == 60, 'GSSAPI must negotiate its mechanism'
                responses += 1
                send(t, error_packet, b'fictional-fixture-cancel')
                try:
                    while True:
                        kind, message = events.get(timeout=.3 if label == 'baseline' else 5)
                        if kind == 65:
                            continue
                        if kind == 51:
                            failures += 1
                        elif kind == 1:
                            reason, detail = message.get_int(), message.get_text()
                            assert reason == 2 and 'Too many authentication failures' in detail
                            disconnected = True
                        else:
                            raise AssertionError('Unexpected GSSAPI response')
                        break
                except queue.Empty:
                    assert label == 'baseline' and error_packet == 65
                if disconnected:
                    break
            if label == 'baseline':
                assert responses == 5 and failures == 0 and not disconnected
            else:
                assert responses == 3 and failures == 2 and disconnected
            record('gssapi-maxauthtries', server=label, usernameClass='existing' if username == 'root' else 'invalid',
                   packet='ERRTOK' if error_packet == 65 else 'TOKEN', negotiatedAttempts=responses,
                   failureReplies=failures, limit=3, disconnectedAtLimit=disconnected)
        finally:
            t.close()


def tunnel(label, disable):
    with daemon(label, disable=disable) as port:
        t = transport(port, True)
        events = packet_events(t, [91, 92])
        try:
            # One point-to-point TUN request; creation occurs only inside this
            # container's private network namespace. No addresses/routes added.
            send(t, 90, 'tun@openssh.com', 73, 65536, 32768, 1, 2147483647)
            kind, message = events.get(timeout=5)
            assert message.get_int() == 73
            expected = 92 if label == 'candidate' and disable else 91
            assert kind == expected, (label, disable, kind)
            if kind == 91:
                remote = message.get_int()
                send(t, 97, remote)
            record('disable-forwarding-tunnel', server=label, disableForwarding=disable,
                   permitTunnel=True, accepted=kind == 91)
        finally:
            t.close()


def ssh_args(label, port, wrong=False):
    known = WORK / ('wrong-known' if wrong else 'known')
    known.write_text(f'[127.0.0.1]:{port} ' + (WORK / ('wrong.pub' if wrong else 'host.pub')).read_text())
    return [PACKAGES[label] / 'usr/bin/ssh', '-F', '/dev/null', '-p', str(port),
            '-i', WORK / 'client', '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
            '-o', 'StrictHostKeyChecking=yes', '-o', 'UserKnownHostsFile=' + str(known),
            '-o', 'GlobalKnownHostsFile=/dev/null', '-o', 'RekeyLimit=16K', '-o', 'ConnectTimeout=5']


def compatibility(label, pam):
    with daemon(label, pam=pam) as port:
        data = secrets.token_bytes(512 * 1024)
        p = run(ssh_args('candidate', port) + ['root@127.0.0.1', 'cat'], data=data, timeout=45)
        assert p.stdout == data
        if label == 'candidate':
            assert run(ssh_args('baseline', port) + ['root@127.0.0.1', 'cat'], data=data, timeout=45).stdout == data
        bad = run(ssh_args('candidate', port, wrong=True) + ['root@127.0.0.1', 'true'], check=False)
        assert bad.returncode and b'HOST IDENTIFICATION HAS CHANGED' in bad.stderr
        t = transport(port, True)
        try:
            with paramiko.SFTPClient.from_transport(t) as sftp:
                path = str(WORK / 'sftp-roundtrip')
                with sftp.open(path, 'wb') as f:
                    f.write(data)
                with sftp.open(path, 'rb') as f:
                    assert f.read() == data
            with socket.socket() as echo:
                echo.bind(('127.0.0.1', 0))
                echo.listen(1)
                def respond():
                    peer, _ = echo.accept()
                    with peer:
                        payload = peer.recv(4096)
                        peer.sendall(payload)
                worker = threading.Thread(target=respond)
                worker.start()
                with t.open_channel('direct-tcpip', echo.getsockname(), ('127.0.0.1', 12345), timeout=5) as ch:
                    ch.sendall(b'fictional-forward')
                    assert ch.recv(4096) == b'fictional-forward'
                worker.join(timeout=5)
                assert not worker.is_alive()
            reverse_port = t.request_port_forward('127.0.0.1', 0)
            with socket.create_connection(('127.0.0.1', reverse_port), timeout=5) as peer:
                with t.accept(timeout=5) as channel:
                    peer.sendall(b'fictional-remote-forward')
                    assert channel.recv(4096) == b'fictional-remote-forward'
                    channel.sendall(b'fictional-remote-reply')
                    assert peer.recv(4096) == b'fictional-remote-reply'
            t.cancel_port_forward('127.0.0.1', reverse_port)
        finally:
            t.close()
        record('native-compatibility', server=label, candidateClient=True, pam=pam,
               echoBytes=len(data), rekeyLimit=16384, sftpByteEquality=True,
               localForwarding=True, remoteForwarding=True, changedHostRejected=True,
               previousClientCompatible=label == 'candidate')


def kerberos_success():
    realm = WORK / 'realm'
    realm.mkdir()
    port = free_port()
    env = dict(os.environ, KRB5_CONFIG=str(realm / 'krb5.conf'),
               KRB5_KDC_PROFILE=str(realm / 'kdc.conf'),
               KRB5_KTNAME=str(realm / 'host.keytab'), KRB5CCNAME='FILE:' + str(realm / 'ccache'))
    (realm / 'krb5.conf').write_text(f'''[libdefaults]
 default_realm = UTILIBRE.TEST
 dns_lookup_realm = false
 dns_lookup_kdc = false
 rdns = false
[realms]
 UTILIBRE.TEST = {{
  kdc = 127.0.0.1:{port}
 }}
''')
    (realm / 'kdc.conf').write_text(f'''[kdcdefaults]
 kdc_ports = {port}
 kdc_tcp_ports = {port}
[realms]
 UTILIBRE.TEST = {{
  database_name = {realm}/principal
  key_stash_file = {realm}/stash
  max_life = 1h
 }}
''')
    run(['kdb5_util', 'create', '-s', '-r', 'UTILIBRE.TEST', '-P', secrets.token_hex(24)], env=env)
    for principal, keytab in [('host/localhost', 'host.keytab'), ('root', 'client.keytab')]:
        run(['kadmin.local', '-r', 'UTILIBRE.TEST', '-q', 'addprinc -randkey ' + principal], env=env)
        run(['kadmin.local', '-r', 'UTILIBRE.TEST', '-q', 'ktadd -k ' + str(realm / keytab) + ' ' + principal], env=env)
    log = open(realm / 'kdc.log', 'wb')
    kdc = subprocess.Popen(['krb5kdc', '-n', '-r', 'UTILIBRE.TEST'], env=env, stdout=log, stderr=log)
    try:
        time.sleep(.5)
        assert kdc.poll() is None
        run(['kinit', '-k', '-t', realm / 'client.keytab', 'root@UTILIBRE.TEST'], env=env)
        with daemon('candidate', pam=True, env=env) as sshport:
            args = ssh_args('candidate', sshport) + ['-o', 'GSSAPIAuthentication=yes', '-o',
                    'PreferredAuthentications=gssapi-with-mic', '-o', 'GSSAPIServerIdentity=localhost',
                    '-o', 'GSSAPITrustDNS=no', 'root@127.0.0.1', 'printf fictional-gssapi-ok']
            assert run(args, env=env).stdout == b'fictional-gssapi-ok'
        record('successful-gssapi-pam', server='candidate', privateRealm=True, realKerberosTicket=True)
    finally:
        kdc.terminate()
        kdc.wait(timeout=10)
        log.close()


gss_limit('baseline')
gss_limit('candidate')
gss_limit('candidate', username='utilibre-nonexistent-fixture')
gss_limit('candidate', error_packet=61)
tunnel('baseline', True)
tunnel('candidate', True)
tunnel('candidate', False)
compatibility('baseline', False)
compatibility('candidate', False)
compatibility('candidate', True)
kerberos_success()
payloads = {name: hashlib.sha256((PACKAGES['candidate'] / path).read_bytes()).hexdigest()
            for name, path in {'ssh': 'usr/bin/ssh', 'sshd': 'usr/sbin/sshd',
                               'sshd-auth': 'usr/lib/openssh/sshd-auth',
                               'sshd-session': 'usr/lib/openssh/sshd-session',
                               'sftp-server': 'usr/lib/openssh/sftp-server'}.items()}
report = dict(date=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), passed=True,
              packageVersion='1:' + NEXT, checks=RESULTS, payloadSha256=payloads,
              productionChanged=False, fixture=str(WORK), network='isolated loopback only')
(ROOT / 'native.json').write_text(json.dumps(report, indent=2) + '\n')
print('All native SSH fixture gates passed.', flush=True)
