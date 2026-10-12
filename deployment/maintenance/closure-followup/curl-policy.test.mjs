import test from 'node:test';import assert from 'node:assert/strict';
import {curlSuites,allowedCurlFeatureChanges,curlFixedUpstream} from './curl-policy.mjs';
import {execFileSync} from 'node:child_process';
test('primary curl fixed versions preserve Debian RC ordering and reject unknown spellings',()=>{
 for(const version of ['8.21.0~rc3-1','8.22.0~rc2-1','1:8.22.0-1','8.12.0+git20250209.89ed161+ds-1']){
  const upstream=curlFixedUpstream(version);
  execFileSync('dpkg',['--compare-versions','8.22.0','ge',upstream]);
 }
 assert.equal(curlFixedUpstream('8.23.0~rc1-1'),'8.23.0~rc1');
 assert.throws(()=>execFileSync('dpkg',['--compare-versions','8.22.0','ge',curlFixedUpstream('8.23.0~rc1-1')]));
 assert.equal(curlFixedUpstream('8.12.0+git20250209.89ed161+ds-1'),'8.12.0+git20250209.89ed161+ds');
 assert.throws(()=>execFileSync('dpkg',['--compare-versions','8.12.0','ge',curlFixedUpstream('8.12.0+git20250209.89ed161+ds-1')]));
 for(const value of ['',null,'0','8.22.0+unknown-1','8.22.0~rc-1','8.22.0-1;true','8.12.0+gitXYZ-1','8.12.0+git20250209.89ed161+unknown-1'])assert.throws(()=>curlFixedUpstream(value));
});
test('both independently completed native suites are required',()=>{
 const one='TESTDONE: 1800 tests out of 1800 reported OK: 100%\n';
 assert.equal(curlSuites(one+one).length,2);
 for(const log of ['',one,one+'TESTDONE: 1799 tests out of 1800 reported OK: 99%',one+one+'TESTFAIL: 1587',one+one+one])assert.throws(()=>curlSuites(log));
});
test('only documented upstream RTMP/TLS-SRP removal is allowed',()=>{
 const before='Protocols: http https smb smbs rtmp\nFeatures: HTTP2 HTTP3 SSL NTLM TLS-SRP';
 assert.deepEqual(allowedCurlFeatureChanges(before,'Protocols: http https smb smbs\nFeatures: HTTP2 HTTP3 SSL NTLM').flatMap(x=>x.removed),['rtmp','TLS-SRP']);
 assert.throws(()=>allowedCurlFeatureChanges(before,'Protocols: http https\nFeatures: HTTP2 SSL'));
 assert.throws(()=>allowedCurlFeatureChanges(before,'unexpected successful shell output'));
});
