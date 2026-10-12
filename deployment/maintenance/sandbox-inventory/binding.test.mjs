import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expectedSettings,digest,boundLock,sandboxSettings} from './binding.mjs';
import {collectSandboxSources,denoSourceName} from './collect.mjs';
import {checkedSourceHash} from './review-policy.mjs';
const manifest=JSON.parse(readFileSync(new URL('./deno/provenance.json',import.meta.url)));
const wrapper=readFileSync(new URL('../sandbox-final/grist-deno.sh',import.meta.url));
const settings=Object.entries(expectedSettings).map(([k,v])=>`${k}=${v}`);
const row={name:'example',version:'1.0',filename:'example-1.0-py3-none-any.whl',sha256:'a'.repeat(64)};
const command=({image='sha256:'+'a'.repeat(64),environment=settings,wrapperHash=digest(wrapper)}={})=>async(_program,args)=>{
 if(args.includes('{{.Image}}'))return image;
 if(args.includes('{{json .Config.Env}}'))return JSON.stringify(environment);
 if(args.includes('sha256sum'))return (args.at(-1)==='/usr/local/bin/grist-deno'?wrapperHash:manifest.binarySha256)+'  /binary\n';
 return JSON.stringify([row]);
};
test('release-source identity changes when the running image changes',async()=>{
 const [a]=await collectSandboxSources(command()),[b]=await collectSandboxSources(command({image:'sha256:'+'b'.repeat(64)}));
 assert.equal(a.name,denoSourceName);assert.notEqual(digest(a.bytes),digest(b.bytes));
 assert.equal(a.provenance.lockSha256,manifest.lockSha256);
 const scanned={...a,status:'checked',packages:1128,sha256:digest(a.bytes)};
 assert.equal(await checkedSourceHash(scanned),scanned.sha256);
 await assert.rejects(checkedSourceHash({...scanned,binding:b.binding}));
 await assert.rejects(checkedSourceHash({...scanned,packages:0}));
});
test('changed wrapper or any native sandbox override fails inventory without exposing values',async()=>{
 for(const key of ['GRIST_SANDBOX2','GRIST_SANDBOX3','GRIST_TEST_SANDBOX_ARGS','GRIST_SANDBOX_APPEND_ARGS']){
  const environment=settings.filter(x=>!x.startsWith(key+'=')).concat(`${key}=fictional-private-argument`);
  assert.throws(()=>sandboxSettings(environment),error=>!String(error).includes('fictional-private-argument'));
  const [deno,wheels]=await collectSandboxSources(command({environment}));
  assert.equal(deno.status,'failed');assert(wheels.bytes);
 }
 const [deno]=await collectSandboxSources(command({wrapperHash:'b'.repeat(64)}));assert.equal(deno.status,'failed');
 assert.throws(()=>sandboxSettings([...settings,'GRIST_SANDBOX_FLAVOR=pyodide']));
});
test('every permission setting and executable fingerprint contributes to identity',()=>{
 const binding={image:'sha256:'+'a'.repeat(64),wrapperSha256:digest(wrapper),binarySha256:manifest.binarySha256,settings:expectedSettings};
 const lock=Buffer.from('[metadata]\n');const original=digest(boundLock(lock,binding));
 for(const change of [{wrapperSha256:'b'.repeat(64)},{binarySha256:'b'.repeat(64)},{settings:{...expectedSettings,GRIST_SANDBOX_APPEND_ARGS:'--example'}}])assert.notEqual(digest(boundLock(lock,{...binding,...change})),original);
});
