import test from 'node:test';import assert from 'node:assert/strict';import {eligible} from './review-policy.mjs';
const row={status:'needs-review',id:'CVE-2026-9538',scope:'runtime-image',type:'debian',package:'perl-modules-5.40',installed:'5.40.1-6+deb13u1'};
test('Archive::Tar mitigation is exact advisory/package/scope only',()=>{assert(eligible(row));for(const change of [{id:'CVE-2026-99999'},{package:'perl-base'},{installed:'5.40.2-1'},{scope:'tracked-lock'},{type:'npm'},{status:'mitigated'}])assert(!eligible({...row,...change}));assert(!eligible(null));});
