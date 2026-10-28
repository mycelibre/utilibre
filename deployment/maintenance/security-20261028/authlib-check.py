"""Offline regression plus TRIP's actual OAuth client against a mock provider."""
import json, secrets, sys, warnings
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse
import authlib, httpx2 as httpx
warnings.filterwarnings('ignore', category=DeprecationWarning)
from authlib.jose import JsonWebSignature
from authlib.jose.errors import JoseError
from authlib.oauth2.rfc6749.errors import MismatchingStateException
import trip.security as security

expected=sys.argv[1]; assert authlib.__version__ == expected
jws=JsonWebSignature(algorithms=['HS256']); key=secrets.token_bytes(32)
payload=b'Fictional signed fixture'
signed=jws.serialize_json({'protected': {'alg':'HS256'}}, payload, key)
assert jws.deserialize_json(signed,key)['payload']==payload
try: jws.deserialize_json(signed,secrets.token_bytes(32))
except JoseError: pass
else: raise AssertionError('Wrong signing key accepted')
unsigned={'payload':'ZmljdGlvbmFs','signatures':[]}
rejected=False
try: result=jws.deserialize_json(unsigned,None)
except JoseError: rejected=True
else: assert result['payload']==b'fictional'
assert rejected == (expected=='1.9.1'), 'Signature regression did not match declared baseline'
empty_key_results=[]
for algorithm in ['HS256','HS384','HS512']:
    engine=JsonWebSignature(algorithms=[algorithm]); blocked=False
    try:
        token=engine.serialize_compact({'alg':algorithm},payload,b'')
        assert engine.deserialize_compact(token,b'')['payload']==payload
    except (JoseError,ValueError): blocked=True
    assert blocked == (expected=='1.9.1'), 'Empty HMAC key behavior differs from declared input'
    empty_key_results.append(blocked)

# Exercise the application factory without reading live settings or credentials.
security.get_settings=lambda:SimpleNamespace(OIDC_CLIENT_ID='fixture',OIDC_CLIENT_SECRET='fictional-only',OIDC_REDIRECT_URI='https://client.invalid/callback')
client=security.get_oidc_client(); calls=[]
def provider(request):
    calls.append((request.method,request.url.host,request.url.path))
    assert request.url.host=='provider.invalid'
    if request.url.path=='/token':
        values=parse_qs(request.content.decode()); assert values['code']==['fictional-code']
        return httpx.Response(200,json={'access_token':'fictional-token','token_type':'Bearer','expires_in':300})
    assert request.url.path=='/userinfo' and request.headers['Authorization']=='Bearer fictional-token'
    return httpx.Response(200,json={'sub':'fictional-user'})
client._transport=httpx.MockTransport(provider)
url,state=client.create_authorization_url('https://provider.invalid/authorize')
assert parse_qs(urlparse(url).query)['scope']==['openid profile'] and state
callback='https://client.invalid/callback?code=fictional-code&state='+state
token=client.fetch_token('https://provider.invalid/token',authorization_response=callback,state=state)
assert token['access_token']=='fictional-token'
assert client.get('https://provider.invalid/userinfo').json()['sub']=='fictional-user'
try: client.fetch_token('https://provider.invalid/token',authorization_response=callback,state='wrong-state')
except MismatchingStateException: pass
else: raise AssertionError('Mismatched OAuth state accepted')
assert len(calls)==2
client.close()
print(json.dumps(dict(passed=True,version=expected,emptySignaturesRejected=rejected,emptyHmacKeysRejected=all(empty_key_results),validSignature=True,wrongKeyRejected=True,tripOAuthFactory=True,authorizationCode=True,bearerUserInfo=True,stateMismatchRejected=True,provider='synthetic httpx transport; no network or live identity provider')))
