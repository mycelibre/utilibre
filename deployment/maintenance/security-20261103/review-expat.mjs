// Prepare exact, expiring native-package reviews. Raw findings remain intact.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
import {proveExpat,advisories as expatAdvisories,expatDescendant} from './expat-policy.mjs';
import {proveXi,advisories as xiAdvisories} from './xi-policy.mjs';
import{resetAdvisory,proofPath,validateResetProof}from'../security-20261104/expat-reset-proof.mjs';
process.umask(0o077);assert(process.argv.length===2||(process.argv.length===3&&['--libxi','--reset-advisory','--amplification-advisory'].includes(process.argv[2])));
const reset=process.argv[2]==='--reset-advisory';
const amplification=process.argv[2]==='--amplification-advisory';
const xi=process.argv[2]==='--libxi',profile=xi?'libxi':'expat-debian',advisories=xi?xiAdvisories:reset?[resetAdvisory]:amplification?['CVE-2026-115506']:expatAdvisories;
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261103/'+profile;
const read=p=>JSON.parse(fs.readFileSync(p));
const inputs=read(new URL('./'+profile+'-inputs.json',import.meta.url));
if(amplification){
 const source=read(new URL('./expat-bookworm-source.json',import.meta.url));
 const pin=source.sources.files.find(f=>f.file==='expat_2.10.0.orig.tar.gz');assert(pin);
 const archive=root+'/security-20261103/packages/debian/'+pin.file;
 assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),pin.sha256);
 const paths=cp.execFileSync('tar',['-tzf',archive],{encoding:'utf8',timeout:15000}).split('\n').filter(p=>p.endsWith('/Changes'));
 assert.equal(paths.length,1);
 const changes=cp.execFileSync('tar',['-xOf',archive,paths[0]],{encoding:'utf8',timeout:15000});
 assert.match(changes,/Release 2\.10\.0[\s\S]*CVE-2026-115506 -- Detect billion laughs attacks quicker/);
 const build=read(root+'/security-20261103/expat-bookworm/output/build.json');
 assert(build.passed&&build.nativeSuite.checks===5328&&build.nativeSuite.failed===0);
 assert.equal(build.packageSha256,inputs.packages.bookworm.sha256);
 assert.equal(createHash('sha256').update(fs.readFileSync(root+'/security-20261103/expat-bookworm/output/native-tests.log')).digest('hex'),build.nativeSuite.sha256);
}
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json');
freshScan(queue,scan);assert.equal(scan.status,'checked');
const release=read(dir+'/release.json');assert.equal(release.status,'passed');
const overlays=additionalOverlayReceipts.filter(p=>fs.existsSync(root+'/'+p)).flatMap(p=>overlayRows(read(root+'/'+p)));
const run=args=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const proofs=[],decisions=[];
for(const s of inputs.rows){
 const d=dir+'/'+s.key,b=read(d+'/build.json'),c=read(d+'/consumer.json');if(xi)proveXi(inputs,s,b,c,read(d+'/application.json'));else proveExpat(inputs,s,b,c);
 const g=release.groups.find(g=>g.key===s.key);assert.equal(g?.status,'passed');
 assert(Date.parse(g.completedAt)<Date.parse(scan.completedAt),'Scan must follow deployment');
 const images=s.containers.map(name=>expatDescendant(name,b.imageId,g.completedAt,scan.completedAt,overlays));
 assert.equal(new Set(images).size,1,'All roles must reach the same reviewed image');
 const imageId=images[0];
 const image=scan.images.find(i=>i.id===imageId);assert.equal(image?.status,'checked');
 const selected=queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.artifact===imageId&&i.type==='debian'&&i.package===(xi?'libxi6':'libexpat1')&&i.installed===s.version&&advisories.includes(i.id));
 if(!selected.length)continue;
 const libraries=Object.fromEntries(c.abi.filter(a=>a.imageId===b.imageId).map(a=>[xi?'/usr/lib/x86_64-linux-gnu/libXi.so.6':a.library==='bundled-expat'?s.bundledLibrary.path:'/usr/lib/x86_64-linux-gnu/'+a.library+'.so.1',a.sha256]));
 if(reset)for(const hash of Object.values(libraries))validateResetProof(read(proofPath),hash);
 const live=[];
 for(const name of s.containers){
  assert(g.rows.some(r=>r.name===name&&r.newImage===b.imageId));
  const container=JSON.parse(run(['inspect',name]))[0];assert.equal(container.Image,imageId);assert(container.State.Running);
  for(const p of Object.keys(libraries))assert(!container.Mounts.some(m=>p===m.Destination||p.startsWith(m.Destination+'/')),'Library shadowed by a mount');
  assert.equal(run(['exec',name,'dpkg-query','-W','-f=${Version}',xi?'libxi6':'libexpat1']),s.version);
  const hashes=run(['exec',name,'sha256sum',...Object.keys(libraries)]).split('\n').map(l=>l.trim().split(/\s+/));
  assert.deepEqual(Object.fromEntries(hashes.map(([sha,p])=>[p,sha])),libraries);
  live.push({name,imageId,libraries});
 }
 for(const item of selected){
  assert(item.containers?.length&&item.containers.every(n=>s.containers.includes(n)));
  decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:xi?`Authenticated Debian libXi 2:1.8.4-1 fixes ${item.id}. Exact deployed library hash, published source, original API/NEEDED and isolated XInput 1/2 device discovery/allocation checks verified. Penpot raster and font roundtrips pass and other application/configuration bytes are unchanged. No malicious-X-server exploit test is claimed. Stable Debian advisory data still matches the newer package; raw findings remain. Only this exact image/version/advisory is reviewed, for seven days. Evidence: security-20261103/libxi/${s.key}/{build,consumer,application,scan-gate}.json and review.json. https://security-tracker.debian.org/tracker/${item.id}`:`Exact deployed Expat ${s.version} fixes ${item.id} in upstream 2.10.0. Signed Debian package or authenticated Bookworm source rebuild; both native library hashes, retained ABI, narrow/wide parser checks and current running-container bytes verified. Debian stable advisory data lacks a fixed-version boundary and still matches this newer package; raw result is retained. No exception for other versions/CVEs. ${reset?'Reset regression: 64-KiB synthetic input; both old widths fail, all four installed-build widths pass (security-20261104/expat-reset.json). ':''}Evidence: security-20261103/expat-debian/${s.key}/{build,consumer,scan-gate}.json and review.json. Upstream: https://github.com/libexpat/libexpat/releases/tag/R_2_10_0. Review is bound to this exact image/role and expires.`}));
 }
 proofs.push({key:s.key,imageId,originalImageId:b.imageId,live,buildSha256:createHash('sha256').update(fs.readFileSync(d+'/build.json')).digest('hex')});
}
const output=dir+(reset?'/review-reset-':amplification?'/review-amplification-':'/review-')+Date.now()+'.json';
fs.writeFileSync(output,JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,proofs,decisions,applied:false},null,2)+'\n');
fs.copyFileSync(output,dir+(reset?'/review-reset.json':amplification?'/review-amplification.json':'/review.json'));
console.log(JSON.stringify({prepared:decisions.length,output,applied:false}));
