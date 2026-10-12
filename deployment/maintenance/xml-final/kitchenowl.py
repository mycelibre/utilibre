"""Fresh, network-isolated native model/API fixtures, never production data."""
import os, secrets
assert os.environ.get('UTILIBRE_SECURITY_DISPOSABLE') == 'yes'
from app import app, db
from app.models import User
from lxml import etree
app.config['TESTING'] = True
with app.app_context():
    db.create_all()
    password = secrets.token_urlsafe(24)
    User.create(username='fictionala', name='Fictional A', password=password)
    User.create(username='fictionalb', name='Fictional B', password=password)
    client=app.test_client()
    def login(user):
        response=client.post('/api/auth',json={'username':user,'password':password})
        assert response.status_code==200, response.status_code
        return {'Authorization':'Bearer '+response.json['access_token']}
    a,b=login('fictionala'),login('fictionalb')
    def api(path,method='GET',body=None,headers=a):
        response=client.open('/api'+path,method=method,json=body,headers=headers)
        assert response.status_code==200,(path,response.status_code)
        return response.json
    first=api('/household','POST',{'name':'Fictional XML test A'})
    second=api('/household','POST',{'name':'Fictional XML test B'})
    content={'items':[{'name':'Fictional apples','category':'Fictional pantry'}],
      'recipes':[{'name':'Fictional apple bowl','description':'Cut fictional apples and serve.','yields':2,
      'items':[{'name':'Fictional apples','description':'2 pieces'}],'tags':['Fictional']}],
      'shoppinglists':['Fictional groceries']}
    api(f"/household/{first['id']}/import",'POST',content)
    exported=api(f"/household/{first['id']}/export")
    assert any(row['name']=='Fictional apple bowl' for row in exported['recipes'])
    api(f"/household/{second['id']}/import",'POST',exported)
    restored=api(f"/household/{second['id']}/export")
    assert any(row['name']=='Fictional apples' for row in restored['items'])
    assert client.get(f"/api/household/{first['id']}/export").status_code==401
    assert client.get(f"/api/household/{first['id']}/export",headers=b).status_code in (403,404)
    xml=etree.fromstring(b'<recipe><name>Fictional apples</name></recipe>',etree.XMLParser(no_network=True))
    assert xml.xpath('string(name)')=='Fictional apples'
    assert etree.HTML('<html><body><p>Fictional</p></body></html>').xpath('string(//p)')=='Fictional'
    for row in [first,second]: api(f"/household/{row['id']}",'DELETE')
print('KITCHENOWL_NATIVE_PASSED')
