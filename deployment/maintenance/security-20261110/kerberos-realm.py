"""Ordinary isolated realm and GSS exchange using the built upstream programs."""
import json,os,secrets,socket,subprocess,tempfile,time
from pathlib import Path
build=Path('/work/krb5-1.22.3/build')
def freeport():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
with tempfile.TemporaryDirectory(prefix='kerberos-fixture-') as tmp:
 p=Path(tmp);port=freeport();gssport=freeport()
 env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','LD_LIBRARY_PATH':str(build/'lib'),'KRB5_CONFIG':str(p/'krb5.conf'),'KRB5_KDC_PROFILE':str(p/'kdc.conf'),'KRB5_KTNAME':str(p/'host.keytab'),'KRB5CCNAME':'FILE:'+str(p/'ccache')}
 (p/'krb5.conf').write_text(f'''[libdefaults]
 default_realm = UTILIBRE.TEST
 dns_lookup_realm = false
 dns_lookup_kdc = false
 rdns = false
 dns_canonicalize_hostname = false
[realms]
 UTILIBRE.TEST = {{
  kdc = 127.0.0.1:{port}
 }}
[dbmodules]
 db_module_dir = {build}/plugins/kdb/db2
''')
 (p/'kdc.conf').write_text(f'''[kdcdefaults]
 kdc_ports = {port}
 kdc_tcp_ports = {port}
[realms]
 UTILIBRE.TEST = {{
  database_name = {p}/principal
  key_stash_file = {p}/stash
  max_life = 1h
 }}
''')
 def run(path,*args):
  r=subprocess.run([str(build/path),*map(str,args)],env=env,capture_output=True,text=True,timeout=20)
  if r.returncode:raise RuntimeError(path+': '+r.stderr[:1200])
  return r.stdout
 run(Path('kadmin/dbutil/kdb5_util'),'create','-s','-r','UTILIBRE.TEST','-P',secrets.token_hex(24))
 for principal,keytab in [('host/localhost','host.keytab'),('fictional','client.keytab')]:
  run(Path('kadmin/cli/kadmin.local'),'-r','UTILIBRE.TEST','-q','addprinc -randkey '+principal)
  run(Path('kadmin/cli/kadmin.local'),'-r','UTILIBRE.TEST','-q','ktadd -k '+str(p/keytab)+' '+principal)
 log=open(p/'native.log','wb');processes=[]
 try:
  kdc=subprocess.Popen([str(build/'kdc/krb5kdc'),'-n','-r','UTILIBRE.TEST'],env=env,stdout=log,stderr=log);processes.append(kdc)
  time.sleep(.4);assert kdc.poll() is None
  run(Path('clients/kinit/kinit'),'-k','-t',p/'client.keytab','fictional@UTILIBRE.TEST')
  tickets=run(Path('clients/klist/klist'));assert 'krbtgt/UTILIBRE.TEST@UTILIBRE.TEST' in tickets
  run(Path('clients/kvno/kvno'),'host/localhost@UTILIBRE.TEST')
  for option in [[],['-spnego']]:
   server=subprocess.Popen([str(build/'appl/gss-sample/gss-server'),'-port',str(gssport),'-once','host@localhost'],env=env,stdout=log,stderr=log);processes.append(server);time.sleep(.2);assert server.poll() is None
   response=run(Path('appl/gss-sample/gss-client'),'-port',gssport,*option,'127.0.0.1','host@localhost','Fictional authenticated message')
   assert 'Signature verified' in response,response
   assert server.wait(timeout=10)==0
  run(Path('clients/kdestroy/kdestroy'));assert not (p/'ccache').exists()
  print(json.dumps({'passed':True,'upstream':'1.22.3','ticketAcquired':True,'serviceTicketAcquired':True,'authenticatedGssExchange':True,'spnegoExchange':True,'ticketDestroyed':True,'network':'isolated loopback namespace','vulnerabilityReproduction':False}))
 finally:
  for proc in processes:
   if proc.poll() is None:proc.terminate();proc.wait(timeout=10)
  log.close()
