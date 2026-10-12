// Exact CVE component review: only Linux CNA records naming compiled kernel .c
// files, with installed UAPI-header inventories. Never exempts kernel packages.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';
import {kernelComponentPaths,headerOverlap} from './headers-policy.mjs';
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012';
const commit='20d9248c60fe62803efade3177e8b82b586d154c';
process.umask(0o077);fs.mkdirSync(dir+'/cna',{recursive:true});
const queue=JSON.parse(fs.readFileSync(root+'/security-queue.json'));
const scan=JSON.parse(fs.readFileSync(root+'/security.json'));
assert.equal(queue.scanDate,scan.completedAt);assert.equal(scan.status,'checked');
assert(Date.now()-Date.parse(scan.completedAt)<86400000);
const items=queue.items.filter(x=>x.status==='needs-review'&&x.severity==='HIGH'&&x.package==='linux-libc-dev');
const ids=[...new Set(items.map(x=>x.id))],sources=new Map,skipped=[];
let next=0;
await Promise.all(Array.from({length:4},async()=>{while(next<ids.length){
 const id=ids[next++],[,year,num]=id.split('-');
 const url=`https://raw.githubusercontent.com/CVEProject/cvelistV5/${commit}/cves/${year}/${num.slice(0,-3)}xxx/${id}.json`;
 try{
  const file=dir+'/cna/'+id+'.json';let body;
  if(fs.existsSync(file))body=fs.readFileSync(file,'utf8');else{
   const res=await fetch(url,{signal:AbortSignal.timeout(20000)});assert(res.ok);body=await res.text();assert(body.length<250000);fs.writeFileSync(file,body);
  }
  const files=kernelComponentPaths(JSON.parse(body),id);
  sources.set(id,{url,files,sha256:createHash('sha256').update(body).digest('hex')});
 }catch{skipped.push({id,reason:'No complete Linux-CNA compiled-kernel-only file attribution; manual review remains.'});}
}}));
const execute=(name,args)=>cp.execFileSync(name,args,{encoding:'utf8',timeout:10000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const inventories=new Map,decisions=[];
for(const item of items){
 const primary=sources.get(item.id);if(!primary)continue;
 const k=item.artifact+'|'+item.installed;
 if(!inventories.has(k)){
  const host=item.scope==='host-os';assert(host||item.scope==='runtime-image');
  const name=item.containers[0];if(!host)assert.equal(execute('docker',['inspect','--format','{{.Image}}',name]),item.artifact);
  const run=args=>host?execute('dpkg-query',args):execute('docker',['exec',name,'dpkg-query',...args]);
  assert.equal(run(['-W','-f=${Version}','linux-libc-dev']),item.installed);
  const files=run(['-L','linux-libc-dev']).split('\n');assert(files.length>100);
  assert(files.every(p=>['/.','/usr','/usr/include','/usr/share','/usr/share/doc','/usr/lib','/usr/lib/linux','/usr/lib/linux/uapi'].includes(p)||p.startsWith('/usr/include/')||p.startsWith('/usr/share/doc/')||p.startsWith('/usr/lib/linux/uapi/')));
  assert(!files.some(p=>/\.(?:c|ko|so|a)$|vmlinuz/.test(p)));
  const digest=createHash('sha256').update(files.join('\n')).digest('hex');inventories.set(k,{files,digest});
 }
 // Kernel-private include files can share a basename with a sanitized UAPI
 // file. Retain those ambiguous cases instead of assuming they are unrelated.
 if(headerOverlap(primary.files,inventories.get(k).files)){skipped.push({id:item.id,reason:'Header path overlap requires content review'});continue;}
 const reason=`Linux CNA names ${primary.files.length} kernel/internal component file(s); first: ${primary.files[0]}. Complete file list and response checksum retained in closure-followup-20261012/headers-review.json. No UAPI file is named or matches the exact linux-libc-dev ${item.installed} installed inventory ${inventories.get(k).digest}, containing only headers/documentation and no kernel image/module. ${primary.url} . This is only a component-absent review of this exact header package, never the running VM/Proxmox kernel, linux-image packages or container isolation. Raw scan remains unchanged.`;
 if(reason.length>1200){skipped.push({id:item.id,reason:'Attribution too long for bounded review; manual review remains'});continue;}
 decisions.push(validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
}
fs.writeFileSync(dir+'/headers-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,skipped,primary:[...sources.entries()],inventories:[...inventories.entries()]},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,primaryRecords:sources.size,unresolvedUnique:skipped.length,applied:false}));
