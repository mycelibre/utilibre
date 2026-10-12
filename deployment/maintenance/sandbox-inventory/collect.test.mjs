import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelManifest,collectSandboxSources,denoSourceName,wheelSourceName} from './collect.mjs';
const row={name:'python-dateutil',version:'2.8.2',filename:'python_dateutil-2.8.2-cp313-none-any.whl',sha256:'a'.repeat(64)};
test('wheel metadata becomes exact requirements; missing/duplicate/injected values fail closed',()=>{
 assert.match(wheelManifest([row]),/\npython-dateutil==2\.8\.2\n$/);
 assert.notEqual(wheelManifest([row]),wheelManifest([{...row,sha256:'b'.repeat(64)}]));
 for(const rows of [[],[row,{...row,name:'python_dateutil'}],[{...row,version:'2.8.2\nother==9'}],[{...row,sha256:''}],[{...row,filename:'../file.whl'}]])assert.throws(()=>wheelManifest(rows));
});
test('changed runtime cannot be scanned as the old Deno source; independent wheel inventory survives',async()=>{
 const results=await collectSandboxSources(async(_program,args)=>args.includes('sha256sum')?'b'.repeat(64)+'  /binary\n':JSON.stringify([row]));
 assert.equal(results.find(r=>r.name===denoSourceName).status,'failed');
 assert.match(results.find(r=>r.name===wheelSourceName).bytes.toString(),/\npython-dateutil==2\.8\.2\n$/);
});
test('unavailable container never becomes an empty successful inventory',async()=>{
 const results=await collectSandboxSources(async()=>{throw Error('Unavailable');});
 assert.equal(results.length,2);assert(results.every(r=>r.status==='failed'&&!r.bytes));
});
