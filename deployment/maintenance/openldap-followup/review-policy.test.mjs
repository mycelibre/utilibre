import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,version} from './review-policy.mjs';
const item={status:'needs-review',scope:'runtime-image',type:'debian',package:'libldap-2.5-0',installed:version,id:'CVE-2023-2953',artifact:'sha256:'+'a'.repeat(64),containers:['utilibre-community-rallly-1']};
test('Only exact repaired library and four approved roles qualify',()=>{assert(eligible(item));for(const c of ['utilibre-community-uptime-kuma-1','utilibre-community-rssbridge-1','utilibre-gathio-postgres-1'])assert(eligible({...item,containers:[c]}));});
test('Unrelated versions, CVEs, source groups, package names and scopes stay open',()=>{for(const p of [{id:'CVE-2020-15719'},{id:'CVE-2026-22185'},{installed:'2.5.13+dfsg-5'},{package:'slapd'},{package:'libldap-common'},{type:'npm'},{scope:'host-os'},{scope:'source-manifest'},{status:'mitigated'},{artifact:'moving-tag'}])assert.equal(eligible({...item,...p}),false);});
test('Empty, unknown, mixed and duplicate role lists are excluded',()=>{for(const list of [[],['unknown'],[...item.containers,'unknown'],[...item.containers,...item.containers]])assert.equal(eligible({...item,containers:list}),false);});
