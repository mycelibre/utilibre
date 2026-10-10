"""Hold a fictional request body locally. No provider request is made."""
import socket,time,urllib.request,urllib.error,json
from pathlib import Path
base='http://127.0.0.1:3224'
time.sleep(2.2)
s=socket.create_connection(('127.0.0.1',3224),timeout=3)
s.sendall(b'POST /api/completions/route HTTP/1.1\r\nHost: trip.utilibre.org\r\nContent-Type: application/json\r\nContent-Length: 1024\r\nConnection: close\r\n\r\n{')
time.sleep(2.2)
try:urllib.request.urlopen(base+'/api/completions/search?q=fictional',timeout=3);raise AssertionError('Second completion was accepted')
except urllib.error.HTTPError as e:assert e.code==429,e.code
finally:s.close()
time.sleep(2.2)
try:urllib.request.urlopen(base+'/api/completions/search?q=fictional',timeout=3);raise AssertionError('Unauthenticated request was accepted')
except urllib.error.HTTPError as e:assert e.code==401,e.code
result={'heldIncompleteBody':True,'secondRequestAfterRateInterval':429,'afterClosingFirst':401,'upstreamRequests':0,'scope':'One aggregate completion connection; independent of the no-burst30/min limiter'}
Path('/opt/utilibre/reports/trip-20261009/provider-concurrency.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
