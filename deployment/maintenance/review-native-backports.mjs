// Explicit local backports only. Prepare an expiring review, never apply it.
// Raw scanner evidence and every other CVE/package finding remain unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateDecision} from './triage.mjs';

const root='/var/lib/utilibre-maintenance/';
const xmlVersion='2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1';
const bookVersion='2.9.14+dfsg-1.3~deb12u6+utilibre1';
const sqliteVersion='3.40.1-2+deb12u2+utilibre1';
const xmlHash='ac980c0afed237e5f14a6749a9e57af772d388d009a93caf633c20db40840947';
const bookHash='f3603d5303e6703a7604204aa318ff6702cb42aa4d9c8114e9debd1e4192c0e2';
const sqliteHash='f4b32d83fadc4787cabff8a115e4aca3ac808efe9d9521b9630f1d8815f129b5';
const library='/usr/lib/x86_64-linux-gnu/';
const xmlRoot='xml-final-20261011/',sqliteRoot='sqlite-final-20261011/';
const targets=[
 ['freshrss','6427b824cad55b156574dec0bab5b37db665f804269d06adf9f05375b955d0e8',['utilibre-services-freshrss-1']],
 ['kitchenowl','333bc47ed7d79a7740b3bfe99166a11fab1a497a2cfbb4849475061de59f0d98',['utilibre-kitchenowl-app-1']],
 ['authentik','183de8426796745506c5e14c45d413df25c40480bbcaa430372937bf0e5dfd1d',['utilibre-identity-server-1','utilibre-identity-worker-1']],
 ['rssbridge','89dd1b4e0ffa64583a1429825f5e797d1cacf4ea79d2090da3a73edbc49907cd',['utilibre-community-rssbridge-1']],
 ['gathio','95ee3337a58fff0a0430840754b91c547f57bfa806e71b8721d5815bf6985a3b',['utilibre-gathio-postgres-1']],
 ['penpot-backend','0e6eb47f25fde0310f7b318144bf78c2bc068fb4f3a4f0edcaaebcc604eeae95',['utilibre-expanded-penpot-backend-1']],
 ['penpot-exporter','a3102615b1349f141d787dd806bc3464a49d223a5336471b3e09b1bc74a6d8da',['utilibre-expanded-penpot-exporter-1']],
];
export const specs=targets.map(([kind,id,containers])=>({kind,id:'CVE-2026-6653',artifact:'sha256:'+id,containers,
 version:['rssbridge','gathio'].includes(kind)?bookVersion:xmlVersion,
 packages:kind==='gathio'?['libxml2','libxml2-dev']:['libxml2'],
 library:library+'libxml2.so.2.9.14',sha:['rssbridge','gathio'].includes(kind)?bookHash:xmlHash,
 privateLibrary:kind.startsWith('penpot-')?'/opt/imagick/lib/deps/libxml2.so.2':null,
}));
specs.push({kind:'host',id:'CVE-2026-6653',artifact:'host-dpkg',containers:[],version:xmlVersion,packages:['libxml2'],library:library+'libxml2.so.2.9.14',sha:xmlHash});
for(const [kind,id,containers] of [['kuma','9d1c2c3e9cc58cdf6c130af004d54fd459ecee5ab834aca663dd1a886316419e',['utilibre-community-uptime-kuma-1']],...targets.filter(x=>['rssbridge','gathio'].includes(x[0]))])
 specs.push({kind,id:'CVE-2025-7458',artifact:'sha256:'+id,containers,version:sqliteVersion,packages:kind==='kuma'?['libsqlite3-0','sqlite3']:['libsqlite3-0'],library:library+'libsqlite3.so.0.8.6',sha:sqliteHash});
