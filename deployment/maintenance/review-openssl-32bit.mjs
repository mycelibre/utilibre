// One explicit advisory review, not a general suppression rule. Records expire.
// Upstream CVE-2026-31789 affects 32-bit hex conversion; inspect the actual ELF
// class of the flagged runtime library before recording an exact-image decision.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {validateDecision} from './triage.mjs';
import {run as rebuild} from './build-queue.mjs';
const exec=promisify(execFile),directory='/var/lib/utilibre-maintenance';
const queue=JSON.parse(await readFile(directory+'/security-queue.json','utf8'));
if(queue.status!=='current')throw Error('A complete scan is required');
let decisions=[];try{decisions=JSON.parse(await readFile(directory+'/security-decisions.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const evidence={date:new Date().toISOString(),source:'https://openssl-library.org/news/secadv/20260407.txt',results:[]};
const cache=new Map();
for(const f of queue.items.filter(x=>x.scope==='runtime-image'&&x.id==='CVE-2026-31789'&&['libssl3','libcrypto3'].includes(x.package))){
 try{
  const name=f.containers[0],library=f.package==='libssl3'?'libssl.so.3':'libcrypto.so.3';
  const identity=JSON.parse((await exec('docker',['inspect',name],{timeout:10000})).stdout)[0];
  if(identity.Image!==f.artifact||!identity.State.Running)throw Error('Runtime changed');
  const key=f.artifact+library;
  if(!cache.has(key)){
   const script=`for p in /usr/lib/${library} /lib/${library} /usr/lib/x86_64-linux-gnu/${library} /lib/x86_64-linux-gnu/${library}; do if test -r "$p"; then printf '%s\\n' "$p"; od -An -tu1 -N5 "$p"; fi; done`;
   const output=(await exec('docker',['exec',name,'sh','-c',script],{timeout:10000,maxBuffer:4096})).stdout.trim();
   const lines=output.split('\n').filter(Boolean),paths=[];
   if(!lines.length||lines.length%2)throw Error('No complete ELF evidence');
   for(let i=0;i<lines.length;i+=2){
    if(!/^\/(usr\/)?lib\/(x86_64-linux-gnu\/)?lib(ssl|crypto)\.so\.3$/.test(lines[i])||lines[i+1].trim().split(/\s+/).join(' ')!=='127 69 76 70 2')throw Error('Library not verified ELF64');
    paths.push(lines[i]);
   }
   cache.set(key,paths);
  }
  const paths=cache.get(key),decision=validateDecision({key:f.key,status:'not-affected',expiresAt:new Date(Date.now()+14*86400000).toISOString(),reason:`OpenSSL advisory https://openssl-library.org/news/secadv/20260407.txt limits CVE-2026-31789 to 32-bit platforms (>1 GiB OCTET STRING hex conversion). Exact running image matched; ${paths.join(', ')} verified ELF class 2 (64-bit) on ${evidence.date.slice(0,10)}. Other OpenSSL advisories and upgrades remain independently open.`});
  decisions=decisions.filter(x=>x.key!==f.key);decisions.push(decision);
  evidence.results.push({key:f.key,image:f.artifact,package:f.package,libraryPaths:paths,elfClass:64,status:'not-affected'});
 }catch{evidence.results.push({key:f.key,image:f.artifact,package:f.package,status:'unverified-no-decision'});}
}
await writeFile(directory+'/openssl-32bit-review.json',JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
await writeFile(directory+'/security-decisions.json.tmp',JSON.stringify(decisions,null,2)+'\n',{mode:0o600});await rename(directory+'/security-decisions.json.tmp',directory+'/security-decisions.json');
await rebuild();
console.log(JSON.stringify({reviewed:evidence.results.filter(x=>x.status==='not-affected').length,unverified:evidence.results.filter(x=>x.status!=='not-affected').length,evidence:directory+'/openssl-32bit-review.json'}));
