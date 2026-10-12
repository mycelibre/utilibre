import {test} from 'node:test';
import assert from 'node:assert/strict';
import {replaceImagePins,releaseGroup,namespaceDependents,rollbackFiles,readinessSeconds,directlyRecreatedServices} from './release.mjs';
test('SMTP one-use permit startup must use its native supervisor',()=>{
 assert.deepEqual(directlyRecreatedServices({project:'utilibre-newsletters',rows:[{service:'web'},{service:'smtp'},{service:'jobs'},{service:'gateway'}]}),['web','jobs','gateway']);
 assert.deepEqual(directlyRecreatedServices({project:'other',rows:[{service:'smtp'}]}),['smtp']);
});
test('readiness allows native interval/start period but is bounded',()=>{
 assert.equal(readinessSeconds([{Config:{Healthcheck:{Interval:60e9,Timeout:3e9}}}]),133);
 assert.equal(readinessSeconds([{Config:{Healthcheck:{Interval:90e9,StartPeriod:300e9}}}]),180);
 assert.equal(readinessSeconds([{Config:{}}]),60);
});
test('rollback includes checked-in mirrors, once, and only owned files',()=>{
 assert.deepEqual(rollbackFiles({files:['/runtime/compose.yaml'],mirrorFiles:['/source/compose.yaml','/runtime/compose.yaml']}),['/runtime/compose.yaml','/source/compose.yaml']);
});
test('same-image network companions are included recursively',()=>{
 const rows=[{Id:'one',Name:'/app',HostConfig:{NetworkMode:'bridge'}},{Id:'two',Name:'/gateway',HostConfig:{NetworkMode:'container:one'}},{Id:'three',Name:'/helper',HostConfig:{NetworkMode:'container:two'}},{Id:'four',Name:'/unrelated',HostConfig:{NetworkMode:'bridge'}}];
 assert.deepEqual(namespaceDependents(rows,new Set(['app'])).map(r=>[r.container.Name,r.parent]),[['/gateway','app'],['/helper','gateway']]);
});
test('source edits change only exact image scalars',()=>{
 const result=replaceImagePins('services:\n  app:\n    image: one:old # preserved\n    command: one:old\n  other:\n    image: one:older\n',[{from:'one:old',to:'one:new'}]);
 assert.equal(result.replaced,1);assert(result.text.includes('image: one:new # preserved'));assert(result.text.includes('command: one:old'));assert(result.text.includes('image: one:older'));
});
test('preflight failure never restarts or changes source',async()=>{
 const called=[];await assert.rejects(releaseGroup({project:'fixture'},{preflight:()=>{throw Error('drift');},save:()=>called.push('save'),recreate:()=>called.push('restart')}));assert.deepEqual(called,[]);
});
test('initial receipt failure does not restart',async()=>{let restarted=false;await assert.rejects(releaseGroup({},{preflight:()=>{},save:()=>{throw Error('disk');},recreate:()=>{restarted=true;}}));assert.equal(restarted,false);});
test('failed health restores pins before supervisor and verifies old image',async()=>{
 const order=[],g={project:'fixture'};await assert.rejects(releaseGroup(g,{preflight:()=>{},save:()=>{},recreate:()=>order.push('restart'),gate:v=>{order.push(v);if(v==='new')throw Error('bad');},rollbackPins:()=>order.push('old-pins')}));assert.deepEqual(order,['restart','new','old-pins','restart','old']);assert.equal(g.rollback,'verified');
});
test('drifted rollback refuses restart and does not claim recovery',async()=>{
 let restarts=0;const g={project:'fixture'};await assert.rejects(releaseGroup(g,{preflight:()=>{},save:()=>{},recreate:()=>restarts++,gate:()=>{throw Error('bad');},rollbackPins:()=>{throw Error('tag drift');}}));assert.equal(restarts,1);assert.equal(g.rollback,'unverified');
});
