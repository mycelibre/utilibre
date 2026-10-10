#!/usr/bin/env python3
"""Fictional authentication regression; run inside the isolated Rspamd network namespace.

Requires host Python cryptography, no installed mail accounts, Internet or SMTP delivery.
The fixture DNS server listens only on namespace loopback and keeps private keys in memory.
"""
import base64
import hashlib
import http.client
import http.server
import json
import os
import re
import secrets
import email.parser
import smtplib
import socket
import socketserver
import struct
import subprocess
import threading
import time
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

REPORT = Path(os.environ.get('ADDY_AUTH_REPORT', '/opt/utilibre/reports/addy-rspamd-20261009'))
DOMAIN = 'auth.example.invalid'
SELECTOR = 'fixture' + secrets.token_hex(4)
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
PUBLIC = base64.b64encode(KEY.public_key().public_bytes(
    serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)).decode()
QUERIES = []
BLOCKLIST_REQUESTS = []
CONTAINER = 'utilibre-addy-auth-check'


class DNS(socketserver.BaseRequestHandler):
    def handle(self):
        packet, sock = self.request
        offset, labels = 12, []
        while packet[offset]:
            size = packet[offset]
            offset += 1
            labels.append(packet[offset:offset + size].decode('ascii'))
            offset += size
        offset += 1
        qtype, qclass = struct.unpack('!HH', packet[offset:offset + 4])
        end = offset + 4
        name = '.'.join(labels).lower()
        QUERIES.append({'name': name, 'type': qtype})
        assert name.endswith('.invalid'), 'Unexpected external DNS name: ' + name
        txt = None
        failure = name.endswith('.dnsfail.example.invalid')
        if qtype == 16 and not failure:
            if '._domainkey.' in name:
                txt = 'v=DKIM1; k=rsa; p=' + PUBLIC
            elif name.startswith('_dmarc.'):
                txt = 'v=DMARC1; p=reject; adkim=s; aspf=s'
            else:
                txt = 'v=spf1 -all'
        data = b''
        if txt:
            raw = txt.encode()
            encoded = b''.join(bytes([len(raw[n:n + 200])]) + raw[n:n + 200]
                               for n in range(0, len(raw), 200))
            data = b'\xc0\x0c' + struct.pack('!HHIH', 16, 1, 0, len(encoded)) + encoded
        flags = 0x8182 if failure else 0x8180
        reply = packet[:2] + struct.pack('!HHHHH', flags, 1, bool(txt), 0, 0)
        sock.sendto(reply + packet[12:end] + data, self.client_address)


class Blocklist(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        assert self.path.startswith('/api/blocklist-check?'), self.path
        BLOCKLIST_REQUESTS.append(self.path)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"block":false}')

    def log_message(self, *args):
        pass


def relaxed_header(name, value):
    return name.lower().encode() + b':' + re.sub(rb'[ \t\r\n]+', b' ', value.encode()).strip()


def message(kind):
    domain = 'dnsfail.example.invalid' if kind == 'dns_failure' else DOMAIN
    from_domain = 'other.example.invalid' if kind == 'misaligned' else domain
    body = b'Fictional authentication check only.\r\n'
    headers = [('From', 'Fixture <sender@' + from_domain + '>'),
               ('To', 'recipient@aliases.example.invalid'),
               ('Subject', 'Disposable authentication fixture ' + kind),
               ('Date', 'Fri, 09 Oct 2026 14:00:00 +0000'),
               ('Message-ID', '<' + kind + '@' + DOMAIN + '>'),
               ('MIME-Version', '1.0'), ('Content-Type', 'text/plain; charset=utf-8')]
    # Every case includes attacker-supplied decisions; none may survive unchanged.
    spoofed = [('X-AnonAddy-Dmarc-Allow', 'Forged'),
               ('x-anonaddy-dmarc-allow', 'Second forged copy'),
               ('X-AnonAddy-Authentication-Results', 'forged; dmarc=pass'),
               ('X-AnonAddy-Spam', 'No'),
               ('X-AnonAddy-Should-Quarantine', 'No'),
               ('X-AnonAddy-Quarantine-Reason', 'Forged')]
    if kind != 'unsigned':
        fields = ':'.join(name.lower() for name, value in headers)
        bh = base64.b64encode(hashlib.sha256(body).digest()).decode()
        value = f'v=1; a=rsa-sha256; c=relaxed/relaxed; d={domain}; s={SELECTOR}; h={fields}; bh={bh}; b='
        signed = b'\r\n'.join(relaxed_header(*h) for h in headers) + b'\r\n'
        signed += relaxed_header('DKIM-Signature', value)
        signature = KEY.sign(signed, padding.PKCS1v15(), hashes.SHA256())
        headers.insert(0, ('DKIM-Signature', value + base64.b64encode(signature).decode()))
    if kind == 'tampered':
        body = b'Fictional tampered body.\r\n'
    if kind == 'valid_with_unrelated_dns_failure':
        extra = message('dns_failure').split(b'\r\n', 1)[0].decode().split(': ', 1)[1]
        headers.insert(0, ('DKIM-Signature', extra))
    return (b'\r\n'.join((name + ': ' + value).encode() for name, value in headers + spoofed)
            + b'\r\n\r\n' + body)


