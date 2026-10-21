"""Synthetic HTTPS only, inside a network-disabled disposable container."""
import http.server, ssl, threading, urllib.request, urllib.error, json
import certifi
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.end_headers(); self.wfile.write(b'fictional TLS fixture')
    def log_message(self,*args): pass
server=http.server.HTTPServer(('127.0.0.1',0),Handler)
ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain('/fixture/cert.pem','/fixture/key.pem')
server.socket=ctx.wrap_socket(server.socket,server_side=True)
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
url='https://localhost:'+str(server.server_port)+'/'
try:
    good=ssl.create_default_context(cafile='/fixture/cert.pem')
    with urllib.request.urlopen(url,context=good,timeout=3) as r: assert r.read()==b'fictional TLS fixture'
    try: urllib.request.urlopen(url,context=ssl.create_default_context(cafile=certifi.where()),timeout=3)
    except urllib.error.URLError as e: assert isinstance(e.reason,ssl.SSLCertVerificationError)
    else: raise AssertionError('Untrusted TLS accepted')
    print(json.dumps({'trustedTLS':True,'untrustedTLSRejected':True,'externalRequests':0}))
finally: server.shutdown();server.server_close()
