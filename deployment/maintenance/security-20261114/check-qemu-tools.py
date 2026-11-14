"""Native synthetic disk roundtrip and QMP capabilities, isolated from all VM disks."""
import os,json,subprocess,tempfile,socket,time,hashlib,sys
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
r=Path('/var/lib/utilibre-maintenance/security-20261114/qemu/native')
if sys.argv[1:2]!=['--inner']:
 work=Path(tempfile.mkdtemp(prefix='utilibre-qemu-check-',dir='/tmp'));work.chmod(0o755);(work/'out').mkdir();os.chown(work/'out',65534,65534)
 for n in ('qemu-img','qemu-io','qemu-nbd','qemu-storage-daemon'):
  (work/n).write_bytes((r/n).read_bytes());(work/n).chmod(0o755)
 (work/'fixture.py').write_bytes(Path(__file__).read_bytes());(work/'fixture.py').chmod(0o644)
 try:
  p=subprocess.run(['unshare','--net','--','setpriv','--reuid=65534','--regid=65534','--clear-groups','--no-new-privs','python3',str(work/'fixture.py'),'--inner',str(work)],capture_output=True,timeout=120);(r/'native-check.log').write_bytes(p.stdout+p.stderr);assert p.returncode==0,'Private native-check log retained';report=json.load(open(work/'out/result.json'));assert report['passed'];(r/'native-check.json').write_text(json.dumps(report,indent=2)+'\n');print('QEMU old/new native disk conversion and QMP capabilities passed; guest agent untouched')
 finally:
  import shutil;shutil.rmtree(work)
 sys.exit()
work=Path(sys.argv[2]);records=[]
def run(a):return subprocess.check_output(a,text=True,stderr=subprocess.PIPE,timeout=30).strip()
for label,base in [('before',Path('/usr/bin')),('candidate',work)]:
 with tempfile.TemporaryDirectory(prefix='utilibre-block-') as temp:
  d=Path(temp);img=str(base/'qemu-img');raw=d/'fictional.raw';qcow=d/'fictional.qcow2';out=d/'reopened.raw'
  run([img,'create','-f','raw',str(raw),'1M']);run([img,'convert','-f','raw','-O','qcow2',str(raw),str(qcow)]);run([img,'check',str(qcow)]);run([img,'compare','-f','raw','-F','qcow2',str(raw),str(qcow)]);run([str(base/'qemu-io'),'-f','qcow2','-c','write -P 42 0 512','-c','read -P 42 0 512',str(qcow)]);run([img,'convert','-f','qcow2','-O','raw',str(qcow),str(out)]);assert out.read_bytes()==bytes([42])*512+bytes(1024**2-512)
  help=run([img,'--help']);formats=help.split('Supported image formats:')[1].strip().split('\n\n')[0].split();path=d/'qmp.sock'
  p=subprocess.Popen([str(base/'qemu-storage-daemon'),'--chardev','socket,id=qmp,path='+str(path)+',server=on,wait=off','--monitor','chardev=qmp,mode=control'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  try:
   for _ in range(100):
    if path.exists():break
    assert p.poll() is None;time.sleep(.02)
   with socket.socket(socket.AF_UNIX) as s:
    s.settimeout(5);s.connect(str(path));f=s.makefile('rwb',buffering=0);assert 'QMP' in json.loads(f.readline())
    def q(command):
     f.write(json.dumps({'execute':command}).encode()+b'\n')
     while True:
      v=json.loads(f.readline())
      if 'event' not in v:assert 'return' in v,v;return v['return']
    q('qmp_capabilities');commands=sorted(x['name'] for x in q('query-commands'));q('quit')
   assert p.wait(timeout=5)==0
  finally:
   if p.poll() is None:p.terminate();p.wait(timeout=5)
  records.append({'label':label,'formats':formats,'commands':commands,'diskBytes':1024**2,'dataPatternVerified':True,'binaries':{n:hashlib.sha256((base/n).read_bytes()).hexdigest() for n in ('qemu-img','qemu-io','qemu-nbd','qemu-storage-daemon')}})
assert records[0]['formats']==records[1]['formats'];assert records[0]['commands']==records[1]['commands']
(work/'out/result.json').write_text(json.dumps({'date':datetime.now(timezone.utc).isoformat(),'passed':True,'records':records,'unprivileged':True,'network':'isolated namespace; local synthetic Unix QMP only','guestAgentAccess':False,'productionChanged':False}))
