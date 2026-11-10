import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {proveHttpClientSource,proveHttpClientRelease} from './http-client-policy.mjs';
import {selectBatch} from '../security-20261103/batch.mjs';
const input=JSON.parse(fs.readFileSync(new URL('./symfony-inputs.json',import.meta.url)));
function fixture(s){return {base:s.base,candidate:s.candidate,imageId:'sha256:'+'a'.repeat(64),passed:true,configurationUnchanged:true,upstreamSourceVerified:true,credentialLeakReproduction:false,fixtureSha256:input.fixtureSha256,changedFiles:['/app/vendor/symfony/http-client/ScopingHttpClient.php'],baseline:{passed:true,normalChecks:20,network:'none',credentialLeakReproduction:false,sourceSha256:s.files[0].beforeSha256},native:{passed:true,normalChecks:20,network:'none',credentialLeakReproduction:false,sourceSha256:s.files[0].afterSha256}};}
for(const s of input.rows){
 test(s.key+' exact source and ordinary compatibility accepted',()=>assert(proveHttpClientSource(input,s,fixture(s),input.fixtureSha256)));
 for(const field of ['base','fixtureSha256','credentialLeakReproduction','configurationUnchanged','changedFiles'])test(s.key+' rejects changed '+field,()=>{
  const b=fixture(s);b[field]=field==='changedFiles'?['/app/vendor/other.php']:typeof b[field]==='boolean'?!b[field]:'changed';assert.throws(()=>proveHttpClientSource(input,s,b,input.fixtureSha256));
 });
 test(s.key+' missing app gate cannot release',()=>assert.throws(()=>proveHttpClientRelease(input,s,fixture(s),{}, {}, {},input.fixtureSha256,input.applicationFixtures[s.key])));
 test(s.key+' different source revision cannot be blessed by a passing fixture',()=>{const x=structuredClone(s);x.source.commit='b'.repeat(40);assert.throws(()=>proveHttpClientSource(input,x,fixture(x),input.fixtureSha256));});
}
test('November 10 selection cannot run other profiles or overlapping dates',()=>{
 const b=selectBatch(['--batch-20261110','--symfony','prepare','wallabag']);assert(b.root.endsWith('20261110'));assert(b.input('symfony').pathname.endsWith('/security-20261110/symfony-inputs.json'));
 for(const args of [['--batch-20261110'],['--batch-20261110','--musl'],['--batch-20261110','--symfony','--batch-20261109'],['--batch-20261110','--symfony','--symfony']])assert.throws(()=>selectBatch(args));assert.throws(()=>b.input('musl'));
});