// The later installer-only overlay must prove both its own release and its
// exact predecessor's genuine backport. It cannot inherit a version waiver.
for(const spec of specs.filter(s=>s.kind==='kuma')){
 spec.predecessor=spec.artifact;
 spec.artifact='sha256:48efff64a859d5e40ce9d4d57d8d4416df8cf73a70f577b1c6cdfb6d0d0bd898';
}
for(const spec of specs.filter(s=>s.kind==='freshrss')){
 spec.predecessor=spec.artifact;
 spec.artifact='sha256:a452bf8c4922fcd329dcaa13b83edfe25fe3b706c494e7ce37d6b2da43288d06';
}

export function matches(item,spec){
 return item.status==='needs-review'&&item.type==='debian'&&item.id===spec.id&&item.artifact===spec.artifact&&
  item.scope===(spec.kind==='host'?'host-os':'runtime-image')&&item.installed===spec.version&&spec.packages.includes(item.package)&&
  Array.isArray(item.containers)&&(spec.kind==='host'?item.containers.length===0:item.containers.length>0&&item.containers.every(n=>spec.containers.includes(n)));
}
export function freshScan(queue,scan,now=Date.now()){
 const completed=Date.parse(scan.completedAt);
 assert(Number.isFinite(completed)&&completed<=now+300000&&completed>now-86400000,'Fresh completed scanner evidence required');
 assert.equal(queue.scanDate,scan.completedAt,'Queue must come from this exact scan');
}
const read=path=>JSON.parse(fs.readFileSync(root+path));
const sha=path=>createHash('sha256').update(fs.readFileSync(path)).digest('hex');
function sameFile(path,hash){assert.equal(sha(root+path),hash,'Retained source/package artifact hash mismatch');}
export function validateRelease(report,spec){
 assert.equal(report.status,'passed');
 for(const name of spec.containers){const row=report.rows?.find(r=>r.name===name);assert(row,'Missing exact-role release receipt');assert.equal(row.status,'passed');assert.equal(row.newImage,spec.artifact);}
 assert(Number.isFinite(Date.parse(report.completedAt)),'Completed release required');
 return Date.parse(report.completedAt);
}
function evidence(spec){
 const receipts=[];
 const record=p=>{receipts.push(p);return read(p);};
 let released;
 if(spec.kind==='host'){
  const r=record(xmlRoot+'host-release.json'),n=record(xmlRoot+'host-live-native.json');
  assert.equal(r.status,'passed');assert.equal(r.newVersion,spec.version);assert.equal(r.liveLibrarySha256,spec.sha);assert.equal(r.nativeInstalledChecks,true);
  assert.equal(n.status,'passed');assert.equal(n.testedInstalledPackage,true);assert.equal(n.librarySha256,spec.sha);assert.equal(n.nativeOldNewHeaderParsers,true);
  released=Date.parse(r.completedAt);
 }else if(spec.kind.startsWith('penpot-')){
  released=validateRelease(record('native-final/penpot-release.json'),spec);
  const n=record('native-final/penpot-libxml.json'),m=n.media?.find(x=>x.imageId===spec.artifact);
  assert.equal(n.status,'passed');assert.equal(n.deployed,true);assert.equal(n.fullApplicationGate?.status,'passed');
  for(const key of ['applicationAndRuntimeUnchanged','oldAndNewHeadersNativeAllocatorsPassed','systemAndPrivateLibraryEqual','librsvgPassed','rasterPixelEquivalence'])assert.equal(m?.[key],true,key);
 }else if(spec.kind==='kuma'){
  validateRelease(record(sqliteRoot+'release.json'),{...spec,artifact:spec.predecessor});
  const overlay=record('npm10-final-20261011/release.json');released=validateRelease({...overlay,rows:overlay.groups},spec);
  const n=record('npm10-final-20261011/native.json');assert.equal(n.status,'passed');
  const row=n.rows.find(r=>r.key==='kuma-npm10'&&r.imageId===spec.artifact);
  assert(row?.applicationBytesUnchanged&&row?.nativeFreshSetupAndLogin);
 }else if(spec.kind==='freshrss'){
  validateRelease(record(xmlRoot+'release.json'),{...spec,artifact:spec.predecessor});
  const original=record(xmlRoot+'freshrss/native.json');assert.equal(original.imageId,spec.predecessor);assert.equal(original.passed,true);assert.equal(original.librarySha256,spec.sha);
  const overlay=record('vendor-leaves-final-20261011/release.json');
  released=validateRelease({...overlay,rows:overlay.groups.flatMap(g=>g.rows.map(r=>({...r,status:g.status})))},spec);
  const stage=record('vendor-leaves-final-20261011/pcre-stage.json'),row=stage.rows.find(r=>r.kind==='freshrss');
  assert.equal(stage.status,'passed');assert.equal(row.base,spec.predecessor);assert.equal(row.candidateId,spec.artifact);assert.equal(row.nativeConfigurationUnchanged,true);assert.match(row.applicationSha256,/^[a-f0-9]{64}$/);
  const native=record('vendor-leaves-final-20261011/pcre-native.json');assert.equal(native.status,'passed');assert(native.rows.some(r=>r.kind==='freshrss'&&r.imageId===spec.artifact&&r.passed));
 }
 else {
  released=validateRelease(record(xmlRoot+'release.json'),spec);
  const n=record(xmlRoot+spec.kind+'/native.json');assert.equal(n.imageId,spec.artifact);assert.equal(n.passed,true);
  if(spec.id==='CVE-2026-6653'){assert.equal(n.version,spec.version);assert.equal(n.librarySha256,spec.sha);}
  if(spec.kind==='gathio'){const n=record(xmlRoot+'gathio/database.json');assert.equal(n.imageId,spec.artifact);for(const key of ['passed','nativePostgresXml','nativeDumpRestore'])assert.equal(n[key],true);}
 }
 if(spec.id==='CVE-2025-7458'){
  const checks=record(sqliteRoot+'checks.json');assert.equal(checks.status,'passed');
  const row=checks.rows.find(r=>r.kind===(spec.kind==='gathio'?'documentdb':spec.kind));
  for(const k of ['sharedLibraryFiveRegressions','nativeSqliteBackupRestore','sonameAndExportsUnchanged','nativeConfigurationUnchanged'])assert.equal(row?.[k],true,k);
  assert.equal(row.status,'passed');assert.equal(row.librarySha256,spec.sha);
  sameFile(sqliteRoot+'libsqlite3-0_'+sqliteVersion+'_amd64.deb','b15fa9c056fbf9143c1500c44f9c9fd1548faa1b63bc3b786334bac45c7f820f');
  sameFile(sqliteRoot+'applied.patch','e1a48c50ad0129123a75d6a050561bd2a5c48c74c52aaa044eb3c7b15c229b87');
  if(spec.kind==='kuma')sameFile(sqliteRoot+'sqlite3_'+sqliteVersion+'_amd64.deb','857f3ae8ab9b3fbe5871f87622c03d87a1ff54c30cd559520633aedda942f054');
 }else{
  sameFile('native-final/libxml2-CVE-2026-6653.patch','6c2b8a7b6fa470efcb1854e5c73bd7e1ae1663d8b111e27ce9232bbc1fe44f54');
  const book=spec.version===bookVersion;
  sameFile((book?xmlRoot+'bookworm/':'native-final/libxml2-output/')+'libxml2_'+spec.version+'_amd64.deb',book?'7e62da4517ca8becfe040fd5085b33529daa10f52d29fa401c1c921ee9ebc2b0':'b2ff4643de60160f0d80fbe617ce2aa6b92b9fa22d3f52cf02ab8cad7eb841e4');
  if(spec.kind==='gathio')sameFile(xmlRoot+'bookworm/libxml2-dev_'+bookVersion+'_amd64.deb','fb0b2043b232586a60f7f1954ccbf0375deba2cf8805fc71122f718b182b24f4');
 }
 assert(Number.isFinite(released),'Completed release timestamp required');
 return {released,receipts};
}
export function validateObserved(spec,item,observed){
 assert(matches(item,spec),'Not an exact reviewed CVE/package/image');
 assert.equal(observed.version,spec.version);assert.equal(observed.librarySha256,spec.sha);
 if(spec.privateLibrary)assert.equal(observed.privateLibrarySha256,spec.sha,'Penpot private duplicate must also be patched');
 if(item.package==='sqlite3')assert.equal(observed.extraSha256,'78fbb4b1bc1fdcb0e3f321ffbcc3628ebff0a961d3c56d4d623f8daef59886c8');
 if(item.package==='libxml2-dev')assert.equal(observed.extraSha256,'fd934510ea5a3e55896e56053bbe77bec2fbf881783eae3ca653d510669f37da');
}
export function run(){
 process.umask(0o077);
 const queue=read('security-queue.json'),scan=read('security.json');freshScan(queue,scan);
 const decisions=[],skipped=[],proofs=[];
 const command=(p,args)=>execFileSync(p,args,{encoding:'utf8',timeout:10000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']}).trim();
 for(const item of queue.items){
  const spec=specs.find(s=>matches(item,s));if(!spec)continue;
  try{
   const proof=evidence(spec);assert(Date.parse(scan.date)>=proof.released,'Scan began before release; re-scan first');
   const host=spec.kind==='host';assert.equal(host?scan.host.status:scan.images.find(x=>x.id===spec.artifact)?.status,'checked');
   for(const name of host?[null]:item.containers){
    if(!host){const x=JSON.parse(command('docker',['inspect',name]))[0];assert.equal(x.Image,spec.artifact);assert.equal(x.State.Running,true);}
    const cmd=(p,a)=>host?command(p,a):command('docker',['exec',name,p,...a]);
    const hash=p=>cmd('sha256sum',[p]).split(/\s+/)[0];
    const observed={version:cmd('dpkg-query',['-W','-f=${Version}',item.package]),librarySha256:hash(spec.library)};
    if(spec.privateLibrary)observed.privateLibrarySha256=hash(spec.privateLibrary);
    if(item.package==='sqlite3')observed.extraSha256=hash('/usr/bin/sqlite3');
    if(item.package==='libxml2-dev')observed.extraSha256=hash(library+'libxml2.a');
    validateObserved(spec,item,observed);
   }
   const source=spec.id==='CVE-2025-7458'?'SQLite upstream b816ca9994e03a8bc829b49452b8158a731e81a9 (four-line DISTINCT fix)':'libxml2 upstream 463bbeeca1805b5c4828f50d0fefc4eebaf620df via official Ubuntu 2.9.14 backport';
   const reason=`Patched local Debian package, not a vendor version exemption: ${source}. Exact ${item.artifact}, ${item.package} ${spec.version}, native library SHA256 ${spec.sha}${spec.privateLibrary?' and matching Penpot private duplicate':''} verified live. Native regression/consumer and completed release receipts: ${proof.receipts.join(', ')}. Status mitigated represents an applied source backport because the review schema has no patched status. Only this CVE/finding is reviewed; other advisories and raw scanner findings remain visible. See deployment/maintenance/${spec.id==='CVE-2025-7458'?'sqlite-final':'xml-final'}/README.md.`;
   decisions.push(validateDecision({key:item.key,status:'mitigated',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
   proofs.push({key:item.key,artifact:item.artifact,package:item.package,librarySha256:spec.sha,receipts:proof.receipts.map(path=>({path:root+path,sha256:sha(root+path)}))});
  }catch(error){skipped.push({key:item.key,artifact:item.artifact,package:item.package,error:error.code||error.message.slice(0,160)});}
 }
 fs.writeFileSync(root+'native-backport-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false,report:root+'native-backport-review.json'}));
 return {decisions,skipped};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)run();
