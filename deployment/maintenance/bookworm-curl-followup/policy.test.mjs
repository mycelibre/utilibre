import {test} from 'node:test';import assert from 'node:assert/strict';
import {featureChanges,libraryChanges,exportedSymbols} from './policy.mjs';
const cliBefore='Protocols: http https smb rtmp\nFeatures: SSL HTTP2 NTLM NTLM_WB TLS-SRP';
const cliAfter='Protocols: http https smb\nFeatures: SSL HTTP2 NTLM';
const fixture=(version,mask,protocols)=>[`CURL_VERSION=${version}`,`CURL_FEATURE_MASK=${mask}`,`CURL_PROTOCOLS=${protocols}`];
const before=fixture('7.88.1',(1<<2)|(1<<4)|(1<<14)|(1<<15)|(1<<16),'http https smb rtmp');
const after=fixture('8.22.0',(1<<2)|(1<<4)|(1<<16),'http https smb');
test('native Bookworm legacy removals are explicit, not general feature suppression',()=>{
 assert.deepEqual(featureChanges(cliBefore,cliAfter).map(r=>r.removed),[['rtmp'],['NTLM_WB','TLS-SRP']]);
 assert.deepEqual(libraryChanges(before,after).removedProtocols,['rtmp']);
});
test('reject ordinary NTLM, HTTPS or HTTP2 capability loss',()=>{
 assert.throws(()=>featureChanges(cliBefore,cliAfter.replace(' HTTP2','')));
 assert.throws(()=>featureChanges(cliBefore,cliAfter.replace('https ','')));
 assert.throws(()=>libraryChanges(before,fixture('8.22.0',(1<<2)|(1<<16),'http https smb')));
 assert.throws(()=>libraryChanges(before,fixture('8.22.0',(1<<2)|(1<<4),'http https smb')));
});
test('reject unverified release, absent and malformed native inventories',()=>{
 assert.throws(()=>libraryChanges(before,fixture('8.21.0',65556,'http https smb')));
 assert.throws(()=>libraryChanges(before,fixture('8.22.0','NaN','http https smb')));
 assert.throws(()=>libraryChanges(before,[]));
 assert.throws(()=>featureChanges(cliBefore,'Protocols: http https smb'));
});
test('ABI gate excludes only the empty HIDDEN linker version marker',()=>{
 const symbols=exportedSymbols('1: 0000000000000000 0 OBJECT GLOBAL DEFAULT ABS HIDDEN\n2: 0000000000000000 0 OBJECT GLOBAL DEFAULT ABS CURL_GNUTLS_3\n3: 0000000000000020 4 OBJECT GLOBAL DEFAULT 13 HIDDEN\n4: 0000000000000030 30 FUNC GLOBAL DEFAULT 13 curl_easy_init@@CURL_GNUTLS_3\n5: 0000000000000040 20 FUNC GLOBAL DEFAULT 13 internal@HIDDEN');
 assert.deepEqual([...symbols],['OBJECT:CURL_GNUTLS_3','OBJECT:HIDDEN','FUNC:curl_easy_init@CURL_GNUTLS_3','FUNC:internal@HIDDEN']);
 assert.equal(exportedSymbols('1: 0000000000000000 0 OBJECT GLOBAL DEFAULT ABS HIDDEN').size,0);
});

test('8.23 native policy permits SMB retirement only, preserving ordinary capabilities',()=>{
 const fresh=fixture('8.23.0',(1<<2)|(1<<4)|(1<<16),'http https');
 assert.deepEqual(libraryChanges(before,fresh,'8.23.0').removedProtocols,['smb','rtmp']);
 assert.throws(()=>libraryChanges(before,fresh));
 assert.throws(()=>libraryChanges(before,fresh,'8.24.0'));
 assert.throws(()=>libraryChanges(before,fixture('8.23.0',(1<<2)|(1<<4),'http https'),'8.23.0'));
 assert.throws(()=>featureChanges(cliBefore,cliAfter.replace(' HTTP2',''),'8.23.0'));
});
