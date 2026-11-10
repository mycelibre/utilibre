// Finite signed upstream upgrade. These gates do not approve other libraries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const fixture=p=>sha(fs.readFileSync(new URL(p,import.meta.url)));
export function kerberosComparison(v,s){
 return JSON.stringify(Object.hasOwn(s.packages,v.package)?{...v,installed:'reviewed-kerberos-transition'}:v);
}
export function proveKerberos(i,s,b,root,{release=false,scan=null}={}){
 assert.equal(i.schemaVersion,1);assert.equal(i.upstreamVersion,'1.22.3');
 assert.deepEqual(i.advisories,['CVE-2026-112321','CVE-2026-112322','CVE-2026-112323','CVE-2026-119079']);
 assert.equal(i.source.sha256,'fe90af8441ad9fa9b064b8e53077cefb782a96f8a68276b031dc54af1789ff0b');
 assert.equal(i.source.signingKey,'C4493CB739F4A89F9852CBC20CBA08575F8372DF');
 const key=s.evidenceKey||s.key,d=root+'/vendor-debian/'+key;
 assert.equal(b.key,key);assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);
 assert.equal(b.fixtureSha256,fixture('../security-20261109/vendor-debian.mjs'));
 assert.equal(i.fixture.sourceSha256,fixture('kerberos-native.c'));
 assert.equal(i.fixture.binarySha256,sha(fs.readFileSync(root+'/vendor-debian/kerberos-native')));
 assert.deepEqual(b.nativeRows.map(r=>r.imageId),[b.base,b.imageId]);
 assert(b.nativeRows.every(r=>r.passed&&r.checks===15));
 if(key==='krb5-kitchenowl-app'){
  const os=read(d+'/os-only/build.json'),driver=read(root+'/kerberos/kitchenowl/driver.json');
  assert.equal(b.osBuildSha256,sha(fs.readFileSync(d+'/os-only/build.json')));
  assert.equal(os.base,b.base);assert.equal(os.imageId,b.osImageId);
  assert.equal(driver.base,b.osImageId);assert.equal(driver.imageId,b.imageId);
  assert.equal(b.driverProofSha256,sha(fs.readFileSync(root+'/kerberos/kitchenowl/driver.json')));
  assert(driver.passed&&driver.configurationUnchanged&&driver.unrelatedPackagesUnchanged&&driver.unchangedFiles>1000);
  assert.equal(driver.fixtureSha256,fixture('kerberos-driver.py'));
  assert.equal(driver.removedBundledLibraries.length,15);
  assert.equal(driver.newNativePackage.name,'libpq5');assert.equal(driver.newNativePackage.version,'17.11-0+deb13u1');
  assert.equal(driver.inventoryFixtureSha256,fixture('../go-final/verify.py'));
  const app=read(root+'/kerberos/kitchenowl/application.json'),db=read(root+'/kerberos/kitchenowl/database.json');
  assert(app.passed&&app.imageId===b.imageId&&app.nativeAccountIsolation&&app.recipeImportExport&&app.network==='none');
  assert(db.passed&&db.imageId===b.imageId&&db.connect&&db.parameterizedUtf8RoundTrip&&db.commitRollback);
 }
 const c=read(d+'/consumer.json'),linked=read(d+'/linked-consumers.json'),payload=read(d+'/payload.json');
 assert(c.passed&&c.publicApiPreserved&&c.neededPreserved&&c.network==='none');
 assert.equal(c.fixtureSha256,fixture('../security-20261109/check-vendor-abi.py'));
 assert.equal(c.imageId,b.imageId);assert.equal(c.base,b.base);
 assert.deepEqual(c.nativeRows,b.nativeRows);
 assert.equal(c.linkedConsumersSha256,sha(fs.readFileSync(d+'/linked-consumers.json')));
 assert(linked.passed&&linked.imageId===b.imageId&&linked.elfFiles.length>100);
 assert.deepEqual(linked.undefinedReferences,[]);assert.deepEqual(linked.symbolLiterals,[]);
 const allowed=new Set(['krb5int_utf8_next@@krb5support_0_MIT','gss_krb5int_unseal_token_v3@@gssapi_krb5_2_MIT']);
 assert(c.removedPrivateSymbols.every(x=>allowed.has(x)));
 for(const path of new Set(c.abi.map(r=>r.path))){
  const [old,next]=c.abi.filter(r=>r.path===path);assert.equal(old.imageId,b.base);assert.equal(next.imageId,b.imageId);
  assert.deepEqual(old.needed,next.needed);
  assert(old.symbols.filter(v=>!next.symbols.includes(v)).every(v=>allowed.has(v)));
 }
 assert(payload.passed&&payload.imageId===b.imageId&&payload.base===b.base&&payload.metadataPreserved);
 assert.equal(payload.fixtureSha256,fixture('kerberos-payload.py'));
 assert.deepEqual(payload.rows.map(r=>r.package),Object.keys(s.packages));
 for(const r of payload.rows){
  const pin=i.packages[s.packages[r.package].package];
  assert.equal(r.archiveSha256,pin.sha256);assert.equal(r.version,pin.version);assert(r.runtimePayloadExact&&r.files.length>2);
  assert.equal(pin.version,'1.22.3-0+utilibre1~deb'+(s.suite==='bookworm'?'12':'13')+'u1');
  assert.equal(sha(fs.readFileSync(root+'/debian-acquisition/'+pin.file)),pin.sha256);
  assert(r.retainedDocumentation.every(f=>[ `/usr/share/doc/${r.package}/changelog.Debian.gz`,`/usr/share/lintian/overrides/${r.package}`].includes(f.path)));
 }
 const source=root+'/kerberos/source/';assert.equal(sha(fs.readFileSync(source+'krb5-1.22.3.tar.gz')),i.source.sha256);
 assert(fs.readFileSync(source+'gpgv-verification.txt','utf8').includes('VALIDSIG '+i.source.signingKey));
 const output=root+'/kerberos/'+s.suite+'/output/';
 for(const [name,hash]of Object.entries(i.buildEvidence[s.suite]))assert.equal(sha(fs.readFileSync(output+name)),hash);
 const realm=read(output+'realm.json');
 assert(realm.passed&&realm.upstream==='1.22.3'&&realm.ticketAcquired&&realm.serviceTicketAcquired&&realm.authenticatedGssExchange&&realm.spnegoExchange&&realm.ticketDestroyed&&!realm.vulnerabilityReproduction);
 if(key==='krb5-gathio-postgres'){
  const db=read(d+'/database.json');assert(db.passed&&db.imageId===b.imageId&&db.nativeDumpRestore&&db.documentdbTypedDataAndRoleIsolation&&db.gdal&&db.network==='none');
 }
 if(key==='krb5-galene-turn-turn'){
  const relay=read(d+'/relay.json');assert(relay.passed&&relay.image===b.imageId&&relay.checks.length===7);
 }
 if(release){
  assert.equal(s.approval,'approved');assert(scan?.passed&&scan.primarySourceFixVerified&&scan.newHighCritical===0);
  assert.equal(scan.imageId,b.imageId);assert.equal(scan.base,b.base);assert.deepEqual(scan.advisories,i.advisories);
 }
 return true;
}
