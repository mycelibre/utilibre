// Provision test fixtures from an already acquired package; no network/install scripts.
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,rename,rm,lstat,chmod} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {loadParser,parserDirectory,parserInput} from './pdf-parser-input.mjs';
assert.equal(process.argv.length,3,'Pass the acquired pdfjs-dist package directory');
const source=resolve(process.argv[2]);
const pkg=JSON.parse(await readFile(join(source,'package.json'),'utf8'));
assert.equal(pkg.name,parserInput.package);assert.equal(pkg.version,parserInput.version);
const assets=await loadParser(join(source,'legacy/build'));
const license=await readFile(join(source,'LICENSE'),'utf8');assert(license.includes('Apache License')&&license.includes('Version 2.0'));
await mkdir(dirname(parserDirectory),{recursive:true,mode:0o755});
try{
 const current=await lstat(parserDirectory);assert(current.isDirectory()&&!current.isSymbolicLink());
 await loadParser(parserDirectory);assert.equal(await readFile(join(parserDirectory,'LICENSE'),'utf8'),license);
 console.log('Pinned PDF test parser already installed; unchanged.');
}catch(error){
 if(error.code!=='ENOENT')throw error;
 // Existing incomplete directories are never replaced silently.
 try{await lstat(parserDirectory);throw Error('Incomplete parser directory: inspect before repairing');}catch(e){if(e.code!=='ENOENT')throw e;}
 const stage=await mkdtemp(parserDirectory+'.candidate-');
 try{
  for(const [name,bytes]of assets)await writeFile(join(stage,name.slice(1)),bytes,{mode:0o644});
  await writeFile(join(stage,'LICENSE'),license,{mode:0o644});
  await loadParser(stage);await chmod(stage,0o755);await rename(stage,parserDirectory);
 }catch(e){await rm(stage,{recursive:true,force:true});throw e;}
 console.log('Pinned PDF test parser installed; no application changed.');
}
