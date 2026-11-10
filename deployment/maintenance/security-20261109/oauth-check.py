"""Ordinary offline OAuth compatibility checks; no attack or invalid-device replay."""
import base64
import hashlib
import inspect
import json
import sys
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlencode
import oauthlib
from oauthlib.common import Request
from oauthlib.oauth1 import Client
from oauthlib.oauth2 import RequestValidator, BearerToken, ClientCredentialsGrant, ResourceOwnerPasswordCredentialsGrant, TokenEndpoint, RevocationEndpoint
from oauthlib.oauth2.rfc6749.grant_types.authorization_code import AuthorizationCodeGrant
from oauthlib.oauth2.rfc8628.grant_types.device_code import DeviceCodeGrant
from requests import Request as HTTPRequest
from requests_oauthlib import OAuth1

assert oauthlib.__version__ == sys.argv[1]
assert sys.argv[1] in ['4.0.0', '4.0.1']
fixed = sys.argv[2] == 'fixed'
assert fixed == (sys.argv[1] == '4.0.1')
checks = 0
class Validator(RequestValidator):
    def __init__(self):
        self.device_calls = 0
        self.saved = []
        self.revoked = []
    def authenticate_client(self, request, *args, **kwargs):
        request.client = SimpleNamespace(client_id='fictional')
        return request.headers.get('Authorization') == 'Basic ' + base64.b64encode(b'fictional:local-secret').decode()
    def client_authentication_required(self, request, *args, **kwargs): return True
    def validate_grant_type(self, client_id, grant_type, client, request, **kwargs):
        return client_id == 'fictional' and grant_type in ['client_credentials', 'password', 'urn:ietf:params:oauth:grant-type:device_code']
    def validate_scopes(self, client_id, scopes, client, request, **kwargs): return set(scopes or []) <= {'read'}
    def get_default_scopes(self, client_id, request, *args, **kwargs): return ['read']
    def validate_user(self, username, password, client, request, **kwargs):
        request.user = 'fictional-user'
        return username == 'fictional-user' and password == 'local-password'
    def save_bearer_token(self, token, request, *args, **kwargs): self.saved.append(token)
    def revoke_token(self, token, token_type_hint, request, *args, **kwargs): self.revoked.append(token)
    def validate_device_code(self, client_id, code, request, *args, **kwargs):
        assert client_id == 'fictional' and code == 'approved-fictional-device'
        self.device_calls += 1
        request.user = 'fictional-user'
        request.scopes = ['read']
        return 'authorized'

validator = Validator()
token = BearerToken(validator, expires_in=60)
endpoint = TokenEndpoint(default_grant_type='client_credentials', default_token_type=token,
    grant_types={'client_credentials': ClientCredentialsGrant(validator), 'password': ResourceOwnerPasswordCredentialsGrant(validator)})
headers = {'Authorization': 'Basic ' + base64.b64encode(b'fictional:local-secret').decode()}
for grant in ['client_credentials', 'password']:
    values = {'grant_type': grant, 'client_id': 'fictional', 'scope': 'read'}
    if grant == 'password': values.update(username='fictional-user', password='local-password')
    h, body, status = endpoint.create_token_response('https://example.invalid/token', body=urlencode(values), headers=headers)
    result = json.loads(body)
    assert status == 200 and result['scope'] == 'read' and result['expires_in'] == 60
    assert h['Cache-Control'] == 'no-store' and result['access_token'] == validator.saved[-1]['access_token']
    checks += 2

client = Client('9djdj82h48djs9d2', client_secret='j49sk3j29djd', resource_owner_key='kkk9d7dh3k39sjv7', resource_owner_secret='dh893hdasih9', nonce='7d8f3e4a', timestamp='137131201')
_, signed, _ = client.sign('http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b', http_method='POST', body='c2&a3=2+q', headers={'Content-Type':'application/x-www-form-urlencoded'})
assert 'oauth_signature="OB33pYjWAnf%2BxtOHN4Gmbdil168%3D"' in signed['Authorization']; checks += 1
prepared = HTTPRequest('POST', 'https://example.invalid/callback', data={'value': 'á & ñ'}, auth=OAuth1('fictional-client', 'local-secret', verifier='fictional-verifier', callback_uri='https://example.invalid/return')).prepare()
assert b'oauth_signature=' in prepared.headers['Authorization'] and b'oauth_verifier=' in prepared.headers['Authorization']; checks += 1
assert 'local-secret' not in prepared.url; checks += 1
grant = AuthorizationCodeGrant(validator)
assert grant.validate_code_challenge('abc', 'plain', 'abc'); checks += 1
assert grant.validate_code_challenge('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', 'S256', 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'); checks += 1
_, _, status = RevocationEndpoint(validator).create_revocation_response('https://example.invalid/revoke', body='token=fictional-token', headers=headers)
assert status == 200 and validator.revoked == ['fictional-token']; checks += 1
assert 'enable_jsonp' not in inspect.signature(RevocationEndpoint).parameters; checks += 1

# Only an already-authorized synthetic device. No missing/bogus code is sent.
device = DeviceCodeGrant(validator)
request = Request('https://example.invalid/token', http_method='POST', body=urlencode({'grant_type':'urn:ietf:params:oauth:grant-type:device_code','client_id':'fictional','device_code':'approved-fictional-device','scope':'read'}), headers=headers)
_, body, status = device.create_token_response(request, token)
assert status == 200 and json.loads(body)['scope'] == 'read'; checks += 1
if fixed: assert validator.device_calls == 1
source = Path(inspect.getfile(DeviceCodeGrant)).read_bytes()
source_hash = hashlib.sha256(source).hexdigest()
if fixed: assert source_hash == 'e75d01898546168125cff9cdde9cb870ba59d781d53ae40530eb6c0e570cebf4'
assert checks == 12
print(json.dumps({'passed':True,'version':oauthlib.__version__,'normalChecks':checks,'authorizedDeviceValidated':validator.device_calls == 1,'deviceSourceSha256':source_hash,'jsonpRemoved':True,'network':'none','invalidDeviceReproduction':False}))
