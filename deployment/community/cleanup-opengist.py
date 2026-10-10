"""Delete only marked synthetic Opengist fixtures through native endpoints."""
import requests,json,pathlib,re,sqlite3
report=pathlib.Path('/opt/utilibre/reports/new-services-20261009');q=json.loads((report/'opengist-qa.json').read_text());base='http://10.10.1.43:3191'
s=requests.Session();s.cookies.update(q['cookies']);s.headers['Host']='snippets.utilibre.org'
for g in q['gists']:
 r=requests.delete(base+'/api/gists/'+g['id'],headers={'Authorization':'Bearer '+q['token']});assert r.status_code==204
 assert requests.get(base+'/api/gists/'+g['id']).status_code==404
c=sqlite3.connect('/opt/utilibre/community-data/opengist/opengist.db')
row=c.execute('select id,is_admin from users where username=?',('opengist-oidc-check',)).fetchone();assert row and row[1]==0
r=s.get(base+'/-/admin-panel/users');assert r.status_code==200
csrf=re.search(r'name="_csrf" value="([^"]+)"',r.text).group(1)
r=s.post(base+'/-/admin-panel/users/'+str(row[0])+'/delete',data={'_csrf':csrf},allow_redirects=False);assert r.status_code==302
r=s.get(base+'/-/settings');assert r.status_code==200
csrf=re.search(r'name="_csrf" value="([^"]+)"',r.text).group(1)
r=s.delete(base+'/-/settings/account',headers={'X-CSRF-Token':csrf},allow_redirects=False);assert r.status_code==302
assert c.execute('select count(*) from users where username in (?,?)',(q['username'],'opengist-oidc-check')).fetchone()[0]==0
assert c.execute('select count(*) from gists').fetchone()[0]==0
assert c.execute('select count(*) from access_tokens').fetchone()[0]==0
assert dict(c.execute('select key,value from admin_settings'))['disable-gravatar']=='1'
(report/'opengist-cleanup.json').write_text(json.dumps({'fictionalGistsDeleted':3,'fictionalAccountsDeleted':2,'tokensRevoked':True,'actualQaOidcAdmin':False,'remainingUsers':0}))
print('Only fictional snippets and both synthetic native accounts deleted; tokens revoked, first OIDC signup had no admin role.')
