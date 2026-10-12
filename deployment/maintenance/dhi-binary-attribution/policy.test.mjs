import test from 'node:test';
import assert from 'node:assert/strict';
import {rows,archives,eligible,prove,exporterBefore,exporterAfter,restrictedXvfb,exporterAncestry} from './policy.mjs';
const item=r=>({status:'needs-review',scope:'runtime-image',type:'debian',package:r.package,id:r.id,artifact:r.artifact,targetName:r.artifact,installed:r.stale,containers:[r.container]});
const proof=r=>({image:r.artifact,container:r.container,package:r.package,actualVersion:archives[r.package].version,archiveSha256:archives[r.package].sha256,residual:{path:'/var/lib/dpkg/status.d/'+r.package,version:r.stale,source:r.source,sha256:'a'.repeat(64)},authenticatedIndex:true,payloadExact:true,fileCount:3,inventorySha256:'b'.repeat(64),componentAbsentFromPackage:true,component:r.source==='perl'?'Archive::Tar':'systemd-homed'});
test('all five exact stale records need current signed-payload and residual proofs',()=>{assert.equal(rows.length,5);for(const r of rows){assert(eligible(item(r)));assert(prove(item(r),proof(r)));}});
test('reject affected siblings, other versions, roles, image, CVE and ambiguous inventory',()=>{for(const r of rows)for(const change of [{package:'perl-modules-5.40'},{package:'perl'},{package:'systemd-homed'},{id:'CVE-2026-99999'},{installed:archives[r.package].version},{artifact:'sha256:'+'0'.repeat(64)},{containers:[r.container,'other']},{scope:'host-os'},{status:'mitigated'},{targetName:'other'}])assert(!eligible({...item(r),...change}));assert(!eligible(null));});
test('fail closed on incomplete, mismatched or version-falsifying proofs',()=>{for(const r of rows)for(const change of [{actualVersion:r.stale},{archiveSha256:'0'.repeat(64)},{authenticatedIndex:false},{payloadExact:false},{componentAbsentFromPackage:false},{fileCount:0},{residual:{...proof(r).residual,version:'other'}},{residual:{...proof(r).residual,source:'other'}}])assert.throws(()=>prove(item(r),{...proof(r),...change}));});
function transition(){
 const completedAt='2026-10-12T18:40:45.486Z';
 const stage={passed:true,container:'utilibre-expanded-penpot-exporter-1',base:exporterBefore,image:exporterAfter,baseRef:'previous:exact',candidate:'candidate:exact',allOtherApplicationLibraryConfigBytesUnchanged:true,allOtherPackagesUnchanged:true,configurationUnchanged:true};
 const release={status:'passed',completedAt,groups:[{key:'penpot-single-screen',project:'utilibre-expanded',status:'passed',completedAt,rows:[{key:'penpot-single-screen',service:'penpot-exporter',name:stage.container,oldImage:stage.base,oldRef:stage.baseRef,newImage:stage.image,newRef:stage.candidate}]}]};
 const verified={role:'dhi',image:exporterAfter,binarySha256:restrictedXvfb,completedAt,receiptSha256:'c'.repeat(64)};
 return {stage,release,verified,scan:{date:'2026-10-12T18:41:00Z'}};
}
test('only two exporter records can advance through the exact completed one-screen release',()=>{
 const t=transition(),ancestry=exporterAncestry(t.stage,t.release,t.verified,t.scan);
 for(const r of rows){const successor={...item(r),artifact:exporterAfter,targetName:exporterAfter};assert.equal(eligible(successor),r.artifact===exporterBefore);if(r.artifact!==exporterBefore)continue;
  const p={...proof(r),image:exporterAfter,ancestry};assert(prove(successor,p));
  for(const bad of [{ancestry:undefined},{ancestry:{...ancestry,predecessor:'wrong'}},{ancestry:{...ancestry,image:exporterBefore}},{ancestry:{...ancestry,binarySha256:'0'.repeat(64)}},{payloadExact:false},{authenticatedIndex:false},{componentAbsentFromPackage:false},{archiveSha256:'0'.repeat(64)}])assert.throws(()=>prove(successor,{...p,...bad}));
 }
});
test('reject incomplete release ancestry, changed scope, missing preservation and stale scans',()=>{
 const mutations=[t=>t.stage.base='sha256:'+'f'.repeat(64),t=>t.stage.image='sha256:'+'f'.repeat(64),t=>t.stage.container='other',t=>t.stage.allOtherPackagesUnchanged=false,t=>t.stage.allOtherApplicationLibraryConfigBytesUnchanged=false,t=>t.stage.configurationUnchanged=false,t=>t.release.status='prepared',t=>t.release.groups[0].status='failed',t=>t.release.groups[0].rows[0].status='failed',t=>t.release.groups[0].rows[0].oldRef='wrong',t=>t.release.groups[0].rows[0].newRef='wrong',t=>t.release.groups[0].rows[0].name='other',t=>t.verified.image=exporterBefore,t=>t.verified.role='host',t=>t.verified.binarySha256='0'.repeat(64),t=>t.verified.completedAt='bad',t=>t.scan.date='2026-10-12T18:00:00Z'];
 for(const mutate of mutations){const t=transition();mutate(t);assert.throws(()=>exporterAncestry(t.stage,t.release,t.verified,t.scan));}
});
