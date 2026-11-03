// Prepare exact, expiring native-package reviews. Raw findings remain intact.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
import {proveExpat,advisories,expatDescendant} from './expat-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261103/expat-debian';
const read=p=>JSON.parse(fs.readFileSync(p));
const inputs=read(new URL('./expat-debian-inputs.json',import.meta.url));
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json');
freshScan(queue,scan);assert.equal(scan.status,'checked');
const release=read(dir+'/release.json');assert.equal(release.status,'passed');
const overlays=additionalOverlayReceipts.filter(p=>fs.existsSync(root+'/'+p)).flatMap(p=>overlayRows(read(root+'/'+p)));
const run=args=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const proofs=[],decisions=[];
for(const s of inputs.rows){
 const d=dir+'/'+s.key,b=read(d+'/build.json'),c=read(d+'/consumer.json');proveExpat(inputs,s,b,c);
 const g=release.groups.find(g=>g.key===s.key);assert.equal(g?.status,'passed');
 assert(Date.parse(g.completedAt)<Date.parse(scan.completedAt),'Scan must follow deployment');
 const images=s.containers.map(name=>expatDescendant(name,b.imageId,g.completedAt,scan.completedAt,overlays));
 assert.equal(new Set(images).size,1,'All roles must reach the same reviewed image');
 const imageId=images[0];
 const image=scan.images.find(i=>i.id===imageId);assert.equal(image?.status,'checked');
 const selected=queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.artifact===imageId&&i.type==='debian'&&i.package==='libexpat1'&&i.installed===s.version&&advisories.includes(i.id));
 if(!selected.length)continue;
 const libraries=Object.fromEntries(c.abi.filter(a=>a.imageId===b.imageId).map(a=>[a.library==='bundled-expat'?s.bundledLibrary.path:'/usr/lib/x86_64-linux-gnu/'+a.library+'.so.1',a.sha256]));
 const live=[];
 for(const name of s.containers){
  assert(g.rows.some(r=>r.name===name&&r.newImage===b.imageId));
  const container=JSON.parse(run(['inspect',name]))[0];assert.equal(container.Image,imageId);assert(container.State.Running);
  for(const p of Object.keys(libraries))assert(!container.Mounts.some(m=>p===m.Destination||p.startsWith(m.Destination+'/')),'Library shadowed by a mount');
  assert.equal(run(['exec',name,'dpkg-query','-W','-f=${Version}','libexpat1']),s.version);
  const hashes=run(['exec',name,'sha256sum',...Object.keys(libraries)]).split('\n').map(l=>l.trim().split(/\s+/));
  assert.deepEqual(Object.fromEntries(hashes.map(([sha,p])=>[p,sha])),libraries);
  live.push({name,imageId,libraries});
 }
 for(const item of selected){
  assert(item.containers?.length&&item.containers.every(n=>s.containers.includes(n)));
  decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact deployed Expat ${s.version} fixes ${item.id} in upstream 2.10.0. Signed Debian package or authenticated Bookworm source rebuild; both native library hashes, retained ABI, narrow/wide parser checks and current running-container bytes verified. Debian stable advisory data lacks a fixed-version boundary and still matches this newer package; raw result is retained. No exception for other versions/CVEs. Evidence: security-20261103/expat-debian/${s.key}/{build,consumer,scan-gate}.json and review.json. Upstream: https://github.com/libexpat/libexpat/releases/tag/R_2_10_0. Review is bound to this exact image/role and expires.`}));
 }
 proofs.push({key:s.key,imageId,originalImageId:b.imageId,live,buildSha256:createHash('sha256').update(fs.readFileSync(d+'/build.json')).digest('hex')});
}
const output=dir+'/review-'+Date.now()+'.json';
fs.writeFileSync(output,JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,proofs,decisions,applied:false},null,2)+'\n');
fs.copyFileSync(output,dir+'/review.json');
console.log(JSON.stringify({prepared:decisions.length,output,applied:false}));
