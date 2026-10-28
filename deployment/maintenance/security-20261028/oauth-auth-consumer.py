"""App's real OAuth1 factory, fake transport, fictional data in fresh DB clone."""
from types import SimpleNamespace
from unittest.mock import Mock
from django.test import RequestFactory
from requests import Request as HTTPRequest
from requests.models import Response
from authentik.sources.oauth.clients.oauth1 import OAuthClient
req=RequestFactory().get('/callback?oauth_verifier=fictional-verifier',secure=True);req.session={}
source=SimpleNamespace(name='fictional',slug='fictional',consumer_key='fictional-consumer',consumer_secret='fictional-secret',source_type=SimpleNamespace(request_token_url='https://example.invalid/request',access_token_url='https://example.invalid/access',urls_customizable=False))
c=OAuthClient(source,req,callback='/callback');prepared=[]
def local_request(method,url,**kwargs):
    r=HTTPRequest(method,url,**kwargs).prepare();prepared.append(r)
    response=Response();response.status_code=200;response._content=b'oauth_token=fictional-token&oauth_token_secret=fictional-token-secret';return response
c.session.request=local_request
raw=c.get_request_token();assert c.parse_raw_token(raw)['oauth_token']=='fictional-token'
assert b'oauth_callback=' in prepared[-1].headers['Authorization']
args=c.get_redirect_args();assert args['oauth_token']=='fictional-token' and req.session[c.session_key]==raw
result=c.get_access_token();assert result['oauth_token_secret']=='fictional-token-secret'
assert b'oauth_verifier=' in prepared[-1].headers['Authorization'] and b'oauth_token=' in prepared[-1].headers['Authorization']
for r in prepared: assert b'oauth_signature=' in r.headers['Authorization'] and 'fictional-secret' not in r.url
req.session={};assert c.get_access_token() is None
print('UTILIBRE_OAUTH1_CONSUMER_PASSED: request token, callback, session, signed access-token exchange, missing-session rejection; intercepted transport only.')
