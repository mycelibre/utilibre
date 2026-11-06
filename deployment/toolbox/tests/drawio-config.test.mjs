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

test('loader fingerprint changes when upstream loader bytes change', async()=>{
  const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');
  const {execFileSync}=await import('node:child_process');
  const {join}=await import('node:path');
  const dir=mkdtempSync(join(tmpdir(),'drawio-config-'));
  try {
    mkdirSync(join(dir,'js'));
    writeFileSync(join(dir,'js/PreConfig.js'),source);
    const run=(extra)=>{
      writeFileSync(join(dir,'js/bootstrap.js'),"load('js/PreConfig.js');"+extra);
      writeFileSync(join(dir,'index.html'),'<script src="js/bootstrap.js"></script><svg class="geSplashLogo" viewBox="0 0 161.6 161.6" role="img" aria-label="draw.io"></svg>');
      execFileSync(process.execPath,[new URL('../version-drawio-config.mjs',import.meta.url).pathname,dir]);
      return readFileSync(join(dir,'index.html'),'utf8').match(/bootstrap\.utilibre-[a-f0-9]+\.js/)[0];
    };
    const old=run('');assert.equal(run(''),old);assert.notEqual(run('// upstream update'),old);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
