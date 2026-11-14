"""Small ordinary parser/consumer cases; no external DNS, URLs or emails."""
import importlib.metadata as m
import json,sys
packages=json.loads(sys.argv[1]);checks={}
if 'soupsieve' in packages:
 import soupsieve as sv
 from bs4 import BeautifulSoup
 assert m.version('soupsieve')==packages['soupsieve']
 soup=BeautifulSoup('<html><head><title>Fictional café</title></head><body><article><h1>Fixture</h1><p class="body">Useful text</p><a href="https://example.invalid/">Example</a></article><template><p>Hidden template</p></template></body></html>','html.parser')
 assert soup.select_one('article > h1').get_text()=='Fixture'
 assert [p.get_text() for p in soup.select('article p.body')]==['Useful text']
 assert soup.select_one('a[href]')['href']=='https://example.invalid/'
 assert soup.select_one('title').get_text()=='Fictional café'
 assert sv.match('article:has(p)',soup.article)
 assert [p.get_text() for p in soup.select('p')]==['Useful text']
 assert str(soup.template.select_one('p').string)=='Hidden template'
 try:sv.compile('p[')
 except sv.SelectorSyntaxError:pass
 else:raise AssertionError('Invalid selector accepted')
 checks['soupsieve']={'version':m.version('soupsieve'),'cases':8,'templateContentsIsolated':True}
if 'dnspython' in packages:
 import dns.message,dns.rdata,dns.name,dns.zone,dns.exception
 assert m.version('dnspython')==packages['dnspython']
 for typ,value in [('A','192.0.2.1'),('AAAA','2001:db8::1'),('MX','10 mail.example.invalid.'),('TXT','"Fictional café"'),('WKS','192.0.2.1 6 25 80 443')]:
  rr=dns.rdata.from_text('IN',typ,value);assert dns.rdata.from_wire('IN',typ,rr.to_wire(),0,len(rr.to_wire()))==rr
 msg=dns.message.make_query('example.invalid','A');assert dns.message.from_wire(msg.to_wire())==msg
 z=dns.zone.from_text('$ORIGIN example.invalid.\n$TTL 60\n@ SOA ns hostmaster 1 60 60 60 60\n@ NS ns\nns A 192.0.2.1\n',check_origin=True)
 assert 'ns' in z
 checks['dnspython']={'version':m.version('dnspython'),'cases':7,'network':'none'}
assert checks
print(json.dumps({'passed':True,'checks':checks}))
