import assert from 'node:assert/strict';
export const version='5.38.2-3.2ubuntu0.6';
export const packages=['libperl5.38t64','perl','perl-base','perl-modules-5.38'];
export function simulationGate(text){
 const changes=text.split('\n').filter(l=>/^(Inst|Remv) /.test(l));assert.equal(changes.length,4);
 assert.deepEqual(changes.map(l=>{assert(l.startsWith('Inst '));assert(l.includes('('+version+' '));return l.split(' ')[1].replace(/:amd64$/,'');}).sort(),packages);
 assert.match(text,/4 upgraded, 0 newly installed, 0 to remove/);
}
export function unrelatedPackages(before,after){
 const parse=s=>new Map(s.trim().split('\n').map(l=>l.split('=')));
 const b=parse(before),a=parse(after);assert.deepEqual([...a.keys()].sort(),[...b.keys()].sort());
 for(const [name,value]of b){if(packages.includes(name.replace(/:amd64$/,'')))assert.equal(a.get(name),version);else assert.equal(a.get(name),value,'Unrelated package: '+name);}
}
