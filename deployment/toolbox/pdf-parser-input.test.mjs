import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {loadParser} from './pdf-parser-input.mjs';

test('parser requires both exact local inputs; rejects missing or changed bytes',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'utilibre-pdf-input-'));
  const fixture={'pdf.mjs':'fictional parser fixture','pdf.worker.mjs':'fictional worker fixture'};
  const input={files:Object.fromEntries(Object.entries(fixture).map(([name,bytes])=>[name,createHash('sha256').update(bytes).digest('hex')]))};
  try{
    await assert.rejects(loadParser(dir,input),{code:'ENOENT'});
    for(const [name,bytes] of Object.entries(fixture))await writeFile(join(dir,name),bytes);
    const assets=await loadParser(dir,input);
    assert.equal(assets.get('/pdf.mjs').toString(),fixture['pdf.mjs']);
    await writeFile(join(dir,'pdf.worker.mjs'),'changed');
    await assert.rejects(loadParser(dir,input),/Changed PDF test input/);
    await assert.rejects(loadParser(dir,{files:{'../outside':'0'}}),/Unexpected parser asset/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
