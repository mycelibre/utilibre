import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,reserveEligible,version,roles} from './review-policy.mjs';
const base={status:'needs-review',scope:'runtime-image',type:'debian',id:'CVE-2026-84964',package:'libmongoc-1.0-0t64',installed:version,artifact:'sha256:'+'1'.repeat(64),containers:roles};
test('exact repaired package and relay roles only',()=>{assert(eligible(base));assert(eligible({...base,package:'libbson-1.0-0t64',containers:[roles[0]]}));});
test('rejects stale version, other CVE, host, unrelated roles and malformed identities',()=>{for(const change of [{installed:'1.30.4-1+deb13u3'},{id:'CVE-2026-6231'},{scope:'host'},{package:'libssl3t64'},{containers:[]},{containers:[roles[0],roles[0]]},{containers:['unrelated']},{artifact:'latest'},{status:'mitigated'},{type:'ubuntu'}])assert(!eligible({...base,...change}),JSON.stringify(change));});

test('reservation review permits only both exact repaired advisories and relay components',()=>{
 for(const id of ['CVE-2026-84964','CVE-2026-106437'])assert(reserveEligible({...base,id}));
 for(const change of [{id:'CVE-other'},{installed:'1.30.13'},{containers:['different-relay']},{package:'libssl3t64'},{scope:'host-os'},{status:'confirmed'},{artifact:'latest'}])assert(!reserveEligible({...base,...change}));
});
