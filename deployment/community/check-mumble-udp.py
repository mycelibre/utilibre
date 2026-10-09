#!/usr/bin/env python3
"""One authenticated encrypted UDP silence loopback, never channel audio.

The only audio payload is the existing valid 20ms Opus silence packet. Target31
asks the native server to echo it only to this connection. Other users' messages
and channel state are ignored, never logged or saved. There is no TCP fallback:
success requires decrypting the matching response received on the UDP socket.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
import socket
import ssl
import struct
import sys
import time

FINGERPRINT = '83FA6AF8C67977E0FE4EDA3B1F6C83D6E5B24960CA969EDD87FD86E14C38EB01'
CRYPTO_HASH = '95acb03af24bf06e648ca51eedfae26a9d5e316b8203faf1a9580e50ba05ce04'
SILENCE = bytes.fromhex('f8fffe')


def varint(value):
    encoded = bytearray()
    while value > 127:
        encoded.append((value & 127) | 128)
        value >>= 7
    encoded.append(value)
    return bytes(encoded)


def read_varint(data, offset=0):
    value = 0
    for shift in range(0, 70, 7):
        if offset >= len(data):
            raise RuntimeError('Truncated protocol integer')
        byte = data[offset]
        offset += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, offset
    raise RuntimeError('Oversized protocol integer')


def field(number, value):
    if isinstance(value, int):
        return varint(number * 8) + varint(value)
    value = value.encode() if isinstance(value, str) else value
    return varint(number * 8 + 2) + varint(len(value)) + value


def fields(data):
    output = {}
    offset = 0
    while offset < len(data):
        tag, offset = read_varint(data, offset)
        wire = tag & 7
        if wire == 0:
            value, offset = read_varint(data, offset)
        elif wire == 2:
            length, offset = read_varint(data, offset)
            if length > len(data) - offset:
                raise RuntimeError('Truncated protocol field')
            value = data[offset:offset + length]
            offset += length
        elif wire in (1, 5):
            length = 8 if wire == 1 else 4
            value = data[offset:offset + length]
            offset += length
            if len(value) != length:
                raise RuntimeError('Truncated fixed protocol field')
        else:
            raise RuntimeError('Unexpected setup field type')
        output[tag >> 3] = value
    return output


def read_exact(connection, length):
    data = bytearray()
    while len(data) < length:
        chunk = connection.recv(length - len(data))
        if not chunk:
            raise RuntimeError('Mumble closed the setup connection')
        data.extend(chunk)
    return bytes(data)


def send(connection, message, body):
    connection.sendall(struct.pack('!HI', message, len(body)) + body)


def encrypt_datagram(state, payload):
    # The upstream helper returns a block-sized scratch buffer. Mumble sends
    # exactly four crypto-header bytes plus the original plaintext length; its
    # wire format carries no padding or independent plaintext-length field.
    return state.encrypt(payload)[:4 + len(payload)]


def voice_uint(value):
    # Positive legacy Mumble PacketDataStream integers, not protobuf varints.
    if value < 0 or value > 0xffffffff:
        raise RuntimeError('Unexpected native session identifier range')
    for width, ceiling, prefix in [(1, 0x80, 0), (2, 0x4000, 0x80), (3, 0x200000, 0xc0), (4, 0x10000000, 0xe0)]:
        if value < ceiling:
            raw = bytearray(value.to_bytes(width, 'big'))
            raw[0] |= prefix
            return bytes(raw)
    return b'\xf0' + value.to_bytes(4, 'big')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='mumble.utilibre.org')
    parser.add_argument('--crypto-path', required=True)
    parser.add_argument('--env-file', help='Local private runtime.env only; never a CLI password')
    parser.add_argument('--location', required=True, choices=['same-vm', 'external-runner'])
    parser.add_argument('--diagnostic', action='store_true', help='Print phase names only, never protocol bodies or secrets')
    parser.add_argument('--local-udp-port', type=int, default=0, help='Optional reserved fixture port for a packet-header-only diagnostic')
    args = parser.parse_args()
    helper = Path(args.crypto_path).resolve()
    if hashlib.sha256(helper.read_bytes()).hexdigest() != CRYPTO_HASH:
        raise RuntimeError('Upstream crypto helper checksum mismatch')
    spec = importlib.util.spec_from_file_location('utilibre_mumble_crypto', helper)
    crypto = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(crypto)
    password = os.environ.get('MUMBLE_TEST_SERVER_PASSWORD', '')
    if args.env_file:
        if args.location != 'same-vm':
            raise RuntimeError('Local runtime file is only for the same-VM check')
        for line in Path(args.env_file).read_text().splitlines():
            if line.startswith('MUMBLE_CONFIG_SERVER_PASSWORD='):
                password = line.split('=', 1)[1]
    if not password:
        raise RuntimeError('Missing private MUMBLE_TEST_SERVER_PASSWORD secret; no connection attempted')
    # Self-signed native server: pin the certificate BEFORE sending any password.
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    with socket.create_connection((args.host, 64738), timeout=10) as plain:
        with context.wrap_socket(plain, server_hostname='mumble.utilibre.org') as control:
            actual = hashlib.sha256(control.getpeercert(binary_form=True)).hexdigest().upper()
            if not secrets.compare_digest(actual, FINGERPRINT):
                raise RuntimeError('Mumble certificate fingerprint mismatch; no credentials sent')
            if args.diagnostic:
                print('Pinned TLS accepted', file=sys.stderr)
            send(control, 0, field(1, 0x10400) + field(2, 'Utilibre UDP loopback check') + field(3, 'Linux'))
            send(control, 2, field(1, 'Utilibre-udp-check-' + secrets.token_hex(4)) + field(2, password) + field(5, 1))
            password = None
            setup = None
            session = None
            deadline = time.monotonic() + 15
            while (setup is None or session is None) and time.monotonic() < deadline:
                message, length = struct.unpack('!HI', read_exact(control, 6))
                if length > 1024 * 1024:
                    raise RuntimeError('Oversized Mumble setup frame')
                body = read_exact(control, length)
                if message == 4:
                    raise RuntimeError('Native Mumble authentication rejected')
                if message == 15:
                    setup = fields(body)
                if message == 5:
                    session = fields(body).get(1)
            if setup is None or session is None or any(len(setup.get(x, b'')) != 16 for x in (1, 2, 3)):
                raise RuntimeError('Native session/key exchange did not complete')
            if args.diagnostic:
                print('Authenticated native key exchange completed', file=sys.stderr)
            state = crypto.CryptStateOCB2()
            state.set_key(setup[1], setup[2], setup[3])
            # Type4 (Opus), target31 (server loopback), sequence0, length3.
            payload = b'\x9f\x00\x03' + SILENCE
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as udp:
                udp.bind(('', args.local_udp_port))
                udp.connect((args.host, 64738))
                # Native encrypted connectivity pings establish the UDP peer
                # before audio. The first legacy packet may only establish the
                # peer's protocol version; two attempts are strictly bounded.
                ping = bytes([0x20, 1 + secrets.randbelow(126)])
                for attempt in range(2):
                    udp.settimeout(2)
                    udp.send(encrypt_datagram(state, ping))
                    try:
                        reply = udp.recv(4096)
                    except TimeoutError:
                        continue
                    if state.decrypt(reply, len(reply) - 4) != ping:
                        raise RuntimeError('Native encrypted UDP ping mismatch')
                    break
                else:
                    if args.diagnostic:
                        send(control, 3, field(1, 1))
                        control.settimeout(3)
                        for _ in range(20):
                            message, length = struct.unpack('!HI', read_exact(control, 6))
                            if length > 1024 * 1024:
                                raise RuntimeError('Oversized diagnostic response')
                            body = read_exact(control, length)
                            if message == 3:
                                print('Native server accepted encrypted packet: ' + str(fields(body).get(2, 0) > 0), file=sys.stderr)
                                break
                    raise RuntimeError('No authenticated encrypted UDP ping response')
                udp.settimeout(10)
                udp.send(encrypt_datagram(state, payload))
                if args.diagnostic:
                    print('Encrypted loopback packet sent; waiting for UDP return', file=sys.stderr)
                response = udp.recv(4096)
            decoded = state.decrypt(response, len(response) - 4)
            if decoded[0] >> 5 != 4 or not decoded.endswith(SILENCE):
                raise RuntimeError('Encrypted UDP response was not the expected Opus silence')
            # Validate the exact response and this connection's session only.
            if decoded != bytes([decoded[0]]) + voice_uint(session) + b'\x00\x03' + SILENCE:
                raise RuntimeError('Encrypted UDP loopback framing/session mismatch')
            print(json.dumps({'check': 'authenticated-encrypted-udp-loopback', 'location': args.location,
                              'host': args.host, 'tls_certificate_pinned': True, 'native_authentication': True,
                              'udp_response_authenticated': True, 'exact_silence_payload': True,
                              'encrypted_connectivity_ping': True,
                              'audio_packets_sent': 1, 'audio_milliseconds': 20, 'target': 31,
                              'channel_audio_sent': False, 'tcp_fallback_used': False}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never dump a protocol body, key, credential or user/channel record.
        raise SystemExit('Mumble UDP check failed: ' + str(error)) from None
