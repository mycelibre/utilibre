"""Native crypto and HTTP compatibility with disposable, networkless fixtures."""
import asyncio
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace


def run():
    import aiohttp
    import pgpy
    import requests
    from pgpy.constants import CompressionAlgorithm, HashAlgorithm, KeyFlags, PubKeyAlgorithm, SymmetricKeyAlgorithm
    from app.jose_utils import make_id_token, verify_id_token
    from app import pgp_utils

    # This uses the app's own token creation/verification and no real account.
    subject = SimpleNamespace(id=42, client=SimpleNamespace(oauth_client_id='fixture-client'), get_user_info=lambda: {'email': 'fixture@example.invalid'})
    token = make_id_token(subject)
    assert verify_id_token(token)
    header, payload, signature = token.split('.')
    changed = ('A' if signature[0] != 'A' else 'B') + signature[1:]
    assert not verify_id_token('.'.join([header, payload, changed]))

    # Generate an ephemeral key; no upstream sample or production key is copied.
    key = pgpy.PGPKey.new(PubKeyAlgorithm.RSAEncryptOrSign, 2048)
    key.add_uid(pgpy.PGPUID.new('Fictional museum', email='fixture@example.invalid'),
                usage={KeyFlags.Sign, KeyFlags.EncryptCommunications, KeyFlags.EncryptStorage},
                hashes=[HashAlgorithm.SHA256], ciphers=[SymmetricKeyAlgorithm.AES256],
                compression=[CompressionAlgorithm.ZLIB])
    text = 'Fictional exhibition: café, 日本語.'
    ctx = pgp_utils.create_pgp_context()
    for rust in [False, True]:
        encrypted = pgp_utils.encrypt_file_with_pgpy(text.encode(), str(key.pubkey), ctx, force_use_rust=rust)
        message = pgpy.PGPMessage.from_blob(encrypted) if isinstance(encrypted, str) else encrypted
        recovered = key.decrypt(message).message
        assert (recovered.decode() if isinstance(recovered, (bytes, bytearray)) else recovered) == text
    previous = pgp_utils.PGP_SENDER_PRIVATE_KEY
    try:
        pgp_utils.PGP_SENDER_PRIVATE_KEY = str(key)
        signature = pgpy.PGPSignature.from_blob(pgp_utils.sign_data_with_pgpy(text))
        assert key.pubkey.verify(text, signature)
        assert not key.pubkey.verify(text + ' changed', signature)
    finally:
        pgp_utils.PGP_SENDER_PRIVATE_KEY = previous

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            content = b'{"fixture":"museum"}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f'http://127.0.0.1:{server.server_port}/fixture'
    try:
        assert requests.get(url, timeout=5).json() == {'fixture': 'museum'}

        async def fetch():
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    assert await response.json() == {'fixture': 'museum'}
        asyncio.run(fetch())
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    print(json.dumps({'native_signed_token_and_tamper_rejection': True,
                      'native_pgpy_and_rust_encrypt_decrypt': True,
                      'native_pgp_signature_and_tamper_rejection': True,
                      'requests_and_aiohttp_loopback': True}))


if __name__ == '__main__':
    run()
