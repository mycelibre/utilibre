import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../config/privatebin/upload-limit.js',import.meta.url),'utf8');
function run(type,sizes,lang='en',id='file') {
  const listeners={}, input={value:'selected'}, calls=[];
  const app={AttachmentViewer:Object.fromEntries(['removeAttachmentData','hideAttachment','hideAttachmentPreview'].map(name=>[name,()=>calls.push(name)])),Alert:{showError:message=>calls.push(message)}};
  runInNewContext(source,{document:{documentElement:{lang},addEventListener:(name,fn,capture)=>{assert.equal(capture,true);listeners[name]=fn;},getElementById:()=>input},window:{PrivateBin:app}});
  const files=sizes.map(size=>({size})), event={type,target:{id,files},dataTransfer:{files},clipboardData:{files},preventDefault:()=>calls.push('prevent'),stopImmediatePropagation:()=>calls.push('stop')};
  listeners[type](event); return {calls,input};
}
for(const type of ['change','drop','paste']) {
  test(`${type}: accepts exactly 25 MB total`,()=>assert.deepEqual(run(type,[12_000_000,13_000_000]).calls,[]));
  test(`${type}: rejects combined size over 25 MB before upstream handler`,()=>{
    const {calls,input}=run(type,[12_000_000,13_000_001]);
    assert.deepEqual(calls.slice(0,5),['prevent','stop','removeAttachmentData','hideAttachment','hideAttachmentPreview']);
    assert.match(calls[5],/25,000,000/); assert.equal(input.value,'');
  });
}
test('Spanish error and ordinary non-file events',()=>{
  assert.match(run('paste',[25_000_001],'es-GT').calls.at(-1),/Elegí/);
  assert.deepEqual(run('paste',[]).calls,[]);
  assert.deepEqual(run('change',[26_000_000],'en','message').calls,[]);
});
