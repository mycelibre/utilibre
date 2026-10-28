import assert from 'node:assert/strict';
import test from 'node:test';
import {archivePins,authenticateArchive,validatePayload,validatePackageStatus} from './dhi-proof.mjs';
import {freshScan} from '../review-native-backports.mjs';
const packageName='openssl',version='3.5.7-1~deb13u3+dhi0',hash=archivePins[packageName];
const index=`Package: ${packageName}\nVersion: ${version}\nSHA256: ${hash}\n`;
test('exact authenticated package/version/hash accepted',()=>authenticateArchive(index,packageName,version,hash));
test('different package stanza cannot authenticate archive',()=>assert.throws(()=>authenticateArchive(index.replace('Package: openssl','Package: another'),packageName,version,hash)));
test('different version cannot authenticate archive',()=>assert.throws(()=>authenticateArchive(index,packageName,'3.5.8',hash)));
test('archive corruption cannot authenticate',()=>assert.throws(()=>authenticateArchive(index,packageName,version,'0'.repeat(64))));
test('distroless package status requires one exact package and version',()=>{
 validatePackageStatus(index,packageName,version);
 for(const text of [index.replace(version,'3.5.7-1~deb13u2+dhi0'),index+'Version: '+version+'\n',index.replace('openssl','another')])assert.throws(()=>validatePackageStatus(text,packageName,version));
});
const manifest=[{path:'/usr/lib/library.so',type:'file',sha256:'a'.repeat(64)},{path:'/usr/lib/library-link.so',type:'symlink',target:'library.so'}];
test('complete live regular-file and symlink proof accepted',()=>assert.match(validatePayload(manifest,structuredClone(manifest)),/^[a-f0-9]{64}$/));
test('changed live bytes or bind-mounted file refused',()=>assert.throws(()=>validatePayload(manifest,[{...manifest[0],sha256:'b'.repeat(64)},manifest[1]])));
test('redirected runtime symlink refused',()=>assert.throws(()=>validatePayload(manifest,[manifest[0],{...manifest[1],target:'/tmp/old-library.so'}])));
test('missing file and empty proofs refused',()=>{assert.throws(()=>validatePayload(manifest,manifest.slice(1)));assert.throws(()=>validatePayload([],[]));});
test('mismatched and stale scan pairs refused',()=>{
 const now=Date.now(),date=new Date(now-1000).toISOString();freshScan({scanDate:date},{completedAt:date},now);
 assert.throws(()=>freshScan({scanDate:'different'},{completedAt:date},now));
 const stale=new Date(now-2*86400000).toISOString();assert.throws(()=>freshScan({scanDate:stale},{completedAt:stale},now));
});
