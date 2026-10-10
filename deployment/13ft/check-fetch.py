"""Native fetch logic checks; mocks network only, no publishers or user records."""
import unittest
from unittest.mock import patch
import portable

class Response:
 status_code=200
 headers={'Content-Type':'text/html; charset=utf-8'}
 encoding='utf-8'
 def __init__(self,chunks=None):self.chunks=chunks or [b'<html><head><title>Fictional</title><meta http-equiv="refresh" content="1;url=https://navigation.invalid/"></head><body><p>Fictional marker</p><script>window.bad=true</script><iframe></iframe><form></form></body></html>']
 def __enter__(self):return self
 def __exit__(self,*a):pass
 def iter_content(self,amount):yield from self.chunks
class Session:
 response=Response()
 calls=[]
 def __enter__(self):return self
 def __exit__(self,*a):pass
 def get(self,url,**kwargs):
  assert self.trust_env is False
  assert self.proxies=={'http':portable.PUBLIC_PROXY,'https':portable.PUBLIC_PROXY}
  assert kwargs['allow_redirects'] is False and kwargs['stream'] is True and kwargs['timeout']==(3,3)
  self.calls.append(url);return self.response
class FetchTests(unittest.TestCase):
 def setUp(self):Session.response=Response();Session.calls=[]
 def test_reject_inputs_before_fetch(self):
  for url in ['file:///etc/passwd','http://localhost/','http://127.0.0.1/','http://[::1]/','http://user:pass@tools.utilibre.org/','https://tools.utilibre.org/#private','https://tools.utilibre.org:8443/','http://example.invalid/','http://tools.utilibre.org/\\bad','http://tools.utilibre.org/ space']:
   with self.subTest(url=url),patch.object(portable.requests,'Session',Session),self.assertRaises(portable.UserFacingError):portable.public_article(url)
  self.assertEqual(Session.calls,[])
 def test_native_processing_and_fixed_proxy(self):
  with patch.object(portable.requests,'Session',Session):value=portable.public_article('https://tools.utilibre.org/fictional?example=1')
  self.assertIn('Fictional marker',value)
  for forbidden in ['window.bad','<form','<iframe','http-equiv="refresh"']:self.assertNotIn(forbidden,value)
  self.assertEqual(Session.calls,['https://tools.utilibre.org/fictional?example=1'])
 def test_redirect_and_non_html_do_not_fallback(self):
  for status,content in [(301,'text/html'),(403,'text/html'),(200,'application/json')]:
   Session.response=Response();Session.response.status_code=status;Session.response.headers={'Content-Type':content}
   with patch.object(portable.requests,'Session',Session),self.assertRaises(portable.UserFacingError):portable.public_article('https://tools.utilibre.org/fictional')
  self.assertEqual(len(Session.calls),3)
 def test_decoded_body_bound(self):
  Session.response=Response([b'x'*8192]*129)
  with patch.object(portable.requests,'Session',Session),self.assertRaisesRegex(portable.UserFacingError,'1 MiB'):portable.public_article('https://tools.utilibre.org/fictional')
 def test_between_chunk_deadline(self):
  with patch.object(portable.requests,'Session',Session),patch.object(portable.time,'monotonic',side_effect=[0,9]),self.assertRaisesRegex(portable.UserFacingError,'time'):portable.public_article('https://tools.utilibre.org/fictional')
 def test_routes_block_unbounded_background_work(self):
  with portable.app.test_client() as client:
   for route in ['/status?url=https://tools.utilibre.org/fictional','/https://tools.utilibre.org/fictional','/article','/favicon.ico/extra']:
    self.assertEqual(client.get(route).status_code,404)
   self.assertEqual(client.post('/article',data={'link':'x'*4100}).status_code,413)
if __name__=='__main__':unittest.main()
