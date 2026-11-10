import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/security-20261109/xnet';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const completedCheckers={safetwitch:'c2fa64e01d5de17a9c719cf39975f157346da40e',galene:'c2fa64e01d5de17a9c719cf39975f157346da40e',gothub:'9c13c74ee95db4039b15c3b4be6323c8379fa98a',mezzo:'807cfe54e3c181d543b8fc074bbb55fd225555dd',anubis:'aa6bb5e5c1fda827efe478e2e02ec81e242e3b11'};
export function validateOAuthNative(r,image){
 assert.equal(r.imageId,image);
 for(const f of ['passed','nativeDiscoveryAuthorizationCodePkceAndSignedIdToken','authenticatedCookieAndIdentityHeader','invalidCsrfRejected','anonymousDeniedAndLogoutCleared','onlyLoopbackIssuer','networkIsolated'])assert.equal(r[f],true,f);
 return true;
}
export function validateFollowup(s,original,b,n,scan,dependencies){
 assert(['safetwitch','galene','gothub','mezzo','anubis','oauth2-proxy'].includes(s.key)&&s.mode==='binary-followup'&&s.approval==='approved');
 if(s.checkRevision){assert(completedCheckers[s.key]);assert.equal(s.checkRevision,completedCheckers[s.key]);}
 assert(b.passed&&b.sourceUnchanged&&b.configurationUnchanged&&b.allOtherFilesUnchanged);
 assert.equal(b.base,s.base);assert.equal(b.base,original.base);assert.equal(b.imageId,s.imageId);assert.equal(b.candidate,s.candidate);
 assert.deepEqual(b.changedFiles,[original.binary]);assert(b.imageEntries>100);
 assert.deepEqual(b.locks,original.locks);assert.equal(b.compilerVersion,'1.26.10');
 assert(b.moduleChanges.some(r=>r.module==='golang.org/x/net'&&(r.after.startsWith('v0.62.0 ')||(s.key==='oauth2-proxy'&&r.after==='v0.62.0'))));
 assert(b.moduleChanges.every(r=>['golang.org/x/net','golang.org/x/crypto','golang.org/x/sys','golang.org/x/text','golang.org/x/sync','golang.org/x/tools','golang.org/x/term'].includes(r.module)));
 assert(n.passed&&n.productionChanged===false&&n.network==='internal; no upstream requests');
 assert.equal(n.imageId,b.imageId);assert.equal(n.base,b.base);assert.equal(n.adapters.length,s.key==='galene'?2:1);
 assert(scan.passed&&scan.targetedFindingRemoved&&scan.newHighCritical===0);assert.equal(scan.imageId,b.imageId);assert.equal(scan.base,b.base);
 assert.equal(scan.databaseSha256,s.databaseSha256);assert.equal(b.scopeCheckerSha256,s.checkSha256);
 assert.deepEqual(scan.rawEvidence,s.rawEvidence);
 if(['anubis','oauth2-proxy'].includes(s.key)){
  assert(/^[a-f0-9]{64}$/.test(s.builderSha256));
  assert(dependencies.length>100&&!dependencies.some(p=>p.startsWith('golang.org/x/telemetry')));
 }
 // The old OpenPGP module-level attribution may change its version label.
 // Require proof that the application does not import that unmaintained API.
 if(scan.newFindings.length){
  assert.deepEqual(scan.newFindings,[['GO-2026-5932','golang.org/x/crypto','v0.58.0','UNKNOWN']]);
  assert(scan.removedFindings.some(f=>f[0]==='GO-2026-5932'&&f[1]==='golang.org/x/crypto'&&f[2]==='v0.57.0'));
  assert(dependencies.length>100&&!dependencies.some(p=>p.startsWith('golang.org/x/crypto/openpgp')));
 }
 return true;
}
export function proveFollowup(s,{requireRecentCandidate=true}={}){
 const d=root+'/'+s.key,m=read(new URL('./xnet-inputs.json',import.meta.url)),original=m.rows.find(r=>r.key===s.key);
 assert(original);const b=read(d+'/build.json'),n=read(d+'/native.json'),scan=read(d+'/scan-gate.json');
 assert.equal(sha(d+'/native-dependencies.txt'),s.dependenciesSha256);
 validateFollowup(s,original,b,n,scan,fs.readFileSync(d+'/native-dependencies.txt','utf8').trim().split('\n'));
 assert.equal(sha(d+'/'+s.key),b.binarySha256);assert.equal(sha(d+'/source-proof.json'),original.sourceProofSha256);
 for(const f of read(d+'/source-proof.json').sourceFiles)assert.equal(sha(d+'/source/'+f.path),f.sha256);
 for(const [f,h]of Object.entries(original.locks)){assert.equal(sha(d+'/source/'+f),h);assert.equal(sha(new URL('./xnet-locks/'+s.key+'/'+f,import.meta.url)),h);}
 if(s.checkRevision){
  // Completed releases remain bound to the exact committed checker used then.
  // A later checker edit cannot retroactively rewrite their recorded evidence.
  assert(completedCheckers[s.key]);
  assert.equal(s.checkRevision,completedCheckers[s.key]);
  const source=cp.execFileSync('git',['show',s.checkRevision+':deployment/maintenance/security-20261109/xnet-followup.py'],{cwd:new URL('../../../',import.meta.url),timeout:10000,maxBuffer:128*1024});
  assert.equal(createHash('sha256').update(source).digest('hex'),s.checkSha256);
 }else assert.equal(sha(new URL('./xnet-followup.py',import.meta.url)),s.checkSha256);
 assert.equal(sha(new URL('./zlib-check.py',import.meta.url)),b.exporterSha256);
 for(const a of n.adapters){assert.equal(sha(new URL(a.fixture,import.meta.url)),a.fixtureSha256);assert.equal(sha(a.adapter),a.adapterSha256);}
 if(['anubis','oauth2-proxy'].includes(s.key)){
  const builder=s.checkRevision?cp.execFileSync('git',['show',s.checkRevision+':deployment/maintenance/security-20261109/xnet-build.mjs'],{cwd:new URL('../../../',import.meta.url),timeout:10000,maxBuffer:128*1024}):fs.readFileSync(new URL('./xnet-build.mjs',import.meta.url));
  assert.equal(createHash('sha256').update(builder).digest('hex'),s.builderSha256);
  assert.equal(sha(new URL('../go-leaf-final/build-one.sh',import.meta.url)),original.buildRecipeSha256);
 }
 if(s.key==='oauth2-proxy'){
  for(const phase of ['before','after'])validateOAuthNative(read(d+'/'+phase+'/oauth2-proxy-native.json'),phase==='before'?s.base:s.imageId);
  assert.equal(sha(d+'/jose-v3-jwk.go'),original.joseV3Sha256);
  const vendor=fs.readFileSync(d+'/oauth2-proxy-vendor-modules.txt','utf8');assert(vendor.includes('# github.com/go-jose/go-jose/v3 v3.0.5\n')&&vendor.includes('# github.com/go-jose/go-jose/v4 v4.1.6\n'));
 }
 if(s.key==='anubis'){
  for(const phase of ['before','after']){const r=read(d+'/'+phase+'-native.json');assert(r.passed&&r.nativeAllowAndDeny&&r.twoIndependentBrowserPowChallenges&&r.authenticatedReload&&r.externalBrowserCalls===0);assert.equal(r.imageId,phase==='before'?s.base:s.imageId);}
  const assets=read(d+'/assets.json');assert(assets.passed&&assets.embeddedAssetsUnchanged.length===2);assert.equal(assets.binarySha256,b.binarySha256);
  assert.equal(sha(new URL('../go-leaf-final/check-assets.py',import.meta.url)),original.assetsFixtureSha256);
  assert.equal(sha(new URL('../go-leaf-final/extract-embed.py',import.meta.url)),original.embedExtractorSha256);
  assert.equal(sha(new URL('../go-leaf-final/anubis-native-policy.yaml',import.meta.url)),original.policySha256);
 }
 for(const [f,h]of Object.entries(s.proofs))assert.equal(sha(d+'/'+f),h);
 for(const phase of ['before','after'])assert.equal(sha(d+'/'+phase+'-scan.json'),s.rawEvidence[phase]);
 const source=read(root+(['gothub','mezzo','anubis','oauth2-proxy'].includes(s.key)?'/published-'+s.key+'-source.json':'/published-followup-source.json'));assert(source.passed);
 const offer=source.rows.find(r=>r.key===s.key&&r.imageId===b.imageId);assert(offer);assert.equal(sha('/opt/utilibre/toolbox-public/'+offer.archive),offer.sha256);
 // Activation always uses the default freshness gate. Read-only review of a
 // retained patch may reuse immutable receipts alongside a fresh fleet scan.
 if(requireRecentCandidate){
  assert(Date.now()-Date.parse(b.date)<86400000&&Date.now()-Date.parse(scan.date)<86400000);
  assert(Date.now()-Date.parse(s.advisoryUpdatedAt)<48*3600000);
 }
 return {s,b,scan:{passed:true,base:s.base,imageId:s.imageId,remainingHigh:scan.remainingCounts.HIGH||0,remainingCritical:scan.remainingCounts.CRITICAL||0}};
}
