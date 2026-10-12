// Supplement image scans with bounded code inventories. No app data or network.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {container,digest,runtimeBinding,boundLock} from './binding.mjs';
export const denoSourceName='grist/deno-2.9.7/Cargo.lock';
export const wheelSourceName='grist/pyodide-shipped-wheels/requirements.txt';
export const denoLockPath='deployment/maintenance/sandbox-inventory/deno/Cargo.lock';
export function wheelManifest(rows){
 assert(Array.isArray(rows)&&rows.length>0&&rows.length<=200,'Missing/unbounded wheel inventory');
 const names=new Set();
 for(const r of rows){
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(r.name),'Invalid package name');
  assert(/^[0-9][A-Za-z0-9.!+_-]*$/.test(r.version),'Invalid package version');
  assert(/^[a-f0-9]{64}$/.test(r.sha256),'Missing payload digest');
  assert(/^[A-Za-z0-9][A-Za-z0-9._+-]*\.whl$/.test(r.filename),'Invalid wheel filename');
  const key=r.name.toLowerCase().replace(/[-_.]+/g,'-');assert(!names.has(key),'Conflicting wheel identities');names.add(key);
 }
 // Include payload identity so changed bytes reopen review even at the same version.
 return rows.map(r=>`# ${r.filename} sha256:${r.sha256}\n${r.name}==${r.version}\n`).sort().join('');
}
export async function collectSandboxSources(command){
 const sources=[];
 try{
  const manifest=JSON.parse(await readFile(new URL('./deno/provenance.json',import.meta.url),'utf8'));
  const bytes=await readFile(new URL('./deno/Cargo.lock',import.meta.url));
  assert.equal(digest(bytes),manifest.lockSha256,'Pinned Deno source changed');
  const binding=await runtimeBinding(command);
  sources.push({name:denoSourceName,scope:'upstream-release-source-lock',bytes:boundLock(bytes,binding),filename:'Cargo.lock',
   provenance:manifest,binding,note:'Release source dependencies include optional/build/other-platform crates; not a linked-binary SBOM or proof every crate executes.'});
 }catch{sources.push({name:denoSourceName,scope:'upstream-release-source-lock',status:'failed',note:'Source/runtime pin failed; review the installed Deno release.'});}
 try{
  const script=await readFile(new URL('./grist-wheels.py',import.meta.url),'utf8');
  const rows=JSON.parse(await command('docker',['exec',container,'python3','-c',script],30000));
  const bytes=Buffer.from(wheelManifest(rows));
  sources.push({name:wheelSourceName,scope:'runtime-wheel-metadata',bytes,filename:'requirements.txt',
   payloads:rows,note:'Metadata of wheels shipped for Grist Pyodide. Does not inventory native libraries compiled into Python/WASM or visitor-installed packages.'});
 }catch{sources.push({name:wheelSourceName,scope:'runtime-wheel-metadata',status:'failed',note:'Shipped-wheel inventory failed; no empty/clean result inferred.'});}
 return sources;
}
