"""Synthetic SDK/Barman integration; only a private loopback TLS S3 fixture.

This is a test server, never deployed. It independently verifies SigV4 HMACs,
contains a few bytes of fictional data and cannot receive real credentials.
"""
import hashlib
import hmac
import io
import json
import os
import re
import ssl
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qsl, quote
import xml.etree.ElementTree as ET

ACCESS = 'FICTIONALACCESSKEY'
SECRET = 'fictional-not-a-service-secret-only-for-loopback-tests'
TOKEN = 'fictional-session-token'
PAYLOAD = 'fictional native backup ñ\n'.encode()
for key in list(os.environ):
    if key.startswith('AWS_') or key.lower() in ('http_proxy', 'https_proxy', 'all_proxy'):
        del os.environ[key]
os.environ.update(AWS_ACCESS_KEY_ID=ACCESS, AWS_SECRET_ACCESS_KEY=SECRET,
                  AWS_SESSION_TOKEN=TOKEN, AWS_DEFAULT_REGION='us-east-1',
                  AWS_EC2_METADATA_DISABLED='true', AWS_CA_BUNDLE='/fixture/cert.pem',
                  AWS_CONFIG_FILE='/dev/null', AWS_SHARED_CREDENTIALS_FILE='/dev/null',
                  AWS_REQUEST_CHECKSUM_CALCULATION='when_required',
                  AWS_RESPONSE_CHECKSUM_VALIDATION='when_required', NO_PROXY='localhost,127.0.0.1')
import boto3
import botocore
import s3transfer
import urllib3
from botocore.config import Config
from botocore.exceptions import ClientError, SSLError
from barman.cloud_providers.aws_s3 import S3CloudInterface

assert (boto3.__version__, botocore.__version__, s3transfer.__version__, urllib3.__version__) == ('1.40.72', '1.40.72', '0.14.0', '2.8.0')
objects = {}
operations = []
errors = []

class Server(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *_):
        pass

    def respond(self, code, body=b'', content_type='application/xml'):
        self.send_response(code)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Content-Type', content_type)
        self.send_header('ETag', '"' + hashlib.md5(body).hexdigest() + '"')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def handle_request(self):
        length = int(self.headers.get('Content-Length', '0'))
        assert 0 <= length <= 65536
        body = self.rfile.read(length)
        parts = urlsplit(self.path)
        match = re.fullmatch(r'AWS4-HMAC-SHA256 Credential=([^,]+), SignedHeaders=([^,]+), Signature=([a-f0-9]{64})', self.headers.get('Authorization', ''))
        assert match, 'Expected native SigV4, without printing request headers'
        credential, signed, signature = match.groups()
        key, date, region, service, end = credential.split('/')
        assert (region, service, end) == ('us-east-1', 's3', 'aws4_request')
        assert self.headers.get('X-Amz-Security-Token') == TOKEN
        canonical_headers = ''.join(name + ':' + ' '.join(self.headers[name].strip().split()) + '\n' for name in signed.split(';'))
        query = '&'.join(quote(k, safe='-_.~') + '=' + quote(v, safe='-_.~') for k, v in sorted(parse_qsl(parts.query, keep_blank_values=True)))
        payload_hash = self.headers['X-Amz-Content-SHA256']
        assert payload_hash in (hashlib.sha256(body).hexdigest(), 'UNSIGNED-PAYLOAD')
        canonical = '\n'.join([self.command, parts.path, query, canonical_headers, signed, payload_hash])
        scope = '/'.join([date, region, service, end])
        to_sign = '\n'.join(['AWS4-HMAC-SHA256', self.headers['X-Amz-Date'], scope, hashlib.sha256(canonical.encode()).hexdigest()])
        signing = ('AWS4' + SECRET).encode()
        for step in (date, region, service, end):
            signing = hmac.new(signing, step.encode(), hashlib.sha256).digest()
        expected = hmac.new(signing, to_sign.encode(), hashlib.sha256).hexdigest()
        if key != ACCESS or not hmac.compare_digest(expected, signature):
            operations.append('rejected-credentials')
            self.respond(403, b'<Error><Code>AccessDenied</Code><Message>Fictional denial</Message></Error>')
            return
        operations.append(self.command)
        assert parts.path.startswith('/fictional-bucket')
        name = parts.path.removeprefix('/fictional-bucket/').removeprefix('/fictional-bucket')
        if self.command == 'HEAD':
            self.respond(200)
        elif self.command == 'PUT':
            assert name and body == PAYLOAD
            objects[name] = body
            self.respond(200)
        elif self.command == 'GET' and name:
            if name in objects:
                self.respond(200, objects[name], 'application/octet-stream')
            else:
                self.respond(404, b'<Error><Code>NoSuchKey</Code><Message>Fictional missing key</Message></Error>')
        elif self.command == 'GET':
            rows = ''.join('<Contents><Key>' + key + '</Key><Size>' + str(len(value)) + '</Size></Contents>' for key, value in objects.items())
            self.respond(200, ('<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>fictional-bucket</Name><IsTruncated>false</IsTruncated>' + rows + '</ListBucketResult>').encode())
        elif self.command == 'DELETE':
            objects.pop(name, None)
            self.respond(204)
        else:
            raise AssertionError('Unexpected fixture operation')

    def dispatch(self):
        try:
            self.handle_request()
        except BaseException as error:
            errors.append(type(error).__name__ + ': ' + str(error))
            self.respond(500, b'<Error><Code>FixtureFailure</Code></Error>')

    do_HEAD = do_GET = do_PUT = do_DELETE = dispatch

