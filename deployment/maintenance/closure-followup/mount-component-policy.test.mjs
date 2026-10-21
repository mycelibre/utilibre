import test from 'node:test';import assert from 'node:assert/strict';
import {bookwormHookCase,repairedBookwormComponentCase,repairedVersion,repairedPackages,repairedRoles,legacyAbsence,validateRepairedRelease,validateOverlayChain} from './mount-component-policy.mjs';
const item={type:'debian',scope:'runtime-image',installed:'2.38.1-5+deb12u3',package:'libmount1',id:'CVE-2026-76642'};
test('only the exact legacy owner/idmap-hook findings qualify',()=>{
 for(const id of ['CVE-2026-76642','CVE-2026-78410'])for(const pkg of ['libmount1','mount'])assert(bookwormHookCase({...item,id,package:pkg}));
});
test('the real older mount-target race remains open',()=>{
 for(const id of ['CVE-2026-53613','CVE-2026-78409','CVE-2026-99999'])assert.equal(bookwormHookCase({...item,id}),false);
});
test('newer, unknown or unverified component scopes never inherit attribution',()=>{
 for(const change of [{installed:'2.41.5-0+deb13u1'},{installed:'2.38.1-5+deb12u4'},{package:'util-linux'},{scope:'host-os'},{type:'ubuntu'}])assert.equal(bookwormHookCase({...item,...change}),false);
});
const repaired={...item,installed:repairedVersion,artifact:'sha256:'+'a'.repeat(64),containers:[repairedRoles.kuma]};
test('repaired scope is exact: eight roles, two packages and three absence CVEs',()=>{
 for(const name of Object.values(repairedRoles))for(const pkg of Object.keys(repairedPackages))for(const id of ['CVE-2026-76642','CVE-2026-78410','CVE-2026-78409']){
  const candidate={...repaired,containers:[name],package:pkg,id};assert(repairedBookwormComponentCase(candidate));assert.equal(bookwormHookCase(candidate),id!=='CVE-2026-78409');
 }
 for(const delta of [{id:'CVE-2026-53613'},{id:'CVE-2026-78408'},{id:'CVE-2026-99999'},{package:'util-linux'},{scope:'host-os'},{type:'ubuntu'},{installed:repairedVersion+'-unverified'},{artifact:'sha256:not-a-hash'},{containers:[]},{containers:['unknown']},{containers:[repairedRoles.kuma,repairedRoles.rallly]}])assert.equal(repairedBookwormComponentCase({...repaired,...delta}),false);
});
test('source absence checks fail closed if owner, idmap or detached-subdir implementation appears',()=>{
 const files={'context.c':'legacy descriptor pinning','context_mount.c':'if (mnt_context_get_helper_status(cxt) == 0) {}'};
 assert(legacyAbsence(files));
 for(const name of ['hook_owner.c','hook_idmap.c'])assert.throws(()=>legacyAbsence({...files,[name]:''}));
 for(const code of ['X-mount.owner','X-mount.group','X-mount.mode','X-mount.idmap','MNT_STAGE_MOUNT_POST','mnt_context_call_hooks','api->subdir'])assert.throws(()=>legacyAbsence({...files,'context.c':code}));
 for(const code of ['open_tree','helper check removed'])assert.throws(()=>legacyAbsence({...files,'context_mount.c':code}));
});
function fixture(){
 const hashes=Object.fromEntries(['stage','native','consumer','application','source','upstreamException'].map((k,j)=>[k,String(j+1).repeat(64)]));
 const packages=Object.entries(repairedPackages).map(([name,sha256])=>({name:name+'_'+repairedVersion+'_amd64.deb',sha256}));
 const stage={status:'passed',name:repairedRoles.kuma,key:'kuma',image:repaired.artifact,version:repairedVersion,base:'sha256:'+'b'.repeat(64),baseRef:'previous:exact',candidate:'candidate:exact',nativeSha256:hashes.native,configurationUnchanged:true,unrelatedPackagesUnchanged:true,priorRuntimeBytesUnchanged:true,packages};
 const completedAt='2026-10-12T18:00:00.000Z';
 return {stage,hashes,release:{status:'passed',key:'kuma',completedAt,proofs:{...hashes},groups:[{status:'passed',completedAt,rows:[{name:stage.name,oldImage:stage.base,newImage:stage.image,oldRef:stage.baseRef,newRef:stage.candidate}]}]},native:{status:'passed',version:repairedVersion,librarySha256:'79a898619cf9e100a80a30c75cb61ab30ca925809ae2b16aea2f87e09be084e0',exports:312,exactExportsPreserved:true,sonameAndNeededPreserved:true,bookwormLibcCompatible:true,checks:Array.from({length:12},()=>({passed:true})),packages:structuredClone(packages)},consumer:{passed:true,imageId:stage.image,cases:Array.from({length:6},()=>({})),nativeSha256:hashes.native,network:'none',user:65534,kernelMounts:false},application:{passed:true,imageId:stage.image},source:{published:true,sha256:'4d25fc4768bcfd418ae87e3bc64cd3389e7137a79dda6535665f2a5abbaf7480'},upstreamException:{baselineAndCandidateSameFailure:true,candidateFailures:1}};
}
const scan={date:'2026-10-12T18:01:00.000Z'};
test('later overlays require an unbroken same-role completed chain before this scan',()=>{
 const a='sha256:'+'a'.repeat(64),b='sha256:'+'b'.repeat(64),c='sha256:'+'c'.repeat(64);
 const rows=[{name:'role',oldImage:a,newImage:b,completedAt:'2026-10-12T17:00:00Z'},{name:'role',oldImage:b,newImage:c,completedAt:'2026-10-12T18:00:00Z'}];
 assert(validateOverlayChain(a,c,'role',rows,scan.date));
 for(const bad of [rows.slice(1),rows.slice(0,1),rows.map(r=>({...r,name:'other'})),rows.map(r=>({...r,completedAt:'2026-10-13T00:00:00Z'}))])assert.throws(()=>validateOverlayChain(a,c,'role',bad,scan.date));
});
test('completed repaired release requires exact source, packages, native/application proofs and ancestry',()=>{
 assert(validateRepairedRelease(repaired,scan,fixture()));
 const mutations=[p=>p.release.status='prepared',p=>p.release.key='rallly',p=>p.stage.status='prepared',p=>p.stage.version='2.38.1-5+deb12u3',p=>p.stage.image='sha256:'+'c'.repeat(64),p=>p.native.version='other',p=>p.native.checks[0].passed=false,p=>p.native.librarySha256='0'.repeat(64),p=>p.native.exactExportsPreserved=false,p=>p.native.packages[0].sha256='0'.repeat(64),p=>p.stage.packages[0].sha256='0'.repeat(64),p=>p.stage.packages.push({name:'unrelated'}),p=>p.stage.priorRuntimeBytesUnchanged=false,p=>p.application.passed=false,p=>p.consumer.passed=false,p=>p.consumer.imageId=p.stage.base,p=>p.consumer.network='host',p=>p.consumer.kernelMounts=true,p=>p.source.published=false,p=>p.source.sha256='0'.repeat(64),p=>p.upstreamException.baselineAndCandidateSameFailure=false,p=>p.release.proofs.source='0'.repeat(64),p=>p.release.groups[0].status='failed',p=>p.release.groups[0].rows[0].status='failed',p=>p.release.groups[0].rows[0].oldImage='wrong',p=>p.release.groups[0].rows[0].oldRef='wrong',p=>p.release.groups[0].rows[0].newRef='wrong',p=>p.release.groups[0].rows[0].name='wrong',p=>p.release.groups[0].completedAt='not-a-date'];
 for(const mutate of mutations){const p=fixture();mutate(p);assert.throws(()=>validateRepairedRelease(repaired,scan,p));}
 assert.throws(()=>validateRepairedRelease(repaired,{date:'2026-10-12T17:59:00Z'},fixture()));
 assert.throws(()=>validateRepairedRelease({...repaired,id:'CVE-2026-53613'},scan,fixture()));
});
