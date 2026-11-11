// Pinned test-only parser; no runtime download or dependency on a build workspace.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export const parserInput=JSON.parse(await readFile(new URL('./pdf-parser-input.json',import.meta.url),'utf8'));
export const parserDirectory=`/opt/utilibre/maintenance/fixtures/pdfjs-${parserInput.version}`;

export async function loadParser(directory=process.env.BENTO_TEST_SOURCE
  ? join(process.env.BENTO_TEST_SOURCE,'node_modules/pdfjs-dist/legacy/build')
  : parserDirectory, input=parserInput){
  const assets=new Map();
  for(const [name,expected] of Object.entries(input.files)){
    assert(['pdf.mjs','pdf.worker.mjs'].includes(name),'Unexpected parser asset');
    const bytes=await readFile(join(directory,name));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,`Changed PDF test input: ${name}`);
    assets.set('/'+name,bytes);
  }
  assert.equal(assets.size,2,'Incomplete PDF parser fixture');
  return assets;
}