server = ThreadingHTTPServer(('127.0.0.1', 0), Server)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('/fixture/cert.pem', '/fixture/key.pem')
server.socket = context.wrap_socket(server.socket, server_side=True)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
endpoint = 'https://localhost:' + str(server.server_port)
config = Config(signature_version='s3v4', retries={'max_attempts': 0}, connect_timeout=2, read_timeout=2, s3={'addressing_style': 'path'})
try:
    session = boto3.Session()
    credentials = session.get_credentials().get_frozen_credentials()
    assert (credentials.access_key, credentials.secret_key, credentials.token) == (ACCESS, SECRET, TOKEN)
    client = session.client('s3', endpoint_url=endpoint, config=config)
    assert client.head_bucket(Bucket='fictional-bucket')['ResponseMetadata']['HTTPStatusCode'] == 200
    client.put_object(Bucket='fictional-bucket', Key='sdk-fixture.txt', Body=PAYLOAD)
    assert client.get_object(Bucket='fictional-bucket', Key='sdk-fixture.txt')['Body'].read() == PAYLOAD
    provider = S3CloudInterface('s3://fictional-bucket/practice', region='us-east-1', endpoint_url=endpoint, jobs=1, read_timeout=2, addressing_style='path')
    assert provider.test_connectivity() and provider.bucket_exists
    provider.upload_fileobj(io.BytesIO(PAYLOAD), 'barman-fixture.txt')
    assert provider.remote_open('barman-fixture.txt').read() == PAYLOAD
    assert set(provider.list_bucket()) == {'sdk-fixture.txt', 'barman-fixture.txt'}
    assert provider.remote_open('missing-fictional-file') is None
    with tempfile.TemporaryDirectory(prefix='fictional-sdk-') as directory:
        target = directory + '/restored.txt'
        provider.download_file('barman-fixture.txt', target, None)
        with open(target, 'rb') as file:
            assert file.read() == PAYLOAD
    bad = session.client('s3', endpoint_url=endpoint, config=config, aws_access_key_id=ACCESS, aws_secret_access_key='incorrect-fictional-key', aws_session_token=TOKEN)
    try:
        bad.head_bucket(Bucket='fictional-bucket')
    except ClientError as error:
        assert error.response['ResponseMetadata']['HTTPStatusCode'] == 403
    else:
        raise AssertionError('Wrong signing key was accepted')
    untrusted = session.client('s3', endpoint_url=endpoint, config=config, verify='/etc/ssl/certs/ca-certificates.crt')
    try:
        untrusted.head_bucket(Bucket='fictional-bucket')
    except SSLError:
        pass
    else:
        raise AssertionError('Untrusted TLS certificate was accepted')
    for name in list(objects):
        client.delete_object(Bucket='fictional-bucket', Key=name)
    assert not objects and not errors, errors
    assert 'rejected-credentials' in operations
    print(json.dumps({'passed': True, 'boto3': boto3.__version__, 'botocore': botocore.__version__,
                      's3transfer': s3transfer.__version__, 'urllib3': urllib3.__version__,
                      'loopbackOnly': True, 'nativeSigV4VerifiedIndependently': True,
                      'environmentCredentials': True, 'wrongKeyDenied': True, 'untrustedTlsDenied': True,
                      'nativeBarmanUploadListReadDownload': True, 'missingObjectHandled': True,
                      'syntheticDeletion': True, 'requests': len(operations),
                      'limitation': 'Tiny synthetic objects, not a real cloud backup, multipart transfer or restore of production data'}))
finally:
    server.shutdown()
    server.server_close()
