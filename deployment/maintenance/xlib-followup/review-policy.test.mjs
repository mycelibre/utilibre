import test from 'node:test';import assert from 'node:assert/strict';import {eligible} from './review-policy.mjs';
const host={status:'needs-review',scope:'host-os',artifact:'host-dpkg',containers:[],type:'debian',package:'libx11-6',installed:'2:1.8.12-1+utilibre1',id:'CVE-2026-88806'};
test('host mitigation is exact package/source/version/CVE only',()=>{assert(eligible(host));for(const change of [{artifact:'other'},{containers:['utilibre-host']},{installed:'2:1.8.12-1'},{package:'libx11-dev'},{id:'CVE-2023-5574'},{type:'unknown'}])assert(!eligible({...host,...change}));});
test('DHI and Bookworm cannot inherit the Trixie repair',()=>{
 const row={...host,scope:'runtime-image',artifact:'sha256:'+'a'.repeat(64),containers:['utilibre-expanded-penpot-exporter-1']};assert(!eligible(row));assert(eligible({...row,installed:'2:1.8.12-1+dhi0+utilibre1'}));
 assert(!eligible({...row,containers:['utilibre-gathio-postgres-1']}));assert(eligible({...row,containers:['utilibre-gathio-postgres-1'],installed:'2:1.8.4-2+deb12u2+utilibre1'}));
 assert(!eligible({...row,containers:['utilibre-community-uptime-kuma-1']}));assert(!eligible({...row,containers:['utilibre-expanded-penpot-exporter-1','utilibre-expanded-penpot-backend-1'],installed:'2:1.8.12-1+dhi0+utilibre1'}));
});
test('render and Xtst findings need their own proved component',()=>{
 const row={...host,scope:'runtime-image',artifact:'sha256:'+'b'.repeat(64),containers:['utilibre-expanded-penpot-exporter-1'],package:'libxtst6',installed:'2:1.2.5-1+dhi0+utilibre1',id:'CVE-2026-94286'};assert(eligible(row));assert(!eligible({...row,id:'CVE-2026-88807'}));assert(!eligible({...row,containers:['utilibre-expanded-penpot-backend-1']}));
 assert(eligible({...host,package:'libxrender1',installed:'1:0.9.12-1+utilibre1',id:'CVE-2026-88807'}));assert(!eligible({...host,package:'libxrender1',installed:'1:0.9.12-1+utilibre1',id:'CVE-2026-88806'}));
});
