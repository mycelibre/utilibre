// Exact CVE component review: structured Linux CNA records, plus six individually
// inspected and checksum-pinned historical CNA records naming compiled kernel
// files. Installed UAPI inventories are checked; kernel packages are never exempt.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';
import {kernelComponentPaths,headerOverlap,historicalKernelPaths,legacyComponents,gcovBuildPaths,additionalKernelRecords,additionalKernelPaths} from './headers-policy.mjs';
import {overlapSpecs,verifyOverlap} from './headers-overlap.mjs';
import {privateTokens,validateInventory} from '../historical-header-final/policy.mjs';
const root='/var/lib/utilibre-maintenance';
const provided=process.argv.slice(2),offline=provided.includes('--offline');
assert(provided.filter(x=>x==='--offline').length<=1,'Duplicate --offline');
const args=provided.filter(x=>x!=='--offline'),snapshot=args[0]==='--snapshot';
assert(snapshot?args.length===2&&/^[a-f0-9]{40}$/.test(args[1]):args.length<=1&&[undefined,'--current'].includes(args[0]),'Use --snapshot <immutable CNA commit>, --current, or no arguments');
const current=args[0]==='--current';
const commit=snapshot?args[1]:current?'2f073091b14641caef8f31f3ae9cfc4eef3c201e':'20d9248c60fe62803efade3177e8b82b586d154c';
// A new snapshot gets separate evidence: do not overwrite the files linked by
// earlier expiring decisions. Selecting a snapshot never approves findings.
const dir=root+(snapshot?'/headers-review-'+commit:'/closure-followup-20261012');
const cache=current?dir+'/cna-20261021':dir+'/cna';
process.umask(0o077);fs.mkdirSync(cache,{recursive:true});
const reportDir=fs.mkdtempSync(root+'/header-evidence-'+commit+'-');
const queue=JSON.parse(fs.readFileSync(root+'/security-queue.json'));
const scan=JSON.parse(fs.readFileSync(root+'/security.json'));
assert.equal(queue.scanDate,scan.completedAt);assert.equal(scan.status,'checked');
assert(Date.now()-Date.parse(scan.completedAt)<86400000);
const items=queue.items.filter(x=>x.status==='needs-review'&&['HIGH','CRITICAL'].includes(x.severity)&&x.package==='linux-libc-dev');
const ids=[...new Set(items.map(x=>x.id))],sources=new Map,skipped=[];
let next=0;
await Promise.all(Array.from({length:4},async()=>{while(next<ids.length){
 const id=ids[next++],[,year,num]=id.split('-');
 const url=`https://raw.githubusercontent.com/CVEProject/cvelistV5/${commit}/cves/${year}/${num.slice(0,-3)}xxx/${id}.json`;
 try{
  const file=cache+'/'+id+'.json';let body;
  if(fs.existsSync(file))body=fs.readFileSync(file,'utf8');else{
   assert(!offline,'Primary record is not in the selected local snapshot');
   const res=await fetch(url,{signal:AbortSignal.timeout(20000)});assert(res.ok);body=await res.text();assert(body.length<250000);fs.writeFileSync(file,body);
  }
  const record=JSON.parse(body),files=id==='CVE-2026-63825'?gcovBuildPaths(body,id):additionalKernelRecords[id]?additionalKernelPaths(body,id):legacyComponents[id]?historicalKernelPaths(body,id):kernelComponentPaths(record,id);
  sources.set(id,{url,files,provider:record.containers.cna.providerMetadata.shortName,sha256:createHash('sha256').update(body).digest('hex')});
 }catch{skipped.push({id,reason:'No complete Linux-CNA compiled-kernel-only file attribution; manual review remains.'});}
}}));
const execute=(name,args)=>cp.execFileSync(name,args,{encoding:'utf8',timeout:10000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const inventories=new Map,decisions=[],overlapEvidence=[];
for(const item of items){
 const primary=sources.get(item.id);if(!primary)continue;
 const k=item.artifact+'|'+item.installed;
 if(!inventories.has(k)){
  const host=item.scope==='host-os';assert(host||item.scope==='runtime-image');
  const collector=fs.readFileSync(new URL('../historical-header-final/inventory.py',import.meta.url),'utf8'),payloads=[];
  for(const name of host?[null]:item.containers){
   if(name)assert.equal(execute('docker',['inspect','--format','{{.Image}}',name]),item.artifact);
   const args=['-c',collector,JSON.stringify(privateTokens)];
   const payload=JSON.parse(name?execute('docker',['exec',name,'python3',...args]):execute('python3',args));
   validateInventory(payload,item.installed);payloads.push({name,...payload});
  }
  assert(payloads.length);const files=payloads[0].records.map(r=>r.path);
  for(const p of payloads)assert.deepEqual(p.records.map(r=>r.path),files);
  const digest=createHash('sha256').update(JSON.stringify(payloads)).digest('hex');inventories.set(k,{files,digest,payloads});
 }
 // Kernel-private include files can share a basename with a sanitized UAPI
 // file. Retain those ambiguous cases instead of assuming they are unrelated.
 let overlap=false;
 if(headerOverlap(primary.files,inventories.get(k).files)){
  try{
   const spec=overlapSpecs[item.id];assert(spec);const file=dir+'/cna/'+item.id+'-overlap.patch';
   if(!fs.existsSync(file)){assert(!offline,'Overlap patch is not cached');const r=await fetch('https://github.com/gregkh/linux/commit/'+spec.commit+'.patch',{signal:AbortSignal.timeout(20000)});assert(r.ok);const text=await r.text();assert(text.length<250000);fs.writeFileSync(file,text);}
   const readHeader=p=>item.scope==='host-os'?fs.readFileSync(p,'utf8'):execute('docker',['exec',item.containers[0],'cat',p]);
   const proof=verifyOverlap(item.id,primary.files,inventories.get(k).files,fs.readFileSync(file,'utf8'),readHeader);
   overlapEvidence.push({key:item.key,commit:spec.commit,patchSha256:spec.sha256,headers:proof});overlap=true;
  }catch{skipped.push({id:item.id,reason:'Header path overlap requires content review'});continue;}
 }
 const reason=`Primary ${primary.provider} CNA identifies ${primary.files.length} compiled-kernel/internal files; first: ${primary.files[0]}. Exact linux-libc-dev ${item.installed} inventory ${inventories.get(k).digest} contains headers/docs, no kernel binary/module. ${overlap?'Same-name exported UAPI headers were read: syscall-note present, affected private fields/functions absent; pinned upstream patch changes only internal files.':'No affected UAPI file is named or matches the inventory.'} Complete source/response hashes and any header-content proof are in ${reportDir.slice(root.length+1)}/headers-review.json. ${primary.url} . This exact-package attribution does NOT assess the running VM/Proxmox kernel, linux-image or container isolation. Raw scan unchanged.`;
 if(reason.length>1200){skipped.push({id:item.id,reason:'Attribution too long for bounded review; manual review remains'});continue;}
 decisions.push(validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
}
fs.writeFileSync(reportDir+'/headers-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,cnaCommit:commit,offline,inputFindings:items.length,applied:false,decisions,skipped,primary:[...sources.entries()],inventories:[...inventories.entries()],overlapEvidence},null,2)+'\n');
// Keep the existing operator application path usable, while decisions link to
// immutable per-run evidence. Preserve its predecessor before replacing latest.
const latest=dir+'/headers-review.json';
if(fs.existsSync(latest))fs.copyFileSync(latest,reportDir+'/previous-headers-review.json',fs.constants.COPYFILE_EXCL);
fs.copyFileSync(reportDir+'/headers-review.json',latest);
console.log(JSON.stringify({prepared:decisions.length,primaryRecords:sources.size,unresolvedUnique:skipped.length,applied:false,report:reportDir+'/headers-review.json'}));
