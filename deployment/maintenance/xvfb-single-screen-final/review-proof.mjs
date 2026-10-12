// Completed exact live payload proof, reusable by historical reviewer routing.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import{root,json,sha,binary,gates,nativeGate,screenGate}from'./proofs.mjs';
import{overlayRows}from'../review-native-backports.mjs';import{additionalOverlayReceipts}from'../followup-overlays.mjs';
import{inventory}from'../component-followup/inventory.mjs';
import{exporterBinding}from'./release-binding.mjs';
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',stdio:'pipe',timeout:30000,maxBuffer:8*1024**2}).trim();
export function completed(role,scan){
 const proof=gates(),p=proof.packages.records.find(r=>r.role===role),file=root+(role==='host'?'/host-release.json':'/release.json'),r=json(file);assert.equal(r.status,'passed');assert(Date.parse(r.completedAt)<=Date.parse(scan.date));const bound=role==='host'?r.proofs:r.groups[0].proofs;assert.deepEqual(bound,proof.proofs);let image=null;
 if(role==='host'){
  assert.equal(run('dpkg-query',['-W','-f=${Version}','xvfb']),p.newVersion);assert.equal(sha('/usr/bin/Xvfb'),binary.host);nativeGate(r.live.native,'host');screenGate(r.live.screen,'host');assert(r.noServiceRestart);
  for(const [path,row]of Object.entries(p.after)){const stat=fs.lstatSync(path);assert.equal(stat.mode&0o777,row.mode);if(row.link!==undefined)assert.equal(fs.readlinkSync(path),row.link);else assert.equal(sha(path),row.sha256)}
  const old=json('/var/lib/utilibre-maintenance/xserver-followup-20261012/host-release.json');assert.equal(old.status,'passed');for(const row of old.newFiles){if(row.file==='/usr/bin/Xvfb')continue;const stat=fs.lstatSync(row.file);assert.equal(stat.mode&0o7777,row.mode);if(row.link!==undefined)assert.equal(fs.readlinkSync(row.file),row.link);else assert.equal(sha(row.file),row.sha256)}assert.equal(run('dpkg-query',['-W','-f=${Version}','xserver-common']),'2:21.1.25-1');
 }else{
  const b=proof.stage,name=b.container;image=b.image;exporterBinding(r,b);
  const chain=additionalOverlayReceipts.filter(p=>fs.existsSync('/var/lib/utilibre-maintenance/'+p)).flatMap(p=>overlayRows(json('/var/lib/utilibre-maintenance/'+p))).filter(x=>x.name===name).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));for(const row of chain)if(row.oldImage===image&&row.oldImage!==row.newImage){assert(Date.parse(row.completedAt)<=Date.parse(scan.date));image=row.newImage}
  assert.equal(run('docker',['inspect',name,'--format','{{.Image}}']),image);assert.equal(scan.images.find(i=>i.id===image)?.status,'checked');assert.equal(run('docker',['exec',name,'sha256sum','/usr/bin/Xvfb']).split(/\s/)[0],binary.dhi);
  const installed=inventory('xvfb',name);assert.equal(installed.installed,p.newVersion);for(const[path,v]of Object.entries(p.after)){const actual=installed.records.find(r=>r.path===path);assert(actual,path);if(v.link!==undefined)assert.equal(actual.target,v.link);else assert.equal(actual.sha256,v.sha256)}
  const common=inventory('xserver-common',name);assert.equal(common.installed,'2:21.1.16-1.3+deb13u4+dhi1');const earlier=json('/var/lib/utilibre-maintenance/xserver-followup-20261012/dhi-review-evidence.json').payloads.find(p=>p.package==='xserver-common');assert(earlier);for(const row of earlier.files){const actual=common.records.find(r=>r.path===row.path);assert(actual,row.path);if(row.type==='symlink')assert.equal(actual.target,row.target);else assert.equal(actual.sha256,row.sha256)}
 }
 return{role,image,completedAt:r.completedAt,receiptSha256:sha(file),binarySha256:binary[role]};
}
