import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,version,fixed,absent} from './review-policy.mjs';
const row={status:'needs-review',scope:'runtime-image',type:'debian',package:'libheif1',installed:version,id:fixed[0],artifact:'sha256:'+'a'.repeat(64),containers:['utilibre-gathio-postgres-1']};
test('only exact repaired runtime package and enumerated advisories',()=>{for(const id of [...fixed,...absent])assert(eligible({...row,id}));for(const patch of [{id:'CVE-2026-99999'},{installed:'1.15.1-1+deb12u1'},{package:'libheif-dev'},{containers:['penpot-backend']},{containers:[...row.containers,'another']},{scope:'host-os'},{artifact:'latest'}])assert(!eligible({...row,...patch}));});
test('no old version/source-wide or low advisory blanket decision',()=>{assert(!eligible({}));assert(!eligible({...row,id:'CVE-2023-49462'}));assert(!eligible({...row,status:'mitigated'}));});
