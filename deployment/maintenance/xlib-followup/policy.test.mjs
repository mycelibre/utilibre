import test from 'node:test';
import assert from 'node:assert/strict';
import {packageGate,simulationGate,refreshStaticUpstreams} from './policy.mjs';
const digest='a'.repeat(64),row=(name,version)=>({name,version,sha256:digest});
test('exact signed-vendor lineage is retained',()=>{
 const rows=[row('libx11-6','2:1.8.12-1+dhi0+utilibre1'),row('libxtst6','2:1.2.5-1+dhi0+utilibre1')];packageGate('dhi',rows,rows.map(p=>p.name));
 assert.throws(()=>packageGate('trixie',rows,rows.map(p=>p.name)));
 assert.throws(()=>packageGate('dhi',[{...rows[0],version:'2:1.8.12-1+utilibre1'},rows[1]],rows.map(p=>p.name)));
});
test('native compatibility does not allow unrelated packages or unpinned versions',()=>{
 const rows=[row('libx11-6','2:1.8.4-2+deb12u2+utilibre1')];packageGate('bookworm',rows,['libx11-6']);
 for(const version of ['2:1.8.12-1+utilibre1','2:1.8.4-2+deb12u2','2:1.8.4-2+deb12u2+utilibre2'])assert.throws(()=>packageGate('bookworm',[{...rows[0],version}],['libx11-6']));
 assert.throws(()=>packageGate('bookworm',[row('libc6','2.42')],['libc6']));assert.throws(()=>packageGate('bookworm',[...rows,...rows],['libx11-6','libx11-6']));assert.throws(()=>packageGate('bookworm',[{...rows[0],sha256:''}],['libx11-6']));
});
test('simulation allows exactly the four native host replacements',()=>{
 const okay=['libx11-6','libx11-data','libx11-xcb1','libxrender1'].map(p=>'Inst '+p+' [old] (native+utilibre1 local)').join('\n')+'\n4 upgraded, 0 newly installed, 0 to remove and 43 not upgraded.';simulationGate(okay);
 for(const bad of [okay+'\nInst libc6 [old] (2.42 vendor)',okay.replace('Inst libx11-6','Remv libx11-6'),okay.replace('Inst libx11-data','Inst libx11-6'),okay.replace('0 newly installed','1 newly installed'),okay.replaceAll('+utilibre1','')])assert.throws(()=>simulationGate(bad));
});
test('expanded rollout and rollback refresh only the existing frontend DNS',()=>{
 const calls=[];const docker=(...args)=>calls.push(args);
 for(const key of ['forms','gathio'])refreshStaticUpstreams(key,docker);assert.equal(calls.length,0);
 refreshStaticUpstreams('expanded',docker);assert.deepEqual(calls,[['exec','utilibre-expanded-penpot-frontend-1','nginx','-t'],['exec','utilibre-expanded-penpot-frontend-1','nginx','-s','reload']]);
 let count=0;assert.throws(()=>refreshStaticUpstreams('expanded',()=>{count++;throw Error('invalid nginx configuration');}));assert.equal(count,1,'Never reload after failed config validation');
 assert.throws(()=>refreshStaticUpstreams('unreviewed',docker));
});
