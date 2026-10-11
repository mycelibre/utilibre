// Native APIs used by Kuma; no third-party requests or production monitor edits.
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const proto=require('/app/node_modules/protobufjs'),tar=require('/app/node_modules/tar');
assert.equal(require('/app/node_modules/protobufjs/package.json').version,'7.6.6');
assert.equal(require('/app/node_modules/tar/package.json').version,'7.5.21');
assert.equal(require('/app/node_modules/@grpc/grpc-js/package.json').version,'1.14.5');
(async()=>{
 const type=proto.parse('syntax="proto3"; message Example { string label=1; int32 value=2; }').root.lookupType('Example');
 const message={label:'Fictional café',value:21};assert.equal(type.verify(message),null);
 assert.deepEqual(type.toObject(type.decode(type.encode(message).finish())),message);
 await fs.mkdir('/tmp/kuma-library-source');await fs.mkdir('/tmp/kuma-library-result');
 await fs.writeFile('/tmp/kuma-library-source/example.txt','Fictional archive');
 await tar.c({cwd:'/tmp/kuma-library-source',file:'/tmp/kuma-library-fixture.tar'},['example.txt']);
 await tar.x({cwd:'/tmp/kuma-library-result',file:'/tmp/kuma-library-fixture.tar'});
 assert.equal(await fs.readFile('/tmp/kuma-library-result/example.txt','utf8'),'Fictional archive');
 const {GrpcKeywordMonitorType}=require('/app/server/monitor-types/grpc');
 const service=new GrpcKeywordMonitorType().constructGrpcService('127.0.0.1:1','syntax="proto3"; message Request {} message Response { string value=1; } service Example { rpc Read(Request) returns (Response); }','Example',false);
 assert.equal(typeof service.read,'function');
 console.log('Native protobuf encode/decode, Kuma gRPC service construction and tar export/extract passed');
})().catch(e=>{console.error(e.message);process.exitCode=1});
