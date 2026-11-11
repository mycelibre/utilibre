// Finite held-candidate approval; reuses existing hashing and release adapters.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileHash} from './upgrade-policy.mjs';
export const heldRoot='/var/lib/utilibre-maintenance/held-upgrades-20261111';
export function verifyHeldUpgrade(key,{fresh=true}={}){
 const s=JSON.parse(fs.readFileSync(new URL('./held-inputs.json',import.meta.url))).applications[key];
 assert(s&&s.approval==='approved-exact-tested-candidate');
 const d=heldRoot+'/'+key;
 for(const [p,h]of Object.entries(s.evidence)){assert(!p.includes('..')&&!p.startsWith('/'));assert.equal(fileHash(d+'/'+p),h,p);}
 for(const [p,h]of Object.entries(s.recipes)){assert(p.startsWith('deployment/')&&!p.includes('..'));assert.equal(fileHash(new URL('../../../'+p,import.meta.url)),h,p);}
 const native=JSON.parse(fs.readFileSync(d+'/'+s.native));
 assert(native.passed);assert.equal(native.imageId||native.newImage,s.newImage);
 const scan=JSON.parse(fs.readFileSync(d+'/'+s.scan));
 assert(scan.Results?.length>0,'Missing package inventory is not a pass');
 assert(scan.Metadata?.ImageID===s.newImage||scan.ArtifactName===s.newImage||scan.ArtifactName===s.newRef);
 const blocking=scan.Results.flatMap(r=>(r.Vulnerabilities||[]).filter(v=>['HIGH','CRITICAL'].includes(v.Severity)).map(v=>({type:r.Type,id:v.VulnerabilityID,package:v.PkgName,installed:v.InstalledVersion})));
 if(s.retainedRuntime){
  assert(['candlr','kitchenowl'].includes(key));
  assert(s.evidence[s.retainedRuntime],'Runtime preservation proof must be hash-bound');
  const proof=JSON.parse(fs.readFileSync(d+'/'+s.retainedRuntime));
  assert(proof.passed&&proof.outsideApplicationPayloadUnchanged);
  assert.equal(proof.oldImage,s.oldImage);assert.equal(proof.imageId,s.newImage);
  assert.equal(proof.candidateScanSha256,fileHash(d+'/'+s.scan));
  assert.deepEqual(proof.newHighCritical,[]);
  assert.equal(blocking.length,proof.retainedRawHighCritical.length);
  for(const f of blocking){
   assert.equal(f.type,'debian','Changed application dependencies require a new review');
   const prior=proof.retainedRawHighCritical.filter(p=>p.id===f.id&&p.package===f.package&&p.installed===f.installed);
   assert.equal(prior.length,1);
   assert(['mitigated','not-affected'].includes(prior[0].status)||(f.package==='libacl1'&&f.id==='CVE-2026-54369'&&prior[0].status==='needs-review'),'No new acceptance or suppression');
  }
 }else assert.equal(blocking.length,0);
 for(const name of s.additionalNative||[]){
  assert(s.evidence[name]);const proof=JSON.parse(fs.readFileSync(d+'/'+name));
  assert(proof.passed);assert.equal(proof.imageId,s.newImage);
 }
 const offer=JSON.parse(fs.readFileSync(d+'/source-offer.json'));
 assert(offer.passed&&offer.revision===s.revision);assert.equal(fileHash(d+'/source.tar.gz'),offer.archiveSha256);
 if(fresh){const age=Date.now()-Date.parse(s.databaseUpdatedAt);assert(age>=0&&age<48*3600000,'Refresh advisory assessment before release');}
 return {s,d};
}
