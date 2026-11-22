"""Bounded native HTTP/TLS checks and current configuration syntax, offline.

Only Nginx configuration files are mounted read-only for syntax checks. User
content, production namespaces, credentials and public ports are not used.
Synthetic HTTP tests use a disposable network-none container and tmpfs.
"""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from datetime import datetime, timezone

os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
spec=importlib.util.spec_from_file_location('prepare_nginx',HERE/'prepare-nginx.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


def check(row):
    out=ROOT/'nginx'/row['key']; build=json.loads((out/'build.json').read_text())
    assert build['passed'] and build['base']==row['base']
    image=build['imageId']; assert m.docker('image','inspect','--format','{{.Id}}',row['candidate'])==image
    configs=[]
    for name in row['containers']:
        x=json.loads(m.docker('inspect',name))[0];assert x['Image']==row['base']
        mounts=[v for v in x['Mounts'] if v['Destination'].startswith('/etc/nginx/') or v['Destination']=='/etc/nginx']
        hosts=set(); hashes={}
        for v in mounts:
            assert not v['RW'], 'Review writable Nginx configuration before staging'
            p=Path(v['Source']); files=[p] if p.is_file() else list(p.rglob('*.conf'))
            for f in files:
                if not f.is_file():continue
                text=f.read_text();hashes[str(f)]=m.sha(f)
                hosts.update(re.findall(r'(?:https?://|\bserver\s+)([a-zA-Z][a-zA-Z0-9_.-]*)(?::\d+)?',text))
        # Satisfy static upstream name lookups with inert loopback entries.
        # nginx -t does not proxy requests. Real routing is checked after release.
        args=['docker','run','--rm',*m.LIMITS,'--user',x['Config']['User'] or '101',
              '--tmpfs','/tmp:rw,size=32m,mode=1777']
        if row['key']=='binternet-onion-gateway':
            # Supply an empty private socket directory, never the live socket.
            args+=['--tmpfs','/run/onion:rw,size=1m,mode=1777']
        for host in sorted(hosts):args+=['--add-host',host+':127.0.0.1']
        for v in mounts:args+=['-v',v['Source']+':'+v['Destination']+':ro']
        args+=['--entrypoint','nginx',image,'-t']
        p=subprocess.run(args,capture_output=True,timeout=45)
        (out/(name+'-config.log')).write_bytes(p.stdout+p.stderr)
        assert p.returncode==0, name+': private configuration diagnostic retained'
        assert all(m.sha(f)==h for f,h in hashes.items())
        configs.append({'name':name,'passed':True,'configurationSha256':hashes,'offlineNameResolution':True})
    fixture=out/'http-fixture';fixture.mkdir(exist_ok=True);fixture.chmod(0o755)
    text=('Fictional Utilibre fixture — español ñ.\n'*100).encode()
    (fixture/'example.txt').write_bytes(text);(fixture/'example.txt').chmod(0o644)
    cert=fixture/'certificate.pem';key=fixture/'key.pem'
    if not cert.exists():
        p=subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(cert),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],capture_output=True,timeout=30)
        assert p.returncode==0;key.chmod(0o644);cert.chmod(0o644)
    config=fixture/'nginx.conf'
    config.write_text('''load_module /usr/lib/nginx/modules/ngx_http_geoip_module.so;
load_module /usr/lib/nginx/modules/ngx_http_image_filter_module.so;
load_module /usr/lib/nginx/modules/ngx_http_js_module.so;
load_module /usr/lib/nginx/modules/ngx_http_xslt_filter_module.so;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;
events { worker_connections 32; }
http {
  access_log off;
  client_body_temp_path /tmp/body;
  proxy_temp_path /tmp/proxy;
  fastcgi_temp_path /tmp/fastcgi;
  uwsgi_temp_path /tmp/uwsgi;
  scgi_temp_path /tmp/scgi;
  gzip on; gzip_types text/plain; gzip_min_length 20;
  server {
    listen 127.0.0.1:18080;
    listen 127.0.0.1:18443 ssl;
    ssl_certificate /fixture/certificate.pem;
    ssl_certificate_key /fixture/key.pem;
    root /fixture;
    default_type text/plain;
    add_header X-Fixture native-check always;
    location = /private { return 403; }
  }
}
''');config.chmod(0o644)
    native=[]
    for label,im in [('before',row['base']),('after',image)]:
        name='utilibre-nginx-check-'+str(os.getpid())
        try:
            m.docker('run','-d','--name',name,*m.LIMITS,'--user','101:101','--tmpfs','/tmp:rw,size=32m,mode=1777','-v',str(fixture)+':/fixture:ro','--entrypoint','nginx',im,'-c','/fixture/nginx.conf','-g','daemon off;')
            curl=['docker','exec',name,'curl','--silent','--show-error','--max-time','10']
            for _ in range(30):
                p=subprocess.run(curl+['http://127.0.0.1:18080/example.txt'],capture_output=True,timeout=15)
                if p.returncode==0:break
                time.sleep(.1)
            assert p.returncode==0 and p.stdout==text
            for extra in ([],['--compressed'],['--range','0-19']):
                result=m.run(curl+extra+['http://127.0.0.1:18080/example.txt'])
                assert result==(text[:20] if '--range' in extra else text)
            tls=m.run(curl+['--cacert','/fixture/certificate.pem','https://localhost:18443/example.txt']);assert tls==text
            for path,status in [('/private','403'),('/absent','404')]:
                assert m.run(curl+['--output','/dev/null','--write-out','%{http_code}','http://127.0.0.1:18080'+path]).decode()==status
            headers=m.run(curl+['--head','http://127.0.0.1:18080/example.txt']).decode().lower()
            assert '200 ok' in headers and 'x-fixture: native-check' in headers
            native.append({'imageId':im,'passed':True,'checks':['utf8-static-body','gzip-roundtrip','range','head','tls-trust-and-body','intentional-denial','not-found','four-dynamic-modules']})
        finally:
            log=subprocess.run(['docker','logs',name],capture_output=True,timeout=15)
            (out/(label+'-synthetic-nginx.log')).write_bytes(log.stdout+log.stderr)
            subprocess.run(['docker','rm','-f','-v',name],capture_output=True,timeout=30)
    result={'passed':True,'date':datetime.now(timezone.utc).isoformat(),'base':row['base'],'imageId':image,
            'configurationChecks':configs,'native':native,'network':'none','productionContentUsed':False,
            'limitation':'Native transport and configuration checks; unchanged applications retain their separate workflow evidence.'}
    (out/'application.json').write_text(json.dumps(result,indent=2)+'\n')
    print(row['key']+': isolated HTTP/TLS, native modules and '+str(len(configs))+' configurations passed',flush=True)


if __name__=='__main__':
    assert sys.argv[1:]
    for key in sys.argv[1:]:
        try:check(next(x for x in m.INPUTS['rows'] if x['key']==key))
        except Exception:
            import traceback
            (ROOT/'nginx'/key/'application-error.log').write_text(traceback.format_exc())
            raise
