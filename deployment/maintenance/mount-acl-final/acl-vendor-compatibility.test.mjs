import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validate} from './acl-vendor-compatibility.mjs';
const input=JSON.parse(fs.readFileSync(new URL('./acl-vendor-compatibility-inputs.json',import.meta.url)));
test('Exact current targets include image and host scopes without release permission',()=>{
  assert.equal(validate(structuredClone(input)).targets.length,30);
  assert.equal(input.targets.filter(x=>x.artifact==='host-dpkg').length,1);
});
test('Unreviewed revisions, deployment permission and unsafe input paths are rejected',()=>{
  for(const mutate of [
    x=>x.candidateVersion='latest', x=>x.securityClosureAllowed=true,
    x=>x.permission='deploy', x=>x.files[0].path='../../etc/shadow',
    x=>x.files[0].sha256='bad',x=>x.sourceAuthenticationSha256='bad',
    x=>x.targets[0].libraryPath='/etc/ld.so.preload',
    x=>x.targets[0].artifact='debian:latest', x=>x.targets[0].version='unknown',
    x=>x.targets.push(structuredClone(x.targets[0])),
    x=>x.targets[0].roles=['bad\nrole'], x=>x.targets[0].rsyncExpected='yes',
    x=>x.files.pop(),
  ]) {
    const changed=structuredClone(input);mutate(changed);assert.throws(()=>validate(changed));
  }
});
