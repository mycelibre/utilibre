"""Bounded synthetic native and fallback checks; no network or application state."""
import gc,json,struct,sys,tracemalloc,weakref
import msgpack
from msgpack import fallback
assert msgpack.__version__==sys.argv[1]
assert msgpack.Unpacker.__module__=='msgpack._cmsgpack'
fixed=sys.argv[2]=='fixed'
checks=0
for module in [msgpack,fallback]:
 pack=module.Packer().pack
 value={'fictional':'Ficción','bytes':b'abc','list':[1,-2,True,None,3.25]}
 assert module.unpackb(pack(value))==value;checks+=1
 assert module.unpackb(pack(msgpack.ExtType(7,b'abc')))==msgpack.ExtType(7,b'abc');checks+=1
 u=module.Unpacker();data=pack(value);u.feed(data[:3])
 try:u.unpack();raise AssertionError('Incomplete input accepted')
 except msgpack.OutOfData:pass
 u.feed(data[3:]);assert u.unpack()==value;checks+=1
 u=module.Unpacker();u.feed(pack([1,2])+pack('remaining'));u.skip();assert u.unpack()=='remaining';checks+=1
 assert module.unpackb(pack(list(range(15000))))==list(range(15000));checks+=1
 try:module.unpackb(pack({1:'forbidden'}));raise AssertionError('Invalid map key accepted')
 except ValueError:pass
 checks+=1

class Marker:pass
retention=[]
for streaming in [False,True]:
 refs=[]
 def hook(t,d):
  obj=Marker();refs.append(weakref.ref(obj));return obj
 body=msgpack.packb({1:msgpack.ExtType(7,b'fictional')})
 try:
  if streaming:
   u=msgpack.Unpacker(ext_hook=hook);u.feed(body);u.unpack()
  else:msgpack.unpackb(body,ext_hook=hook)
  raise AssertionError('Invalid key accepted')
 except ValueError:pass
 if streaming:del u
 gc.collect();assert len(refs)==1;retention.append(sum(r() is not None for r in refs))
assert retention==([0,0] if fixed else [1,1]),retention

# Five-byte incomplete header; bounded memory observation, not a load test.
u=msgpack.Unpacker(max_array_len=100000,max_buffer_size=1024*1024)
u.feed(b'\xdd'+struct.pack('>I',50000));tracemalloc.start()
try:u.unpack();raise AssertionError('Incomplete array accepted')
except msgpack.OutOfData:pass
current,peak=tracemalloc.get_traced_memory();tracemalloc.stop();del u
if fixed:assert peak<200000,peak
print(json.dumps({'passed':True,'version':msgpack.__version__,'normalChecks':checks,'retainedRejectedValues':retention,'leakPrevented':retention==[0,0],'incompleteHeaderPeakBytes':peak,'preallocationBounded':peak<200000,'network':'none'}))
