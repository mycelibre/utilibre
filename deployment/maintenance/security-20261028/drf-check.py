"""Bounded DRF regressions in network-none containers; fresh in-memory SQLite only."""
import bz2
import io
import json
import sys
from importlib.metadata import version
from unittest.mock import patch

import django
from django.conf import settings

expected, mode = sys.argv[1:]
assert mode in ('baseline', 'fixed')
assert version('djangorestframework') == expected
settings.configure(
    SECRET_KEY='fictional-isolated-test-only', DEBUG=False,
    ROOT_URLCONF=__name__, ALLOWED_HOSTS=['testserver'],
    INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes',
                    'rest_framework', 'rest_framework.authtoken'],
    DATABASES={'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}},
    DEFAULT_AUTO_FIELD='django.db.models.AutoField', USE_TZ=True,
    DATA_UPLOAD_MAX_MEMORY_SIZE=1024,
)
django.setup()
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import path
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token, TokenProxy
from rest_framework.exceptions import ParseError, NotAcceptable
from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework.utils import mediatypes
from rest_framework.views import APIView
from rest_framework import serializers

class Protected(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'user': request.user.username})

urlpatterns = [path('private/', Protected.as_view())]
factory = APIRequestFactory()
normal = 0

# A 64 KiB result is enough to establish the bug without a memory-exhaustion test.
expanded = b'{"fictional":"' + b'x' * 65536 + b'"}'
compressed = bz2.compress(expanded)
assert len(compressed) < 1024 < len(expanded)
req = Request(factory.post('/', compressed, content_type='application/json; charset=bz2_codec'))
req.parsers = [JSONParser()]
codec_rejected = False
try:
    assert len(req.data['fictional']) == 65536
except ParseError:
    codec_rejected = True
assert codec_rejected == (mode == 'fixed')

for charset in ['utf-8', 'utf-16', 'utf-32', 'latin-1']:
    value = {'fictional': 'café'}
    assert JSONParser().parse(io.BytesIO(json.dumps(value, ensure_ascii=False).encode(charset)),
                             parser_context={'encoding': charset}) == value
    normal += 1
assert FormParser().parse(io.BytesIO(b'name=caf%E9'), parser_context={'encoding': 'latin-1'})['name'] == 'café'
normal += 1
request = factory.post('/', {'name': 'fictional'})
assert MultiPartParser().parse(io.BytesIO(request.body), request.META['CONTENT_TYPE'],
                              {'request': request, 'encoding': 'utf-8'}).data['name'] == 'fictional'
normal += 1
if mode == 'fixed':
    for charset in ['bz2', 'bz2_codec', 'zlib', 'zip', 'base64', 'hex', 'rot13', 'undefined', 'not-a-codec']:
        for parser, context in [(JSONParser(), {}), (FormParser(), {}), (MultiPartParser(), {'request': request})]:
            try:
                parser.parse(io.BytesIO(b'{}'), request.META['CONTENT_TYPE'], dict(context, encoding=charset))
                raise AssertionError('Non-text codec accepted')
            except ParseError:
                pass

# Count parser calls and bounded tokens instead of conducting a CPU-exhaustion test.
negotiator = DefaultContentNegotiation()
tokens = ['text/x%d' % i for i in range(65)]
bounded = len(negotiator.get_accept_list(Request(factory.get('/', HTTP_ACCEPT=','.join(tokens))))) == 64
assert bounded == (mode == 'fixed')
token = 'application/json; indent=4'
req = Request(factory.get('/', HTTP_ACCEPT=token))
with patch.object(mediatypes, 'parse_header_parameters', wraps=mediatypes.parse_header_parameters) as parse:
    for _ in range(2):
        renderer, media = negotiator.select_renderer(req, [JSONRenderer()])
        assert media == token
    parse_count = sum(c.args == (token,) for c in parse.call_args_list)
assert (parse_count == 1) == (mode == 'fixed')
for accept in ['application/json', '*/*', 'application/*', 'text/plain, application/json']:
    renderer, media = negotiator.select_renderer(Request(factory.get('/', HTTP_ACCEPT=accept)), [JSONRenderer()])
    assert isinstance(renderer, JSONRenderer)
    normal += 1
try:
    negotiator.select_renderer(Request(factory.get('/', HTTP_ACCEPT='text/plain')), [JSONRenderer()])
    raise AssertionError('Unsupported media accepted')
except NotAcceptable:
    normal += 1
if mode == 'fixed':
    long_type = 'text/plain; pad="' + ';' * 300 + '"'
    assert negotiator.get_accept_list(Request(factory.get('/', HTTP_ACCEPT=long_type+',application/json'))) == ['application/json']
    assert negotiator.select_parser(Request(factory.post('/', b'', content_type='application/json; pad='+'x'*256)), [JSONParser()]) is None
    too_many = ','.join('text/x%d' % n for n in range(64)) + ',application/json'
    try:
        negotiator.select_renderer(Request(factory.get('/', HTTP_ACCEPT=too_many)), [JSONRenderer()])
        raise AssertionError('Token budget exceeded')
    except NotAcceptable:
        pass
assert mediatypes.order_by_precedence(['*/*', 'application/json']) == [{'application/json'}, {'*/*'}]
normal += 1

class Item(serializers.Serializer):
    name = serializers.CharField()

serializer = Item(data=[{}], many=True)
assert not serializer.is_valid() and isinstance(serializer.errors, list)
normal += 1

call_command('migrate', verbosity=0, interactive=False)
User = get_user_model()
alice = User.objects.create_user(username='fictional-a')
bob = User.objects.create_user(username='fictional-b')
a = Token.objects.create(user=alice)
b = Token.objects.create(user=bob)
client = APIClient()
assert client.get('/private/').status_code == 401
client.credentials(HTTP_AUTHORIZATION='Token '+a.key)
assert client.get('/private/').json() == {'user': 'fictional-a'}
proxy = TokenProxy.objects.get(user=alice)
proxy.delete()
revoked = not Token.objects.filter(key=a.key).exists()
assert revoked == (mode == 'fixed')
assert client.get('/private/').status_code == (401 if revoked else 200)
assert Token.objects.filter(key=b.key).exists()
normal += 4
if not revoked:
    Token.objects.get(key=a.key).delete()
    assert client.get('/private/').status_code == 401
else:
    assert proxy.key is None
    try:
        proxy.delete()
        raise AssertionError('Second deletion accepted')
    except ValueError:
        pass
    new = Token.objects.create(user=alice)
    deleted, _ = TokenProxy.objects.filter(user__username='fictional-a').delete()
    assert deleted == 1 and not Token.objects.filter(key=new.key).exists()
    assert Token.objects.filter(key=b.key).exists()
client.credentials(HTTP_AUTHORIZATION='Token '+b.key)
assert client.get('/private/').json() == {'user': 'fictional-b'}
normal += 1

print(json.dumps({'passed': True, 'version': expected, 'mode': mode,
                  'codecRejected': codec_rejected, 'acceptBounded': bounded,
                  'acceptParseCount': parse_count, 'tokenRevoked': revoked,
                  'normalChecks': normal, 'precedenceApiPreserved': True,
                  'listSerializerApiPreserved': True, 'syntheticDatabaseOnly': True}))
