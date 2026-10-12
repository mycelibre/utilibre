#!/usr/bin/env python3
"""Actual host(1), synthetic loopback DNS only, no remote resolver."""
import hashlib, json, os, pathlib, socket, struct, subprocess, sys, threading
ROOT=pathlib.Path('/var/lib/utilibre-maintenance/closure-followup-20261012')
os.umask(0o077)
assert sys.argv[1:] in ([],['--installed'])
installed=bool(sys.argv[1:]); prefix=pathlib.Path('/') if installed else ROOT/'bind-candidate'
lib=prefix/'usr/lib/x86_64-linux-gnu';binary=prefix/'usr/bin/host'
env={**os.environ,'LD_LIBRARY_PATH':str(lib)}
def run(args):return subprocess.run(args,env=env,check=True,capture_output=True,text=True,timeout=15).stdout
assert '9.20.29' in run([str(binary),'-V'])
linked=run(['ldd','-r',str(binary)])
assert 'liblmdb' not in linked and 'not found' not in linked and 'undefined symbol' not in linked
files=list(lib.glob('lib*-9.20.29-1~deb13u1+utilibre1-Debian.so'));assert len(files)==5
for file in files:
    assert 'liblmdb' not in run(['readelf','-d',str(file)])
    assert 'mdb_env_open' not in run(['readelf','-Ws',str(file)])
rows=[]
for tcp,qtype,rcode in [(False,1,0),(False,28,0),(True,1,0),(False,1,3)]:
    server=socket.socket(socket.AF_INET,socket.SOCK_STREAM if tcp else socket.SOCK_DGRAM)
    server.bind(('127.0.0.1',0));server.settimeout(10)
    if tcp:server.listen(1)
    port=server.getsockname()[1];errors=[]
    def exact(conn,n):
        b=b''
        while len(b)<n:
            chunk=conn.recv(n-len(b));assert chunk;b+=chunk
        return b
    def reply():
        conn=None
        try:
            if tcp:
                conn,_=server.accept();conn.settimeout(10);packet=exact(conn,struct.unpack('!H',exact(conn,2))[0])
            else:packet,address=server.recvfrom(2048)
            assert packet[4:6]==b'\x00\x01'
            end=12
            while packet[end]:end+=packet[end]+1
            end+=5
            assert struct.unpack('!H',packet[end-4:end-2])[0]==qtype
            rdata=bytes([192,0,2,10]) if qtype==1 else socket.inet_pton(socket.AF_INET6,'2001:db8::10')
            result=packet[:2]+struct.pack('!HHHHH',0x8180|rcode,1,0 if rcode else 1,0,0)+packet[12:end]
            if not rcode:result+=b'\xc0\x0c'+struct.pack('!HHIH',qtype,1,60,len(rdata))+rdata
            if tcp:conn.sendall(struct.pack('!H',len(result))+result)
            else:server.sendto(result,address)
        except Exception as error:errors.append(str(error))
        finally:
            if conn:conn.close()
    thread=threading.Thread(target=reply);thread.start()
    result=subprocess.run([str(binary),*(['-T'] if tcp else []),'-t','A' if qtype==1 else 'AAAA','-p',str(port),'fictional.invalid','127.0.0.1'],env=env,text=True,capture_output=True,timeout=15)
    thread.join(12);server.close();assert not thread.is_alive() and not errors
    expected='NXDOMAIN' if rcode else '192.0.2.10' if qtype==1 else '2001:db8::10'
    assert expected in result.stdout+result.stderr,(result.returncode,result.stdout,result.stderr)
    assert result.returncode==(1 if rcode else 0)
    rows.append({'transport':'TCP' if tcp else 'UDP','type':qtype,'expected':expected,'passed':True})
report={'date':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'status':'passed','installed':installed,'checks':rows,'noLmdbDependencyOrEnvironmentOpenSymbol':True,'libraryHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files},'limitations':['DNS client tested; no DNS server is installed or advertised.']}
(ROOT/('bind-live.json' if installed else 'bind-native.json')).write_text(json.dumps(report,indent=2)+'\n')
print('BIND client: UDP A/AAAA/NXDOMAIN and TCP A passed; no LMDB dependency.')
