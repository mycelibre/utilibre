// Prepare only: no deployment, queue/ledger mutation, broad version exclusions,
// external fixture requests or production SQL. Exact findings expire in 7 days.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {freshScan,validateRelease,overlayRows} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
const root='/var/lib/utilibre-maintenance/';
const here=path.dirname(fileURLToPath(import.meta.url));
const sha=data=>createHash('sha256').update(data).digest('hex');
const aomId='sha256:95ee3337a58fff0a0430840754b91c547f57bfa806e71b8721d5815bf6985a3b';
const kumaPrevious='sha256:9d1c2c3e9cc58cdf6c130af004d54fd459ecee5ab834aca663dd1a886316419e';
const kumaNpm='sha256:48efff64a859d5e40ce9d4d57d8d4416df8cf73a70f577b1c6cdfb6d0d0bd898';
const kumaClosure='sha256:3cfe02bf61173af98c85a6e861890a48c7264b0710cc2dd469bb6038a5b1e7d2';
const kumaId='sha256:895a32c84a8c27b87332095cd1a98d44897fe51a65025a00852d8b4ea498fac1';
const turnId='sha256:abdba9b317da98ca9962d33ca4a552f5a8b784a86d996e0adf10575132bff625';
const jwtDeb={deb:'host-final-20261011/python3-jwt_2.15.1-1_all.deb',debSha:'e2bdfe81e1c0c45866e37e1a2f2fd190fcec24f8c5fc083e994733b0f915b1af'};
const turnContainers=['utilibre-galene-turn-turn-1','utilibre-turn-option-turn-1'];
// Debian primary tracker checked 2026-10-12: fixed in PyJWT <=2.15.0;
// scanner is using the older base-distribution package range. Payload must
// still exactly match the signed 2.15.1 artifact and pass native checks.
const jwtFixedIds=['CVE-2026-101917','CVE-2026-101918','CVE-2026-102271','CVE-2026-102272','CVE-2026-102273','CVE-2026-102274','CVE-2026-102275','CVE-2026-48526'];
const mariaServerIds=['CVE-2026-107815','CVE-2026-107818','CVE-2026-107823','CVE-2026-44168','CVE-2026-44171','CVE-2026-48163','CVE-2026-48165'];
export const specs=[
 {kind:'click',artifact:'sha256:a30210737c27fd8a9e0e162e472377ad1692348eee9001e4ccaee4d245a731ca',containers:['utilibre-community-uptime-kuma-1'],package:'python3-click',version:'8.3.3-3',ids:['CVE-2026-7246'],deb:'click-followup-20261012/packages/python3-click_8.3.3-3_all.deb',debSha:'b8ce2b18bb602844e05c67d75cff576a91ca7727af2726175dba84536de04d12'},
 {kind:'aom',artifact:aomId,containers:['utilibre-gathio-postgres-1'],package:'libaom3',version:'3.14.1-1',ids:['CVE-2023-6879','CVE-2023-39616'],deb:'aom-final-20261011/libaom3_3.14.1-1_amd64.deb',debSha:'8f932e686c8a0e3e09ef211b924bac0a43d3d6fd774e0dfbeba9c301aa129fca'},
 {kind:'jwt',artifact:kumaId,containers:['utilibre-community-uptime-kuma-1'],package:'python3-jwt',version:'2.15.1-1',ids:['CVE-2026-102267',...jwtFixedIds],...jwtDeb},
 {kind:'jwt',artifact:'host-dpkg',containers:[],package:'python3-jwt',version:'2.15.1-1',ids:['CVE-2026-102266','CVE-2026-102267',...jwtFixedIds],...jwtDeb},
 {kind:'mariadb',artifact:turnId,containers:turnContainers,package:'libmariadb3',version:'1:11.8.9+ds-4',ids:['CVE-2026-44172','CVE-2026-49261'],deb:'mariadb-client-final-20261011/libmariadb3.deb',debSha:'bed52f526f58a2312a35c728463cc657834da57e942aba2fe38234eab7813e19'},
 {kind:'mariadb',artifact:turnId,containers:turnContainers,package:'mariadb-common',version:'1:11.8.9+ds-4',ids:['CVE-2026-44172','CVE-2026-49261'],deb:'mariadb-client-final-20261011/mariadb-common.deb',debSha:'411a5b285887383d8fe8d2b77f81153876b513dabc10321fa22725bdfd24d1e0'},
];
for(const spec of specs.filter(s=>s.kind==='mariadb'))spec.ids.push(...mariaServerIds);
export function matches(item,spec){
 return item.status==='needs-review'&&item.type==='debian'&&item.scope===(spec.artifact==='host-dpkg'?'host-os':'runtime-image')&&
 item.artifact===spec.artifact&&item.package===spec.package&&item.installed===spec.version&&spec.ids.includes(item.id)&&
 Array.isArray(item.containers)&&item.containers.length===spec.containers.length&&spec.containers.every(n=>item.containers.includes(n));
}
export function verifyPayload(spec,observed,manifest){
 assert.equal(observed.version,spec.version,'Installed package version changed');
 assert.equal(observed.debSha,spec.debSha,'Signed package artifact changed');
 assert(manifest.length>0,'Empty payload cannot establish a fixed package');
 assert.equal(observed.files.length,manifest.length,'Incomplete payload check');
 for(let n=0;n<manifest.length;n++)assert.deepEqual(observed.files[n],manifest[n],'Installed payload differs from signed package');
}
const read=p=>JSON.parse(fs.readFileSync(root+p));
function command(p,args,input){
 try{return execFileSync(p,args,{input,timeout:30000,maxBuffer:32*1024**2,stdio:['pipe','pipe','pipe']});}
 catch{throw Error('Bounded package/native verification failed; no decision issued');}
}
const text=(p,args)=>command(p,args).toString().trim();
const readReceipt=(p,list)=>{const r=read(p);assert.equal(r.status,'passed','Unsuccessful release/native receipt');list.push({path:root+p,sha256:sha(fs.readFileSync(root+p))});return r;};
function receipts(spec,scan){
 if(spec.overlayPredecessor){
  const proofs=receipts(spec.overlayPredecessor,scan),r=readReceipt(spec.overlayReceipt,proofs);
  const rows=overlayRows(r),matched=spec.containers.map(name=>rows.find(r=>r.name===name&&r.oldImage===spec.overlayPredecessor.artifact&&r.newImage===spec.artifact));
  assert(matched.every(Boolean));assert(matched.every(r=>Date.parse(r.completedAt)<=Date.parse(scan.date)));
  // This only establishes deployment lineage; run() still compares every
  // installed package file against its authenticated fixed artifact afresh.
  return proofs;
 }
 const proofs=[];let latest;
 if(spec.kind==='click'){
  const r=readReceipt('click-followup-20261012/release.json',proofs);latest=validateRelease({...r,rows:overlayRows(r)},spec);
  const n=read('click-followup-20261012/native.json'),app=read('click-followup-20261012/application.json'),build=read('click-followup-20261012/build.json');
  assert.equal(build.imageId,spec.artifact);assert.equal(build.packageHash,spec.debSha);assert(build.passed&&build.configurationUnchanged&&build.unrelatedPackagesUnchanged);
  assert.equal(n.imageId,spec.artifact);assert(n.passed&&n.noDelivery&&n.checks.length===7&&n.click==='8.3.3'&&n.apprise==='1.10.0');
  assert.equal(app.imageId,spec.artifact);assert(app.passed&&app.nativeSetupLogin&&app.fictionalDataOnly&&app.noNotificationSent&&app.network==='none');
  for(const p of ['native','application','build'])proofs.push({path:root+'click-followup-20261012/'+p+'.json',sha256:sha(fs.readFileSync(root+'click-followup-20261012/'+p+'.json'))});
 }else if(spec.kind==='aom'){
  const native=readReceipt('aom-final-20261011/checks.json',proofs);
  for(const k of ['actualConsumerRelocationsPassed','installedAvifHeifRoundTrips','postgisGdalNative','documentdbRolesAndDumpRestore'])assert.equal(native[k],true,k);
  assert.equal(native.newLibrarySha256,'67565cdfec66b07bfb2ee79276fe4c25d921ca84d93e4d797512efde5eec4e93');
  const r=readReceipt('xml-final-20261011/release.json',proofs);latest=validateRelease(r,spec);
 }else if(spec.kind==='mariadb'){
  const r=readReceipt('mariadb-client-final-20261011/release.json',proofs);latest=validateRelease(r,spec);
  assert.equal(r.stage.passed,true);assert.equal(r.stage.image,spec.artifact);
 }else if(spec.artifact==='host-dpkg'){
  const r=readReceipt('host-final-20261011/jwt-release.json',proofs);assert.equal(r.candidate,spec.version);
  assert.equal(r.live.passed,true);assert.equal(r.live.expiredWrongKeyAlgorithmAndEmptyKeyDenied,true);latest=Date.parse(r.completedAt);
 }else{
  const r=readReceipt('sqlite-final-20261011/release.json',proofs);validateRelease(r,{...spec,artifact:kumaPrevious});
  const overlay=readReceipt('npm10-final-20261011/release.json',proofs);validateRelease({...overlay,rows:overlay.groups},{...spec,artifact:kumaNpm});
  const nn=readReceipt('npm10-final-20261011/native.json',proofs).rows.find(r=>r.key==='kuma-npm10'&&r.imageId===kumaNpm);
  assert(nn?.applicationBytesUnchanged&&nn?.nativeFreshSetupAndLogin);
  const closure=readReceipt('closure-release-20261012.json',proofs).groups.find(g=>g.key==='kuma');
  assert.equal(closure?.status,'passed');assert.equal(closure.oldImage,kumaNpm);assert.equal(closure.newImage,kumaClosure);
  assert.deepEqual(closure.rows.map(r=>r.name).sort(),[...spec.containers].sort());latest=Date.parse(closure.completedAt);
  const current=read('js-closure-20261012/kuma/native.json');assert.equal(current.imageId,kumaClosure);assert(current.passed&&current.nativeKumaSetupAndLogin);
  const cache=readReceipt('closure-followup-20261012/cache-release.json',proofs);
  const group=cache.groups.find(g=>g.project==='utilibre-community');assert.equal(group?.status,'passed');
  const row=group.rows.find(r=>r.name===spec.containers[0]);assert.equal(row?.oldImage,kumaClosure);assert.equal(row.newImage,spec.artifact);
  const app=read('closure-followup-20261012/cache/cache-community-uptime-kuma/application.json');
  assert(app.passed&&app.nativeKumaSetupAndLogin);assert.equal(app.imageId,spec.artifact);
  latest=Date.parse(group.completedAt);
  const n=readReceipt('sqlite-final-20261011/checks.json',proofs).rows.find(r=>r.kind==='kuma');
  assert.equal(n.pyjwtNativeAlgorithmsAndDenials,true);
 }
 assert(Number.isFinite(latest)&&Date.parse(scan.date)>=latest,'Scan must begin after the release');return proofs;
}
function filesIn(dir,prefix=''){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?filesIn(path.join(dir,d.name),prefix+'/'+d.name):d.isFile()?[prefix+'/'+d.name]:[]);
}
function packageManifest(spec,temp){
 const deb=root+spec.deb;assert.equal(sha(fs.readFileSync(deb)),spec.debSha);
 assert.equal(text('dpkg-deb',['-f',deb,'Package']),spec.package);assert.equal(text('dpkg-deb',['-f',deb,'Version']),spec.version);
 command('dpkg-deb',['-x',deb,temp]);
 const files=filesIn(temp).filter(p=>spec.kind==='click'?p.startsWith('/usr/lib/python3/dist-packages/click/'):
 spec.kind==='jwt'?p.startsWith('/usr/lib/python3/dist-packages/jwt/')&&p.endsWith('.py'):
 spec.package==='mariadb-common'?['/etc/mysql/mariadb.cnf','/usr/share/doc/mariadb-common/copyright'].includes(p):
 p.startsWith('/usr/lib/')&&/\.so(?:\.|$)/.test(p)).sort();
 return files.map(p=>({path:p,sha256:sha(fs.readFileSync(temp+p))}));
}
export function reasonFor(item,spec,proof){
 const basis=spec.kind==='click'?'Debian marks Click 8.3.3 fixed; exact upstream b96c2601 replaces shell-based editor execution. Pallets disputes this CVE: this is defense in depth, not confirmation of a public exploit. Seven native source/CLI/Unicode/editor checks, Apprise compatibility and isolated Kuma setup/login passed; all installed Click source files match the signed package.':
 spec.kind==='aom'?(item.id==='CVE-2023-39616'?'Debian marks aom 3.14.1-1 fixed; AV1 frame-buffer fixes 35254736, cbce0616, 54e4b8ff and df38eb16 are included since upstream 3.7.0_rc2. Native HEIF/AVIF and actual GDAL consumers passed; not a separate exploit reproduction.':'Debian marks aom 3.14.1-1 fixed (upstream fix 7ae7bef246e85c8f349513d668b4571c79a43c5c, since 3.7.1).'):
 spec.kind==='jwt'?'Debian primary tracker marks this advisory fixed by PyJWT 2.15.0 or earlier; installed 2.15.1 source matches the signed Debian package. Native algorithms, empty-JWK and loopback JWKS-redirect checks passed; not an exploit reproduction for every advisory.':
 mariaServerIds.includes(item.id)?'Advisory affects MariaDB server/CONNECT/Galera/SST/backup components, fixed by server 11.8.9 or earlier. Coturn has only exact signed 11.8.9 client/config payloads; server/Galera packages and binaries are absent.':
 item.id==='CVE-2026-49261'?'MariaDB fixes wsrep_notify_cmd in server 11.8.8; exact source 11.8.9+ds-4 is fixed. Coturn has client/config packages, no installed server/Galera package or daemon.':
 'Connector/C Big5 escaping is fixed in 3.3.19/3.4.9. Debian marks source 11.8.9+ds-4 fixed; installed signed client library and plugins match byte-for-byte (common contains only configuration/docs).';
 return `${basis} Exact ${spec.artifact}, ${spec.package} ${spec.version}; package SHA256 ${spec.debSha}, live payload manifest SHA256 ${proof.manifestSha256}. https://security-tracker.debian.org/tracker/${item.id} . This is an individual fixed-package/component review against the base-distribution scanner match, not an exemption for other CVEs or versions. Raw findings retained. Native/release evidence: deployment/maintenance/vendor-fixed-review/README.md.`;
}
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
export function run(){
 process.umask(0o077);const queue=read('security-queue.json'),scan=read('security.json');freshScan(queue,scan);
 const decisions=[],proofs=[],skipped=[],cache=new Map();
 const currentSpecs=[...specs];
 for(const receipt of ['closure-followup-20261012/bookworm-release.json','closure-followup-20261012/ncurses-release.json','closure-followup-20261012/rsync-release.json','closure-followup-20261012/util-linux-release.json','closure-followup-20261012/curl-release.json','closure-followup-20261012/gzip-release.json','closure-followup-20261012/sqlite-fts-release.json','closure-followup-20261012/urllib3-release.json','closure-followup-20261012/python-system-release.json',...additionalOverlayReceipts]){
  if(!fs.existsSync(root+receipt))continue;const rows=overlayRows(read(receipt));
  for(const s of [...currentSpecs]){if(!s.containers.length)continue;
   const matched=s.containers.map(name=>rows.find(r=>r.name===name&&r.oldImage===s.artifact));
   if(matched.every(Boolean)&&new Set(matched.map(r=>r.newImage)).size===1&&matched[0].newImage!==s.artifact)
    currentSpecs.push({...s,artifact:matched[0].newImage,overlayPredecessor:s,overlayReceipt:receipt});
  }
 }
 for(const item of queue.items){const spec=currentSpecs.find(s=>matches(item,s));if(!spec)continue;
  try{
   const key=spec.artifact+spec.package;let proof=cache.get(key);
   if(!proof){
    const host=spec.artifact==='host-dpkg';assert.equal(host?scan.host.status:scan.images.find(i=>i.id===spec.artifact)?.status,'checked');
    const releaseReceipts=receipts(spec,scan),temp=fs.mkdtempSync(path.join(os.tmpdir(),'utilibre-vendor-review-'));
    try{
     const manifest=packageManifest(spec,temp),observations=[];
     for(const name of host?[null]:spec.containers){
      if(!host){const x=JSON.parse(text('docker',['inspect',name]))[0];assert.equal(x.Image,spec.artifact);assert.equal(x.State.Running,true);}
      const cmd=(p,args)=>host?text(p,args):text('docker',['exec',name,p,...args]);
      const observed={name,version:cmd('dpkg-query',['-W','-f=${Version}',spec.package]),debSha:spec.debSha,files:manifest.map(f=>({path:f.path,sha256:cmd('sha256sum',[f.path]).split(/\s+/)[0]}))};
      verifyPayload(spec,observed,manifest);
      if(spec.kind==='mariadb'){
       const packages=cmd('dpkg-query',['-W','-f=${binary:Package} ${db:Status-Status}\n']).split('\n');
       assert(!packages.some(p=>/^(?:mariadb-server|mysql-server|galera)(?:[-:\s]|$)/.test(p)&&p.endsWith(' installed')),'Server component present');
       for(const p of ['/usr/sbin/mariadbd','/usr/sbin/mysqld','/usr/lib/galera/libgalera_smm.so'])cmd('test',['!','-e',p]);
       observed.serverAndGaleraAbsent=true;
      }
      observations.push(observed);
     }
     let native;
     if(spec.kind==='jwt'){
      const fixture=fs.readFileSync(here+'/jwt-regressions.py','utf8');
      native=JSON.parse(host?text('/usr/bin/python3',['-I','-c',fixture]):text('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','0.5','--pids-limit','32','--entrypoint','/usr/bin/python3',spec.artifact,'-I','-c',fixture]));
      assert.equal(native.passed,true);assert.equal(native.redirectTargetRequests,0);assert.equal(native.externalRequests,0);
     }
     if(spec.package==='libmariadb3'){
      const library=temp+'/usr/lib/x86_64-linux-gnu/libmariadb.so.3';
      const connectorVersion=text('/usr/bin/python3',['-I','-c','import ctypes,sys; lib=ctypes.CDLL(sys.argv[1]); lib.mysql_get_client_info.restype=ctypes.c_char_p; print(lib.mysql_get_client_info().decode())',library]);
      assert.equal(connectorVersion,'3.4.10','Unexpected Connector/C payload');native={connectorVersion,librarySha256:sha(fs.readFileSync(library))};
     }
     proof={artifact:spec.artifact,package:spec.package,version:spec.version,debSha:spec.debSha,manifestSha256:sha(JSON.stringify(manifest)),manifest,observations,releaseReceipts,native};cache.set(key,proof);
    }finally{fs.rmSync(temp,{recursive:true,force:true});}
   }
   decisions.push(validateDecision({key:item.key,status:'not-affected',reason:reasonFor(item,spec,proof),expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
   proofs.push({key:item.key,id:item.id,...proof});
  }catch(error){skipped.push({key:item.key,id:item.id,artifact:item.artifact,package:item.package,error:error.message.slice(0,180)});}
 }
 const report={date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped};
 fs.writeFileSync(root+'vendor-fixed-review.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false,report:root+'vendor-fixed-review.json'}));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)run();