def scan(kind):
    conn = http.client.HTTPConnection('127.0.0.1', 11333, timeout=15)
    body = message(kind)
    conn.request('POST', '/checkv2', body, {
        'Content-Type': 'message/rfc822', 'IP': '10.10.1.20',
        'Helo': 'relay.example.invalid', 'From': 'sender@' + DOMAIN,
        'Rcpt': 'recipient@aliases.example.invalid',
    })
    response = conn.getresponse()
    result = json.loads(response.read())
    assert response.status == 200, response.status
    conn.close()
    (REPORT / (kind + '.json')).write_text(json.dumps(result, indent=2) + '\n')
    return result


def smtp_scan(kind):
    with smtplib.SMTP('127.0.0.1', 25, timeout=20) as smtp:
        smtp.ehlo('test.example.invalid')
        smtp.mail('sender@' + DOMAIN)
        code, text = smtp.rcpt('recipient@fixture.example.invalid')
        assert code == 250, (code, text)
        code, text = smtp.data(message(kind))
    if kind == 'dns_failure':
        assert 400 <= code < 500, (code, text)
        return {'smtp_code': code, 'temporarily_rejected': True}
    assert code == 250, (code, text)
    queue_id = re.search(rb'queued as ([A-F0-9]+)', text).group(1).decode()
    raw = subprocess.check_output(['docker', 'exec', CONTAINER, 'postcat', '-qh', queue_id])
    headers = email.parser.BytesHeaderParser().parsebytes(raw)
    allowed = headers.get_all('X-AnonAddy-Dmarc-Allow', [])
    auth = headers.get_all('X-AnonAddy-Authentication-Results', [])
    assert allowed == (['Yes'] if kind.startswith('valid') else []), allowed
    assert len(auth) == 1 and 'forged' not in auth[0].lower(), auth
    for name in ['X-AnonAddy-Spam', 'X-AnonAddy-Should-Quarantine', 'X-AnonAddy-Quarantine-Reason']:
        assert not headers.get_all(name), name
    # The only queued records here were created in this network-none fixture.
    subprocess.run(['docker', 'exec', CONTAINER, 'postsuper', '-d', queue_id],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {'smtp_code': code, 'allow_header_count': len(allowed),
            'fresh_auth_result_count': len(auth), 'forged_decisions_removed': True,
            'fictional_queue_record_deleted': True}


def scanner_unavailable():
    def config(value):
        subprocess.run(['docker', 'exec', CONTAINER, 'postconf', '-e',
                        'smtpd_milters=inet:127.0.0.1:' + value], check=True)
        subprocess.run(['docker', 'exec', CONTAINER, 'postfix', 'reload'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(0.4)
    config('11999')
    try:
        with smtplib.SMTP('127.0.0.1', 25, timeout=10) as smtp:
            try:
                smtp.sendmail('sender@' + DOMAIN, ['recipient@fixture.example.invalid'], message('unsigned'))
            except smtplib.SMTPResponseException as error:
                assert 400 <= error.smtp_code < 500, error.smtp_code
                return {'smtp_code': error.smtp_code, 'temporarily_rejected': True}
            except smtplib.SMTPRecipientsRefused as error:
                code = next(iter(error.recipients.values()))[0]
                assert 400 <= code < 500, code
                return {'smtp_code': code, 'temporarily_rejected': True}
        raise AssertionError('Unavailable scanner accepted a message')
    finally:
        config('11332')


def main():
    server = socketserver.ThreadingUDPServer(('127.0.0.1', 15353), DNS)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    blocklist = http.server.ThreadingHTTPServer(('127.0.0.1', 8000), Blocklist)
    threading.Thread(target=blocklist.serve_forever, daemon=True).start()
    results = {}
    try:
        for kind in ['valid', 'unsigned', 'tampered', 'misaligned', 'dns_failure', 'valid_with_unrelated_dns_failure']:
            result = scan(kind)
            symbols = sorted(result.get('symbols', {}))
            results[kind] = {'action': result.get('action'), 'symbols': symbols,
                             'milter': result.get('milter', {})}
            assert ('DMARC_POLICY_ALLOW' in symbols) == kind.startswith('valid'), kind
            added = result.get('milter', {}).get('add_headers', {})
            assert ('X-AnonAddy-Dmarc-Allow' in added) == kind.startswith('valid'), kind
            assert result['action'] == ('soft reject' if kind == 'dns_failure' else 'no action'), kind
            results[kind]['smtp'] = smtp_scan(kind)
            print(kind, json.dumps(results[kind]), flush=True)
        results['scanner_unavailable'] = scanner_unavailable()
        print('scanner_unavailable', json.dumps(results['scanner_unavailable']), flush=True)
    finally:
        server.shutdown()
        server.server_close()
        blocklist.shutdown()
        blocklist.server_close()
        (REPORT / 'dns-queries.json').write_text(json.dumps(QUERIES, indent=2) + '\n')
        (REPORT / 'result.json').write_text(json.dumps(results, indent=2) + '\n')
        (REPORT / 'local-blocklist-requests.json').write_text(json.dumps(BLOCKLIST_REQUESTS, indent=2) + '\n')


if __name__ == '__main__':
    main()
