"""Bounded offline library checks; fictional identities, no HTTP requests."""
import sys, json, base64, inspect, hashlib
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlencode
import oauthlib
from oauthlib.common import Request
from oauthlib.oauth2 import (RequestValidator, BearerToken, ClientCredentialsGrant,
    ResourceOwnerPasswordCredentialsGrant, TokenEndpoint, RevocationEndpoint)
from oauthlib.oauth2.rfc8628.grant_types.device_code import DeviceCodeGrant
from oauthlib.oauth2.rfc6749.grant_types.authorization_code import AuthorizationCodeGrant
from oauthlib.oauth1 import Client as OAuth1Client
from requests_oauthlib import OAuth1
from requests import Request as HTTPRequest
assert oauthlib.__version__ == sys.argv[1]
# Static direct-consumer inventory supplements the native application test.
# It is not a proof about arbitrary dynamic imports in future releases.
consumers={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('/authentik').rglob('*.py') if b'oauthlib' in p.read_bytes().lower()}
assert consumers=={'/authentik/sources/oauth/clients/oauth1.py':'3f516367e497fa4e472630e3597da7ce7adcedad051b7d8045a04473ae1c7a5e'}
fixed = sys.argv[2] == 'fixed'
class Validator(RequestValidator):
    def __init__(self): self.saved=[]; self.device_checks=0; self.revoked=[]
    def authenticate_client(self, request, *args, **kw):
        raw=request.headers.get('Authorization','')
        if raw!='Basic '+base64.b64encode(b'low:fictional-secret').decode(): return False
        request.client=SimpleNamespace(client_id='low'); return True
    def client_authentication_required(self, request, *args, **kw): return True
    def authenticate_client_id(self, client_id, request, *args, **kw):
        request.client=SimpleNamespace(client_id=client_id); return client_id=='low'
    def validate_grant_type(self, client_id, grant_type, client, request, **kw):
        return client_id in ['low','high'] and grant_type in ['client_credentials','password','urn:ietf:params:oauth:grant-type:device_code']
    def validate_scopes(self, client_id, scopes, client, request, **kw):
        return set(scopes or []) <= ({'read','admin'} if client_id=='high' else {'read'})
    def get_default_scopes(self, client_id, request, *args, **kw): return ['read']
    def validate_user(self, username, password, client, request, **kw):
        request.user='fictional';return username=='fictional' and password=='test-password'
    def save_bearer_token(self, token, request, *args, **kw):
        self.saved.append((request.client.client_id,request.client_id,set(request.scopes or [])))
    def validate_device_code(self, client_id, code, request, *args, **kw):
        self.device_checks+=1;return False
    def revoke_token(self, token, token_type_hint, request, *args, **kw): self.revoked.append(token)
v=Validator();token=BearerToken(v,expires_in=60)
endpoint=TokenEndpoint(default_grant_type='client_credentials',default_token_type=token,
 grant_types={'client_credentials':ClientCredentialsGrant(v),'password':ResourceOwnerPasswordCredentialsGrant(v)})
headers={'Authorization':'Basic '+base64.b64encode(b'low:fictional-secret').decode()}
normal=0;rejected=[]
for grant in ['client_credentials','password']:
    args={'grant_type':grant,'client_id':'low','scope':'read'}
    if grant=='password': args.update(username='fictional',password='test-password')
    def call(a,h=headers):
        hh,b,s=endpoint.create_token_response('https://example.invalid/token',body=urlencode(a),headers=h)
        return hh,json.loads(b),s
    h,b,s=call(args);assert s==200 and b['scope']=='read' and h['Cache-Control']=='no-store';normal+=1
    h,b,s=call({**args,'scope':'admin'});assert s==400 and b['error']=='invalid_scope';normal+=1
    h,b,s=call(args,{});assert s==401 and b['error']=='invalid_client';normal+=1
    h,b,s=call({**args,'client_id':'high','scope':'admin'});rejected.append(s!=200)
    if fixed: assert s==400 and b['error']=='server_error', (s,b.get('error'))
    else: assert s==200 and v.saved[-1]==('low','high',{'admin'})
# OAuth 1.0 RFC 5849 section 3.4.1.1 example signature and requests integration.
c=OAuth1Client('9djdj82h48djs9d2',client_secret='j49sk3j29djd',resource_owner_key='kkk9d7dh3k39sjv7',resource_owner_secret='dh893hdasih9',nonce='7d8f3e4a',timestamp='137131201')
u,h,b=c.sign('http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b',http_method='POST',body='c2&a3=2+q',headers={'Content-Type':'application/x-www-form-urlencoded'})
# oauthlib includes oauth_version by default; pin the established library result.
assert 'oauth_signature="OB33pYjWAnf%2BxtOHN4Gmbdil168%3D"' in h['Authorization'];normal+=1
prepared=HTTPRequest('POST','https://example.invalid/callback',data={'value':'á & ñ'},auth=OAuth1('fictional-client','fictional-secret',resource_owner_key='fictional-token',resource_owner_secret='fictional-token-secret',verifier='fictional-verifier',callback_uri='https://example.invalid/return')).prepare()
assert b'oauth_signature=' in prepared.headers['Authorization'] and b'oauth_verifier=' in prepared.headers['Authorization'];normal+=1
# PKCE correctness; constant-time implementation is inspected, not timed.
g=AuthorizationCodeGrant(v)
assert g.validate_code_challenge('abc','plain','abc') and not g.validate_code_challenge('abc','plain','wrong');normal+=1
assert g.validate_code_challenge('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM','S256','dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');normal+=1
rev=RevocationEndpoint(v);h,b,s=rev.create_revocation_response('https://example.invalid/revoke',body='token=fictional',headers=headers)
assert s==200 and v.revoked[-1]=='fictional';normal+=1
jsonp_removed='enable_jsonp' not in inspect.signature(RevocationEndpoint).parameters
assert jsonp_removed==fixed
if not fixed:
    rev=RevocationEndpoint(v,enable_jsonp=True)
    h,b,s=rev.create_revocation_response('https://example.invalid/revoke?callback=fictional',body='token=fictional',headers=headers)
    assert b.startswith('fictional(')
# Deliberately retain an advisory discrepancy: 4.0.0 still does not validate
# the device code. This is a library test, not an Authentik endpoint exploit.
d=DeviceCodeGrant(v);r=Request('https://example.invalid/token',http_method='POST',body='grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code&client_id=low&device_code=bogus&scope=read',headers=headers)
h,b,s=d.create_token_response(r,token)
assert s==200 and v.device_checks==0
assert normal==11 and rejected==([True,True] if fixed else [False,False])
print(json.dumps({'passed':True,'version':oauthlib.__version__,'normalChecks':normal,'clientIdentityMismatchRejected':rejected,'jsonpRemoved':jsonp_removed,'deviceCodeValidated':False,'deviceCodeAdvisoryStillReproduces':True,'directConsumerFiles':consumers,'network':'none'}))
