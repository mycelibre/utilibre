import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,version,fixed,absent} from './review-policy.mjs';
const row={status:'needs-review',scope:'runtime-image',type:'debian',package:'libheif1',installed:version,id:fixed[0],artifact:'sha256:'+'a'.repeat(64),containers:['utilibre-gathio-postgres-1']};
test('only exact repaired runtime package and enumerated advisories',()=>{for(const id of [...fixed,...absent])assert(eligible({...row,id}));for(const patch of [{id:'CVE-2026-99999'},{installed:'1.15.1-1+deb12u1'},{package:'libheif-dev'},{containers:['penpot-backend']},{containers:[...row.containers,'another']},{scope:'host-os'},{artifact:'latest'}])assert(!eligible({...row,...patch}));});
test('no old version/source-wide or low advisory blanket decision',()=>{assert(!eligible({}));assert(!eligible({...row,id:'CVE-2023-49462'}));assert(!eligible({...row,status:'mitigated'}));});

import {novemberAbsent,novemberReason} from './review-policy.mjs';
test('November attribution rejects affected decoder/API and preserves unresolved paths',()=>{
 const text='ordinary source '.repeat(1000),symbols='heif_known_export\n'.repeat(100);
 for(const id of novemberAbsent)assert(novemberReason(id,text,symbols));
 for(const id of ['CVE-2026-84384','CVE-2026-84447'])assert.equal(novemberReason(id,text,symbols),null);
 for(const [id,token] of [['CVE-2026-120208','unc_decoder'],['CVE-2026-50142','Box_stsz'],['CVE-2026-62289','heif_image_handle_get_image_tiling'],['CVE-2026-62292','heif_image_handle_decode_image_tile'],['CVE-2026-84444','heif_context_add_image_tile'],['CVE-2026-84446','Track::']]){
  assert.equal(novemberReason(id,text+token,symbols),null);assert.equal(novemberReason(id,text,symbols+token),null);
 }
 assert.equal(novemberReason(novemberAbsent[0],'',symbols),null);
});
