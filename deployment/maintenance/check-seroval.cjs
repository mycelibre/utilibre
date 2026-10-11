// Native serialization round trip, including cycles and typed data. No network.
const assert=require('node:assert/strict'),fs=require('node:fs');
const root=process.argv[2];assert(['/app','/nitrate/apps/admin-console'].includes(root));
const path=root+'/node_modules/.pnpm/seroval@1.5.6/node_modules/seroval';
assert.equal(JSON.parse(fs.readFileSync(path+'/package.json')).version,'1.6.8');
const s=require(path),data={label:'Fictional café',bytes:new Uint8Array([1,2,3]),date:new Date('2026-01-01T00:00:00Z')};data.self=data;
const output=s.fromJSON(s.toJSON(data));
assert.equal(output.self,output);assert.equal(output.label,data.label);
assert.deepEqual(output.bytes,data.bytes);assert.equal(output.date.toISOString(),data.date.toISOString());
assert.throws(()=>s.fromJSON({t:999999}));
console.log('Patched native Seroval cyclic, UTF-8, date and typed-data round trip passed; malformed node rejected.');
