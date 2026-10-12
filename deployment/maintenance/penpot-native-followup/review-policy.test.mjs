import {test} from 'node:test';import assert from 'node:assert/strict';import {eligible} from './review-policy.mjs';
const item={status:'needs-review',scope:'runtime-image',type:'debian',artifact:'sha256:'+'a'.repeat(64),containers:['utilibre-expanded-penpot-backend-1'],package:'librsvg2-2',installed:'2.60.3+utilibre1',id:'CVE-2026-96889'};
test('only exact tested SVG/TIFF releases and advisories',()=>{
 assert(eligible(item));assert(eligible({...item,package:'librsvg2-common'}));
 for(const id of ['CVE-2026-36849','CVE-2026-52490'])assert(eligible({...item,package:'libtiff6',installed:'4.7.2-1~deb13u1+utilibre1',id}));
 for(const patch of [{status:'mitigated'},{scope:'host-os'},{type:'npm'},{artifact:'new'},{containers:[]},{containers:['unreviewed']},{containers:[...item.containers,'another']},{package:'other'},{installed:'2.60.4'},{id:'CVE-unknown'}])assert(!eligible({...item,...patch}));
});
