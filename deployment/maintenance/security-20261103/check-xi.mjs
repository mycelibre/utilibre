// Exact native ABI and pinned candidate payload; no live display or user data.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/security-20261103/libxi';
const inputs=JSON.parse(fs.readFileSync(new URL('./libxi-inputs.json',import.meta.url)));
process.umask(0o077);assert.equal(process.argv.length,2);
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']});
for(const s of inputs.rows){
 const dir=root+'/'+s.key,b=JSON.parse(fs.readFileSync(dir+'/build.json')),abi=[];
 assert(b.passed&&b.base===s.base&&b.nativeRows.length===2);
 for(const [state,imageId]of [['before',s.base],['after',b.imageId]]){
  const file=dir+'/'+state+'-libXi.so.6',bytes=fs.readFileSync(file),sha256=createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256,b.nativeRows.find(r=>r.imageId===imageId).librarySha256);
  const exports=run('readelf',['--dyn-syms','--wide',file]).split('\n').map(l=>l.trim().split(/\s+/)).filter(f=>['GLOBAL','WEAK'].includes(f[4])&&f[6]!=='UND');
  // GNU linker section markers are not libXi's published API. Retain them in
  // evidence; only these three NOTYPE markers may differ across toolchains.
  const markers=exports.filter(f=>['__bss_start','_edata','_end'].includes(f[7]));assert(markers.every(f=>f[3]==='NOTYPE'));
  const symbols=exports.filter(f=>!markers.includes(f)).map(f=>f[7]).sort();assert(symbols.length>60);
  const needed=run('readelf',['-d',file]).split('\n').filter(l=>/\((?:SONAME|NEEDED)\)/.test(l)).map(l=>l.slice(l.indexOf('('))).sort();
  abi.push({imageId,sha256,symbols,needed,linkerSectionMarkers:markers.map(f=>f[7])});
 }
 assert.deepEqual(abi[1].symbols,abi[0].symbols);assert.deepEqual(abi[1].needed,abi[0].needed);
 assert.equal(abi[1].sha256,inputs.librarySha256);
 fs.writeFileSync(dir+'/consumer.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,base:s.base,abiPreserved:true,neededPreserved:true,abi,nativeRows:b.nativeRows,scope:'Native XInput 1/2 checks on isolated Xvfb. Exploit baseline not reproduced; authenticated upstream fixes and library hash are recorded.'},null,2)+'\n');
 console.log(s.key+': native XInput and ABI passed');
}
