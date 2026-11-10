"""Ordinary native TRIP account/task fixture; isolated storage and mock OIDC only."""
import json, os, secrets
from pathlib import Path
assert os.environ['UTILIBRE_SECURITY_DISPOSABLE'] == 'yes'
assert os.environ['SQLITE_FILE'] == '/app/storage/trip.sqlite'
assert not Path(os.environ['SQLITE_FILE']).exists()
from fastapi.testclient import TestClient
from sqlmodel import Session
from trip.main import app
from trip.db.core import get_engine, init_user_data
from trip.models.models import User
from trip.security import hash_password
password=secrets.token_urlsafe(24)
with TestClient(app) as client:
    assert client.get('/api/info').status_code == 200
    assert client.get('/api/trips').status_code in (401,403)
    with Session(get_engine()) as session:
        for username in ['fictional-one','fictional-two']:
            session.add(User(username=username,password=hash_password(password)))
            session.commit()
            init_user_data(session,username)
    tokens=[]
    for username in ['fictional-one','fictional-two']:
        result=client.post('/api/auth/login',json={'username':username,'password':password})
        assert result.status_code == 200
        tokens.append({'Authorization':'Bearer '+result.json()['access_token']})
    r=client.post('/api/trips',headers=tokens[0],json={'name':'Fictional museum visit','currency':'GTQ'})
    assert r.status_code == 200, r.status_code
    url='/api/trips/'+str(r.json()['id'])
    assert client.get(url,headers=tokens[0]).json()['name'] == 'Fictional museum visit'
    assert client.get(url,headers=tokens[1]).status_code in (403,404)
    assert client.put(url,headers=tokens[0],json={'name':'Fictional workshop visit'}).status_code == 200
    assert client.get(url,headers=tokens[0]).json()['name'] == 'Fictional workshop visit'
    assert client.delete(url,headers=tokens[0]).status_code == 200
    assert client.get(url,headers=tokens[0]).status_code == 404

# Reuse the existing app-factory compatibility journey, without its unrelated
# historical vulnerability reproductions. The transport cannot leave this process.
from types import SimpleNamespace
from urllib.parse import parse_qs
import httpx2 as httpx
import trip.security as security
security.get_settings=lambda:SimpleNamespace(OIDC_CLIENT_ID='fixture',OIDC_CLIENT_SECRET='fictional-only',OIDC_REDIRECT_URI='https://client.invalid/callback')
oauth=security.get_oidc_client();calls=[]
def provider(request):
    calls.append(request.url.path)
    assert request.url.host == 'provider.invalid'
    if request.url.path == '/token':
        assert parse_qs(request.content.decode())['code'] == ['fictional-code']
        return httpx.Response(200,json={'access_token':'fictional-token','token_type':'Bearer','expires_in':300})
    assert request.url.path == '/userinfo'
    assert request.headers['Authorization'] == 'Bearer fictional-token'
    return httpx.Response(200,json={'sub':'fictional-user'})
oauth._transport=httpx.MockTransport(provider)
_,state=oauth.create_authorization_url('https://provider.invalid/authorize')
result=oauth.fetch_token('https://provider.invalid/token',authorization_response='https://client.invalid/callback?code=fictional-code&state='+state,state=state)
assert result['access_token'] == 'fictional-token'
assert oauth.get('https://provider.invalid/userinfo').json()['sub'] == 'fictional-user'
assert calls == ['/token','/userinfo'];oauth.close()
print(json.dumps({'passed':True,'nativeAccountIsolation':True,'tripCreateEditReadDelete':True,'nativeOidcFactory':True,'externalProvider':'mock transport only','network':'none','productionDataUsed':False}))
