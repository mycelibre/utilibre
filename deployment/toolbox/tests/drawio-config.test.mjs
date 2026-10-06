import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../drawio-PreConfig.js',import.meta.url),'utf8');
function configuration(narrow, requested={}) {
  const context = {urlParams:{...requested},window:{location:{origin:'https://draw.utilibre.org'},matchMedia:()=>({matches:narrow})}};
  vm.runInNewContext(source,context);
  return context;
}
test('narrow screens use the native Minimal editor and preserve explicit choices',()=>{
  assert.equal(configuration(true).urlParams.ui,'min');
  assert.equal(configuration(false).urlParams.ui,undefined);
  assert.equal(configuration(true,{ui:'sketch'}).urlParams.ui,'sketch');
});
test('mobile layout does not enable cloud accounts, remote export or tracking',()=>{
  for (const narrow of [true,false]) {
    const context=configuration(narrow);
    assert.equal(context.window.EXPORT_URL,'');
    for(const key of ['gapi','db','od','gh','gl','tr']) assert.equal(context.urlParams[key],'0');
    assert.equal(context.urlParams.offline,'1');
    assert.equal(context.urlParams.local,'1');
  }
});
