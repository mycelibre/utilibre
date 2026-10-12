"""Small direct security regressions for the signed Debian framework backports."""
from io import BytesIO
from flask import Flask, session
from werkzeug.wrappers import Request, Response
from werkzeug.test import EnvironBuilder, Client
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.debug import DebuggedApplication
from werkzeug.http import parse_cookie
import json

app=Flask('fictional-local-check');app.secret_key='synthetic-fixture-only'
@app.route('/')
def index():
    session.get('fictional')
    return 'fictional'
@app.route('/set')
def put():
    session['fictional']='sample'
    return 'fictional'
@app.route('/clear')
def clear():
    session.clear()
    return 'fictional'
client=app.test_client()
for route in ['/', '/set', '/clear']:
    assert 'Cookie' in client.get(route).vary
assert parse_cookie('=__Host-fictional=bad; good=value').get('__Host-fictional') is None
assert parse_cookie('=__Host-fictional=bad; good=value')['good']=='value'
env=EnvironBuilder(method='POST',data={'a':'1','b':'2','c':'3'},content_type='multipart/form-data').get_environ()
request=Request(env);request.max_form_parts=2
try:
    request.form
except RequestEntityTooLarge:
    pass
else:
    raise AssertionError('Multipart limit was not enforced')
debugger=DebuggedApplication(Response('fictional'),evalex=True,pin_security=False)
client=Client(debugger,Response)
assert client.get('/',base_url='http://localhost').status_code==200
assert client.get('/console',base_url='http://unrelated.example.invalid').status_code==400
print(json.dumps({'passed':True,'checks':['session Vary on empty/read/write/delete','cookie leading equals not stripped','multipart part limit','debugger untrusted host rejection']}))
