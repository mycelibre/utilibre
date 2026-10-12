import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEvidence,plannedPins,probeHeaders} from './release.mjs';
const id='sha256:'+'a'.repeat(64),base='sha256:'+'b'.repeat(64);
const s={key:'example',baseId:base,candidate:'reviewed:1',binary:'/bin/app',compiler:'1.26.9'};
const b={key:s.key,base,image:s.candidate,imageId:id,runtimeConfigurationUnchanged:true,compiler:s.compiler};
const v={passed:true,imageId:id,onlyChangedPaths:['/bin/app'],compiler:s.compiler},n={passed:true,imageId:id};
test('release requires exact-image native and complete-file evidence',()=>assert.equal(validateEvidence(s,b,v,n),id));
for(const [name,change] of [
 ['wrong base',()=>validateEvidence(s,{...b,base:id},v,n)],
 ['changed runtime',()=>validateEvidence(s,{...b,runtimeConfigurationUnchanged:false},v,n)],
 ['no native pass',()=>validateEvidence(s,b,v,{...n,passed:false})],
 ['native wrong image',()=>validateEvidence(s,b,v,{...n,imageId:base})],
 ['no parity',()=>validateEvidence(s,b,{...v,onlyChangedPaths:[]},n)],
 ['failed scan/parity',()=>validateEvidence(s,b,{...v,passed:false},n)],
 ['unreviewed extra file',()=>validateEvidence(s,b,{...v,onlyChangedPaths:['/bin/app','/app/index.html']},n)],
 ['wrong compiler',()=>validateEvidence(s,b,{...v,compiler:'1.26.8'},n)],
])test(name+' fails closed',()=>assert.throws(change));
test('pin planning rejects duplicate or absent image scalars before any write',()=>{
 const file={file:'compose.yaml',text:'services:\n  app:\n    image: old:1\n'};
 assert.equal(plannedPins([file],'old:1','new:1')[0].text,'services:\n  app:\n    image: new:1\n');
 assert.throws(()=>plannedPins([file,{...file,file:'duplicate.yaml'}],'old:1','new:1'));
 assert.throws(()=>plannedPins([file],'unrelated:1','new:1'));
 assert.equal(file.text,'services:\n  app:\n    image: old:1\n');
});
test('synthetic edge identity is confined to the private Anubis info probe',()=>{
 assert.equal(probeHeaders('anubis','http://10.10.1.43:3002/info')['CF-Connecting-IP'],'127.0.0.1');
 for(const [key,url] of [['anubis','https://redlib.utilibre.org/info'],['anubis','http://10.10.1.43:3002/'],['mezzo','http://10.10.1.43:3002/info']])
  assert.deepEqual(probeHeaders(key,url),{Connection:'close'});
});
