// Read ELF headers and the native loader's dependency report; never start an app.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
let files=0,elf=0;const missing=[],gnutls=[];
function walk(path){
 let entries;try{entries=fs.readdirSync(path,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const entry of entries){const p=path+'/'+entry.name;if(entry.isDirectory()){walk(p);continue;}if(!entry.isFile())continue;files++;
  const fd=fs.openSync(p,'r'),header=Buffer.alloc(4);try{fs.readSync(fd,header,0,4,0);}finally{fs.closeSync(fd);}
  if(!header.equals(Buffer.from([0x7f,0x45,0x4c,0x46])))continue;elf++;
  const result=cp.spawnSync('ldd',[p],{encoding:'utf8',timeout:10000});assert(!result.error,'Native dependency reader failed');
  const text=result.stdout+result.stderr;if(/=>\s+not found/.test(text))missing.push({path:p,libraries:[...text.matchAll(/([^\s]+)\s+=>\s+not found/g)].map(m=>m[1]).sort()});
  if(/libgnutls\.so/.test(text))gnutls.push(p);
 }
}
for(const path of ['/usr/bin','/usr/sbin','/usr/lib','/usr/local','/app','/cryptpad','/usr/src/app'])walk(path);
assert(elf>20,'ELF coverage unexpectedly small');
console.log(JSON.stringify({passed:true,filesRead:files,elfObjects:elf,missingDependencies:missing.sort((a,b)=>a.path.localeCompare(b.path)),gnutlsDependencies:gnutls.sort()}));
