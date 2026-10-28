// Verify the already built, signed Alpine update's ABI and native fixture.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const dir='/var/lib/utilibre-maintenance/security-20261028/x11/wallabag',b=JSON.parse(fs.readFileSync(dir+'/build.json')),pin=JSON.parse(fs.readFileSync(new URL('./x11-fixture.json',import.meta.url)));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:60000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
assert(b.passed&&b.nativeRows.length===2&&b.nativeRows.every(r=>r.passed&&r.checks===8));
assert.equal(sha(new URL('./x11-native.c',import.meta.url)),pin.sourceSha256);assert.equal(sha(dir+'/../fixture/native'),pin.binarySha256);assert.equal(b.fixtureSha256,pin.binarySha256);
const rows=[];
for(const imageId of [b.base,b.imageId]){
 const cid=run('docker',['create','--entrypoint','/bin/true',imageId]),file=dir+'/'+(rows.length?'after':'before')+'-libX11.so';
 try{run('docker',['cp','-L',cid+':/usr/lib/libX11.so.6',file]);}finally{run('docker',['rm',cid]);}
 const symbols=run('readelf',['--dyn-syms','--wide',file]).split('\n').map(l=>l.trim().split(/\s+/)).filter(f=>['GLOBAL','WEAK'].includes(f[4])&&f[6]!=='UND').map(f=>f[7]).sort();assert(symbols.length>500);
 const needed=run('readelf',['-d',file]).split('\n').filter(l=>/\((?:SONAME|NEEDED)\)/.test(l)).map(l=>l.slice(l.indexOf('('))).sort();assert(needed.length>=2);
 rows.push({imageId,sha256:sha(file),symbols,needed});
}
assert.deepEqual(rows[1].symbols,rows[0].symbols);assert.deepEqual(rows[1].needed,rows[0].needed);
fs.writeFileSync(dir+'/consumer.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,abiPreserved:true,neededPreserved:true,rows,scope:'Xrm, keysym and geometry compatibility; no malicious X server wire test'},null,2)+'\n');
console.log('Wallabag Xlib: all exported symbols and native dependencies preserved');
