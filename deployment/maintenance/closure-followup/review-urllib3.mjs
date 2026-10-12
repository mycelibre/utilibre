// Signed vendor release, exact installed payload and completed native gates.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012',read=p=>JSON.parse(fs.readFileSync(p));
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const q=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(q,scan);assert.equal(scan.status,'checked');
const primary=read(dir+'/debian-primary.json');assert(Date.now()-Date.parse(primary.date)<86400000);
const release=read(dir+'/urllib3-release.json'),host=read(dir+'/urllib3-host.json');assert.equal(release.status,'passed');assert.equal(host.status,'passed');
const rows=overlayRows(release),specs=read(new URL('./urllib3-specs.json',import.meta.url));
for(const receipt of additionalOverlayReceipts)if(fs.existsSync(root+'/'+receipt)){
 for(const next of overlayRows(read(root+'/'+receipt))){
  const prior=rows.find(r=>r.name===next.name&&r.newImage===next.oldImage);
  if(prior&&next.newImage!==next.oldImage)rows.push({...next,originalImage:prior.originalImage||prior.newImage});
 }
}
const deb=dir+'/sources/python3-urllib3_2.8.0-2_all.deb',hash='d48b157c65ac9b28a86cd2d6f5af3baa841208bae724bed3a33b0058727b0ff3';assert.equal(sha(deb),hash);
const temp=fs.mkdtempSync('/dev/shm/utilibre-urllib3-proof-'),decisions=[],proofs=[];
try{
 run('dpkg-deb',['-x',deb,temp]);
 const list=(d,p='')=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(d+'/'+e.name,p+'/'+e.name):e.isFile()?[p+'/'+e.name]:[]);
 const manifest=list(temp).filter(p=>p.startsWith('/usr/lib/python3/dist-packages/urllib3/')).map(path=>({path,sha256:sha(temp+path)}));assert(manifest.length>30);
 const checked=new Set();
 for(const item of q.items.filter(i=>i.status==='needs-review'&&i.type==='debian'&&['runtime-image','host-os'].includes(i.scope)&&i.package==='python3-urllib3'&&i.installed==='2.8.0-2'&&['CVE-2025-66471','CVE-2026-97687','CVE-2026-97689'].includes(i.id))){
  const fixed=primary.sources['python-urllib3']?.[item.id]?.releases?.sid;assert.equal(fixed?.status,'resolved');assert(fixed.fixed_version&&fixed.fixed_version!=='0');run('dpkg',['--compare-versions',item.installed,'ge',fixed.fixed_version]);
  if(!checked.has(item.artifact)){
   const isHost=item.scope==='host-os';
   if(isHost){assert(host.native.passed&&host.native.checks.length===11&&host.native.urllib3==='2.8.0');assert(Date.parse(host.completedAt)<=Date.parse(scan.date));}
   for(const name of isHost?[null]:item.containers){
    if(name){const row=rows.find(r=>r.name===name&&r.newImage===item.artifact);assert(row&&Date.parse(row.completedAt)<=Date.parse(scan.date));assert.equal(run('docker',['inspect',name,'--format','{{.Image}}']),item.artifact);const spec=specs.find(s=>s.containers.includes(name));assert(spec);const n=read(dir+'/urllib3/'+spec.key+'/native.json'),a=read(dir+'/urllib3/'+spec.key+'/application.json');assert(n.passed&&n.checks.length===11&&a.passed);assert.equal(n.imageId,row.originalImage||item.artifact);assert.equal(a.imageId,row.originalImage||item.artifact);}
    const command=(p,a)=>name?run('docker',['exec',name,p,...a]):run(p,a);
    assert.equal(command('dpkg-query',['-W','-f=${Version}','python3-urllib3']),item.installed);
    for(const f of manifest)assert.equal(command('sha256sum',[f.path]).split(/\s/)[0],f.sha256);
   }
   checked.add(item.artifact);
  }
  const reason=`Signed Debian urllib3 2.8.0-2 runtime files verified byte-for-byte against archive SHA256 ${hash}; primary vendor tracker fixes ${item.id} in ${fixed.fixed_version}. Eleven isolated HTTP/TLS/proxy identity/chunk-bound checks passed, plus native application gates and exact-image live release. https://github.com/urllib3/urllib3/releases/tag/2.8.0 ; https://security-tracker.debian.org/tracker/${item.id} . Evidence: closure-followup-20261012/urllib3-review.json. Only this exact library finding; no assertion that the whole service or its other dependencies are fixed.`;
  decisions.push(validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));proofs.push({key:item.key,artifact:item.artifact,manifestSha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')});
 }
 fs.writeFileSync(dir+'/urllib3-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,manifest},null,2)+'\n');
}finally{fs.rmSync(temp,{recursive:true});}
console.log(JSON.stringify({prepared:decisions.length,applied:false}));
