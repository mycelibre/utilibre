#!/usr/bin/env python3
"""Read-only host-library candidate check. Does not install or restart anything."""
import ctypes, hashlib, json, os, pathlib, socket, struct, subprocess, threading, sys
os.umask(0o077)
BASE=pathlib.Path('/var/lib/utilibre-maintenance/xml-final-20261011')
assert sys.argv[1:] in ([],['--installed'])
installed=sys.argv[1:]==['--installed']
LIB=pathlib.Path('/usr/lib/x86_64-linux-gnu') if installed else BASE/'host/usr/lib/x86_64-linux-gnu'
PACKAGE=pathlib.Path('/var/lib/utilibre-maintenance/native-final/libxml2-output/libxml2_2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1_amd64.deb')
assert hashlib.sha256(PACKAGE.read_bytes()).hexdigest()=='b2ff4643de60160f0d80fbe617ce2aa6b92b9fa22d3f52cf02ab8cad7eb841e4'
assert hashlib.sha256((LIB/'libxml2.so.2.9.14').read_bytes()).hexdigest()=='ac980c0afed237e5f14a6749a9e57af772d388d009a93caf633c20db40840947'
def run(args,env=None):
    return subprocess.run(args,env=env,text=True,capture_output=True,timeout=120,check=True).stdout
env={**os.environ,'LD_LIBRARY_PATH':str(LIB)}
simulation=run(['apt-get','-s','install',str(PACKAGE)])
assert ('0 upgraded, 0 newly installed, 0 to remove' if installed else '1 upgraded, 0 newly installed, 0 to remove') in simulation
assert [line.split()[1] for line in simulation.splitlines() if line.startswith('Inst ')]==([] if installed else ['libxml2'])
inventory=run(['sh','-c',"find /usr/lib /usr/bin /usr/sbin /usr/local -type f -exec readelf -d {} + 2>/dev/null | awk '/^File: / {file=$0} /NEEDED.*libxml2.so.2/ {print file}'"])
consumers=sorted(line.removeprefix('File: ') for line in inventory.splitlines())
assert consumers==[
 '/usr/lib/x86_64-linux-gnu/libLLVM.so.19.1',
 '/usr/lib/x86_64-linux-gnu/libdns-9.20.29-1~deb13u1-Debian.so',
 '/usr/lib/x86_64-linux-gnu/libisc-9.20.29-1~deb13u1-Debian.so']
for consumer in consumers:
    linked=run(['ldd','-r',consumer],env)
    assert 'not found' not in linked and 'undefined symbol' not in linked
    assert str(LIB)+'/libxml2.so.2' in linked
for name in ['old-abi-check','new-abi-check']:
    assert 'passed' in run(['/var/lib/utilibre-maintenance/native-final/libxml2-output/'+name],env)

# The installed BIND consumer is the host client, not a named DNS daemon.
# Give it an entirely synthetic DNS reply on loopback, not a public resolver.
server=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
server.bind(('127.0.0.1',0));server.settimeout(8)
port=server.getsockname()[1]
def reply():
    packet,address=server.recvfrom(2048)
    assert len(packet)>16 and packet[4:6]==b'\x00\x01'
    result=packet[:2]+b'\x81\x80\x00\x01\x00\x01\x00\x00\x00\x00'+packet[12:]
    result+=b'\xc0\x0c\x00\x01\x00\x01'+struct.pack('!IH',60,4)+bytes([192,0,2,10])
    server.sendto(result,address)
thread=threading.Thread(target=reply);thread.start()
try:
    response=subprocess.run(['/usr/bin/host','-t','A','-p',str(port),'fictional.invalid','127.0.0.1'],
      env={**env,'LD_DEBUG':'libs'},text=True,capture_output=True,timeout=12,check=True)
    assert '192.0.2.10' in response.stdout
    assert 'calling init: '+str(LIB)+'/libxml2.so.2' in response.stderr
finally:thread.join(timeout=10);server.close()

# Exact LLVM19 public C API from llvmorg-19.1.7 Core.h and IRReader.h.
# A child process loads the candidate through the dynamic linker from startup.
script=r'''
import ctypes, os
p=ctypes.c_void_p; c=ctypes.c_char_p
lib=ctypes.CDLL('/usr/lib/x86_64-linux-gnu/libLLVM.so.19.1',mode=os.RTLD_NOW)
lib.LLVMContextCreate.restype=p
lib.LLVMCreateMemoryBufferWithMemoryRangeCopy.argtypes=[c,ctypes.c_size_t,c]
lib.LLVMCreateMemoryBufferWithMemoryRangeCopy.restype=p
lib.LLVMParseIRInContext.argtypes=[p,p,ctypes.POINTER(p),ctypes.POINTER(c)]
lib.LLVMParseIRInContext.restype=ctypes.c_int
lib.LLVMGetNamedFunction.argtypes=[p,c];lib.LLVMGetNamedFunction.restype=p
lib.LLVMDisposeModule.argtypes=[p];lib.LLVMContextDispose.argtypes=[p]
context=lib.LLVMContextCreate()
text=b'define i32 @fictional() { ret i32 42 }\n'
buffer=lib.LLVMCreateMemoryBufferWithMemoryRangeCopy(text,len(text),b'fictional')
module=p();error=c()
assert lib.LLVMParseIRInContext(context,buffer,ctypes.byref(module),ctypes.byref(error))==0
assert lib.LLVMGetNamedFunction(module,b'fictional')
lib.LLVMDisposeModule(module);lib.LLVMContextDispose(context)
assert os.environ['LD_LIBRARY_PATH']+'/libxml2.so.2.9.14' in open('/proc/self/maps').read()
print('LLVM_NATIVE_PASSED')
'''
assert 'LLVM_NATIVE_PASSED' in run(['python3','-c',script],env)
namespace=os.readlink('/proc/1/ns/mnt');mapped=[]
for proc in pathlib.Path('/proc').iterdir():
    if not proc.name.isdigit():continue
    try:
        if os.readlink(proc/'ns/mnt')==namespace and 'libxml2.so' in (proc/'maps').read_text():
            mapped.append({'pid':int(proc.name),'comm':(proc/'comm').read_text().strip()})
    except (FileNotFoundError,PermissionError,ProcessLookupError):pass
report={'status':'passed','testedInstalledPackage':installed,'hostChangedByThisCheck':False,'simulatedPackageChanges':[] if installed else ['libxml2'],
 'directElfConsumers':consumers,'relocationsPassed':True,'nativeOldNewHeaderParsers':True,
 'bindHostSyntheticLoopbackDns':True,'llvm19NativeIrParsing':True,'currentlyMappedHostProcesses':mapped,
 'librarySha256':hashlib.sha256((LIB/'libxml2.so.2.9.14').read_bytes()).hexdigest(),
 'limitations':['Bounded actual installed consumer checks, not every LLVM/BIND function.',
 'Public structure tail additions are not a universal ABI guarantee for unrelated plugins.',
 'No host package installed or daemon restarted by this check.']}
(BASE/('host-live-native.json' if installed else 'host-review.json')).write_text(json.dumps(report,indent=2)+'\n')
print('Host candidate: dependency simulation, exact three ELF consumers, BIND loopback DNS, LLVM IR and native XML gates passed; no host mutation.')
