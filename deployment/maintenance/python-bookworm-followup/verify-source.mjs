// Prove the Debian-context refresh contains exactly the upstream C/header edits.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='/var/lib/utilibre-maintenance/python-bookworm-followup-20261012';
const upstream=fs.readFileSync(dir+'/sources/CVE-2026-7210.patch','utf8');
assert.equal(createHash('sha256').update(upstream).digest('hex'),'362704a609a85ae95ebd08b58fb31f1c3e7d3d4604f7421f35c9d1885ced5082');
const local=fs.readFileSync(new URL('./entropy.patch',import.meta.url),'utf8');
const files=['Include/pyexpat.h','Include/pyhash.h','Modules/_elementtree.c','Modules/pyexpat.c'];
function changes(text){
 const out={};let name;
 for(const line of text.split('\n')){
  if(line.startsWith('diff --git ')){name=undefined;continue;}
  if(line.startsWith('--- a/')){name=line.slice(6);continue;}
  if(line.startsWith('--- /dev/null')){name=undefined;continue;}
  if(name&&/^[+-]/.test(line)&&!/^\+\+\+|^---/.test(line)){
   if(!files.includes(name))throw Error('Unexpected source patch target');
   (out[name]??=[]).push(line);
  }
 }
 return out;
}
const actual=changes(local),expected=changes(upstream);
assert.deepEqual(Object.keys(actual).sort(),files.sort());
assert.deepEqual(actual,expected);
console.log('All four patched C/header files have byte-identical upstream additions/deletions; context only changed.');
