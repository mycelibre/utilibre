import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {eligible} from './cryptpad-body-policy.mjs';
const s=JSON.parse(fs.readFileSync(new URL('./cryptpad-body-inputs.json',import.meta.url)));
const item={status:'needs-review',scope:'mounted-runtime-code',type:'npm',package:'body-parser',installed:s.packageVersion,id:s.advisory,target:'package-lock.json',targetName:'cryptpad/package-lock.json',artifact:'cryptpad/package-lock.json@sha256:'+s.lockSha256,containers:[]};
test('exact CryptPad mounted dependency record is eligible',()=>assert(eligible(item)));
test('unrelated findings and changed inputs are rejected',()=>{for(const change of [{scope:'runtime-image'},{package:'express'},{installed:'2.4.0'},{id:'CVE-2026-1'},{artifact:item.artifact.replace(/.$/,'0')},{containers:['other']},{targetName:'other/package-lock.json'},{status:'accepted-risk'}])assert(!eligible({...item,...change}));});
