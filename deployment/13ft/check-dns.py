"""Disposable UDP DNS fixture for the loopback-only reader's egress test.
Run only inside its proxy namespace; no production DNS mutation.
"""
import json, socket, struct
from pathlib import Path
state=Path('/tmp/utilibre-dns-mode')
log=Path('/tmp/utilibre-dns-queries.jsonl')
sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);sock.bind(('127.0.0.1',53))
while True:
 data,client=sock.recvfrom(4096)
 try:
  i=12; labels=[]
  while data[i]:
   n=data[i];labels.append(data[i+1:i+1+n].decode());i+=1+n
  end=i+5; qtype=struct.unpack('!H',data[i+1:i+3])[0];name='.'.join(labels)
  mode=json.loads(state.read_text()); addresses=[]
  if name.endswith('.reader-fixture.test'):
   if mode['mode']=='public' and qtype==1: addresses=[mode['public']]
   if mode['mode']=='private' and qtype==1: addresses=['127.0.0.1']
   if mode['mode']=='mixed' and qtype==1: addresses=[mode['public'],'127.0.0.1']
   if mode['mode']=='private-v6' and qtype==28: addresses=['fd00::1']
   if mode['mode']=='private-v6' and qtype==1: addresses=[mode['public']]
  answers=b''
  for address in addresses:
   raw=socket.inet_pton(socket.AF_INET if qtype==1 else socket.AF_INET6,address)
   answers+=b'\xc0\x0c'+struct.pack('!HHIH',qtype,1,1,len(raw))+raw
  reply=data[:2]+struct.pack('!HHHHH',0x8180,1,len(addresses),0,0)+data[12:end]+answers
  sock.sendto(reply,client)
  with log.open('a') as out: out.write(json.dumps({'name':name,'qtype':qtype,'mode':mode['mode'],'answers':addresses})+'\n')
 except Exception:
  continue
