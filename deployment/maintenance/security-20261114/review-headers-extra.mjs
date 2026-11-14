// Exact passive header attribution; explicitly excludes running kernel/firmware.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {components,privateTokens,verifyPrimary,validateInventory,sha} from '../historical-header-final/policy.mjs';
import {kernelComponentPaths,headerOverlap} from '../closure-followup/headers-policy.mjs';
import {command} from '../component-followup/inventory.mjs';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',r=root+'/security-20261114',read=p=>JSON.parse(fs.readFileSync(p));
const scan=read(root+'/security.json'),q=read(root+'/security-queue.json');freshScan(q,scan);assert.equal(scan.status,'checked');
const pins=read(new URL('./header-primary-inputs.json',import.meta.url)),versions=read(new URL('./headers-inputs.json',import.meta.url));
const accepted=new Set(Object.values(versions.packages).map(p=>p.version));
const script=fs.readFileSync(new URL('../historical-header-final/inventory.py',import.meta.url),'utf8'),inv=new Map(),primary=new Map(),decisions=[];
for(const i of q.items.filter(i=>i.status==='needs-review'&&i.package==='linux-libc-dev'&&['HIGH','CRITICAL'].includes(i.severity)&&(components[i.id]||pins.records.some(p=>p.id===i.id)))){
 assert(accepted.has(i.installed));assert(['host-os','runtime-image'].includes(i.scope));
 if(!primary.has(i.id)){
  if(components[i.id])primary.set(i.id,verifyPrimary(i.id,fs.readFileSync(root+'/historical-header-final-20261012/cna/'+i.id+'.json'),f=>fs.readFileSync(root+'/historical-header-final-20261012/sources/'+f)));
  else {
   const p=pins.records.find(p=>p.id===i.id),b=fs.readFileSync(r+'/headers/primary/'+i.id+'.json');assert.equal(sha(b),p.sha256);const record=JSON.parse(b);assert.equal(record.cveMetadata.cveId,i.id);assert.equal(record.cveMetadata.state,'PUBLISHED');
   if(i.id==='CVE-2026-99288')primary.set(i.id,{...p,files:kernelComponentPaths(record,i.id),component:'compiled IPv4/IPv6 socket lookup code; a separate running-kernel update is required'});
   else {const c=record.containers.cna;assert.equal(c.providerMetadata.shortName,'AMD');const d=c.descriptions.find(d=>d.lang==='en').value;assert(d.includes(i.id==='CVE-2026-0004'?'AMD processors':'IOMMU'));primary.set(i.id,{...p,component:i.id==='CVE-2026-0004'?'processor transient-execution behavior and kernel mitigation':'hardware IOMMU/hypervisor behavior and kernel mitigation'});}
  }
 }
 const p=primary.get(i.id),hashes=[];
 for(const name of i.scope==='host-os'?[null]:i.containers){
  const key=i.artifact+'|'+(name||'host');
  if(!inv.has(key)){
   if(name)assert.equal(command('docker',['inspect','--format','{{.Image}}',name]),i.artifact);
   const args=['-c',script,JSON.stringify(privateTokens)],v=JSON.parse(name?command('docker',['exec',name,'python3',...args]):command('python3',args));
   validateInventory(v,i.installed);inv.set(key,v);
  }
  const v=inv.get(key);if(p.files)assert(!headerOverlap(p.files,v.records.map(x=>x.path)));hashes.push(v.payloadSha256);
 }
 const reason=`Exact linux-libc-dev ${i.installed} header/doc package only. Primary evidence identifies ${p.component}; complete installed inventories contain no compiled kernel, firmware, module or executable, and historical private implementation symbols are absent. Inventories ${[...new Set(hashes)].join(',')}. Primary record and source hashes: security-20261114/headers/extra-review.json. ${p.url||p.originalReference} . This does NOT clear the running VM/Proxmox kernel or hardware; CVE-2026-99288 remains a separate kernel activation requirement. Raw findings retained.`;
 decisions.push(validateDecision({key:i.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason}));
}
fs.writeFileSync(r+'/headers/extra-review.json',JSON.stringify({schemaVersion:1,scanDate:scan.completedAt,decisions,primary:[...primary],inventories:[...inv]},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
