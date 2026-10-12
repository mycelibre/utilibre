import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {denoSourceName} from './collect.mjs';
import {digest,boundLock,validateBinding} from './binding.mjs';
export const reviewFile='sandbox-inventory-20261012/dns-review.json';
export async function checkedSourceHash(source){
 assert(source?.name===denoSourceName&&source.status==='checked'&&source.packages>0&&source.scope==='upstream-release-source-lock');
 const manifest=JSON.parse(await readFile(new URL('./deno/provenance.json',import.meta.url),'utf8'));
 const bytes=await readFile(new URL('./deno/Cargo.lock',import.meta.url));
 const wrapper=await readFile(new URL('../sandbox-final/grist-deno.sh',import.meta.url));
 assert.equal(digest(bytes),manifest.lockSha256);
 assert.deepEqual(source.provenance,manifest);
 validateBinding(source.binding,manifest,wrapper);
 const hash=digest(boundLock(bytes,source.binding));assert.equal(source.sha256,hash);
 return hash;
}
export function eligible(item,sourceHash){
 return /^[a-f0-9]{64}$/.test(sourceHash||'')&&item?.status==='needs-review'&&item.scope==='upstream-release-source-lock'&&item.type==='cargo'
  &&item.targetName===denoSourceName&&item.artifact===`${denoSourceName}@sha256:${sourceHash}`
  &&item.installed==='0.25.2'&&item.severity==='HIGH'
  &&((item.id==='GHSA-3v94-mw7p-v465'&&item.package==='hickory-proto')
    ||(item.id==='GHSA-5j98-2g5x-46v6'&&item.package==='hickory-resolver'));
}
