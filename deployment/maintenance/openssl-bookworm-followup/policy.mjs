import assert from 'node:assert/strict';
export function suites(log){
 const rows=[...log.matchAll(/All tests successful\.\s*Files=(\d+), Tests=(\d+),[^\n]*\nResult: PASS/g)].map(m=>({files:Number(m[1]),tests:Number(m[2])}));
 assert.equal(rows.length,2,'Complete static and shared suite summaries required');assert(rows.every(r=>r.files>200&&r.tests>1000));
 assert(!/Result: FAIL|Failed \d+\/\d+ test programs/.test(log));return rows;
}
export function dtlsControl({status,output},patched,name){
 assert(['test_dtls_client_retransmit','test_dtls_server_retransmit'].includes(name));
 if(patched){assert.equal(status,0);assert.match(output,new RegExp('(?:^|\\n)ok 1 - '+name+'(?:\\n|$)'));assert(!output.includes('not ok'));}
 else {assert.notEqual(status,0);assert.match(output,new RegExp('not ok 1 - '+name));assert(output.includes('write_calls')||output.includes('init_off'));}
 return {passed:true,expected:patched?'fixed native state preserved':'old native regression reproduced'};
}
