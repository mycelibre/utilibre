import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {checkerIdentity} from '../releases-20261111/recorded-checkers.mjs';
const root='/var/lib/utilibre-maintenance/security-20261109/xnet-caddy';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const keys=['caddy-wishlist','caddy-newsletters-web','caddy-newsletters-mail-jobs'];
export function validateCaddy(s,b,n,checks,app,scan,dependencies){
 assert(keys.includes(s.key)&&s.approval==='approved');
 assert(b.passed&&b.configurationUnchanged&&b.allUnrelatedImageFilesUnchanged);
 assert.equal(b.base,s.base);assert.equal(b.imageId,s.imageId);assert.equal(b.candidate,s.candidate);
 assert.equal(b.binarySha256,s.binarySha256);assert.equal(b.scopeCheckerSha256,s.checkSha256);
 assert.deepEqual(b.changedFiles,[s.binary.replace(/^\//,''),...['build-info.txt','go.mod','go.sum','modules.txt'].map(f=>'usr/local/share/utilibre-caddy-security/'+f)].sort());
 assert(n.passed&&n.productionChanged===false&&n.network==='none; isolated internal application fixtures');
 assert.equal(n.adapters.length,3);
 assert.equal(checks.status,'passed');assert.equal(checks.rows.length,3);
 const row=checks.rows.find(r=>r.key===s.key);assert(row);
 assert.equal(row.candidateId,b.imageId);assert.equal(row.base,b.base);
 for(const field of ['nativeProxy','gzip','sse','http2','configUnchanged','applicationUnchanged','originalChecksumsMatchOfficialArtifact'])assert.equal(row[field],true);
 assert.equal(row.compiler,'go1.26.10');
 assert.deepEqual(app.externalBrowserOrigins,[]);
 if(s.key==='caddy-wishlist'){
  assert.equal(app.imageId,b.imageId);assert(app.passed);
  for(const field of ['nativeBlankDatabaseStartup','typescriptTransform','nativeAccountCreated','listCreated','itemCreated','reloadPersistence','anonymousListDenied'])assert.equal(app[field],true);
  assert.deepEqual(app.pageErrors,[]);assert.equal(app.network,'internal; isolated synthetic browser');
 }else{
  assert.equal(app.status,'passed');assert.equal(s.key==='caddy-newsletters-web'?app.webImage:app.smtpImage,b.imageId);
  for(const field of ['nativeMigration','browserFeedCreate','isolatedSmtpAccepted','atomContents','nativeDelete'])assert.equal(app[field],true);
  assert.equal(app.backendEgress,'internal bridge, no external route');
 }
 assert(scan.passed&&scan.targetedFindingRemoved&&scan.newHighCritical===0);
 assert.equal(scan.base,b.base);assert.equal(scan.imageId,b.imageId);
 assert.equal(scan.databaseSha256,s.databaseSha256);assert.deepEqual(scan.rawEvidence,s.rawEvidence);
 assert(scan.removedFindings.some(f=>f[0]==='CVE-2026-78661'&&f[1]==='golang.org/x/net'&&f[2]==='v0.60.0'));
 // x/crypto's retained module-level OpenPGP record is not an imported API.
 // This scoped attribution does not suppress it from the scanner or queue.
 if(scan.newFindings.length){
  assert.deepEqual(scan.newFindings,[['GO-2026-5932','golang.org/x/crypto','v0.58.0','UNKNOWN']]);
  assert(scan.removedFindings.some(f=>f[0]==='GO-2026-5932'&&f[1]==='golang.org/x/crypto'&&f[2]==='v0.57.0'));
  assert(dependencies.length>100&&!dependencies.some(p=>p.startsWith('golang.org/x/crypto/openpgp')));
 }
 return true;
}
export function proveCaddy(s,{requireRecentCandidate=true}={}){
 assert.equal(typeof requireRecentCandidate,'boolean');
 const inputs=read(new URL('./xnet-caddy-inputs.json',import.meta.url));
 const original=inputs.rows.find(r=>r.key===s.key);assert(original);
 assert.equal(original.base,s.base);assert.equal(original.candidate,s.candidate);assert.equal(original.binary,s.binary);
 assert.deepEqual(original.containers,s.containers);
 const b=read(root+'/'+s.key+'/build.json'),n=read(root+'/native.json'),checks=read(root+'/checks.json');
 const app=read(root+(s.key==='caddy-wishlist'?'/wishlist-stage.json':'/newsletters-stage.json'));
 const scan=read(root+'/'+s.key+'/scan-gate.json');
 const dependencies=fs.readFileSync(root+'/artifact/notices/linked-packages.txt','utf8').trim().split('\n');
 validateCaddy(s,b,n,checks,app,scan,dependencies);
 assert.equal(sha(new URL('./xnet-caddy.py',import.meta.url)),s.checkSha256);
 assert.equal(checkerIdentity('deployment/maintenance/security-20261109/zlib-check.py',b.exporterSha256,b.imageId),b.exporterSha256);
 assert.equal(sha(root+'/artifact/caddy'),s.binarySha256);
 assert.equal(sha(root+'/input/source.tar.gz'),inputs.sourceArchiveSha256);
 assert.equal(sha(root+'/source-scope-verified.json'),inputs.sourceScopeSha256);
 assert.equal(sha(root+'/compile-prepared.sh'),inputs.adapterSha256);
 assert.equal(sha(new URL('../caddy-security/compile.sh',import.meta.url)),inputs.nativeRecipeSha256);
 for(const [file,hash]of Object.entries(s.proofs)){
  assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));
  assert.equal(sha(root+'/'+file),hash);
 }
 for(const [file,hash]of Object.entries(inputs.fixtures))assert.equal(sha(new URL('../../../'+file,import.meta.url)),hash);
 for(const a of n.adapters){
  assert.equal(a.originalSha256,inputs.fixtures[a.fixture]);
  assert.equal(sha(root+'/'+path.basename(a.fixture)),a.adapterSha256);
 }
 for(const [file,hash]of Object.entries(read(root+'/source-scope-verified.json').after))assert.equal(sha(root+'/source/'+file),hash);
 assert.equal(sha(root+'/source/go.mod'),inputs.goModSha256);assert.equal(sha(root+'/source/go.sum'),inputs.goSumSha256);
 for(const [file,hash]of [['go.mod',inputs.goModSha256],['go.sum',inputs.goSumSha256]])assert.equal(sha(new URL('./xnet-locks/caddy/'+file,import.meta.url)),hash);
 for(const phase of ['before','after'])assert.equal(sha(root+'/'+s.key+'/'+phase+'-scan.json'),s.rawEvidence[phase]);
 const source=read(root+'/source-offer.json');assert(source.published&&source.images.includes(b.imageId));
 assert.equal(sha('/opt/utilibre/toolbox-public/'+source.filename),source.sha256);
 if(requireRecentCandidate){
  assert(Date.now()-Date.parse(read(root+'/build.json').date)<86400000&&Date.now()-Date.parse(scan.date)<86400000);
  assert(Date.now()-Date.parse(s.advisoryUpdatedAt)<48*3600000);
 }
 return {s,b,scan};
}
