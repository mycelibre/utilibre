// Exact linux-libc-dev attribution. The running kernel is never reviewed here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {components,verifyPrimary,validateInventory,privateTokens} from '../historical-header-final/policy.mjs';
import {kernelComponentPaths} from '../closure-followup/headers-policy.mjs';
import {validateDecision} from '../triage.mjs';

process.umask(0o077);
const root='/var/lib/utilibre-maintenance',here=root+'/security-20261122/headers-current';
const snapshot='4989f214d182878c704596292594e8b68c29bab2';
const oldRoot=root+'/historical-header-final-20261012';
const currentRoot=root+'/headers-review-'+snapshot+'/cna';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const run=(name,args,input)=>execFileSync(name,args,{input,encoding:'utf8',timeout:30000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']}).trim();
const primaryHashes={
 'CVE-2024-21963':'201c8f2343413a0ac12c392eebedd81ef7666461ada1eee060a989acaafbb8d4',
 'CVE-2026-0004':'0dbb57b73d826c087dec6b3a7ec26b2a28bfb85c7c313dd55d8c7979b7050ed5',
 'CVE-2026-98103':'3bb86b342a3ac2ff89659389eed7d0edc9b1a073c46478e58c2f3a64e6ccafbb',
 'CVE-2026-98993':'17c4afb29032e4d7aa596aac184a994eafdcad4b6632b058c9598fc13ac291fe',
 'CVE-2026-99568':'ee3127e58d21d8b47dbb1764307f35f1ea6e2c3c63d2eb4b365b74b5e2113405',
};
const historical=new Set(['CVE-2013-7445','CVE-2019-19814','CVE-2021-3847','CVE-2021-3864']);
const selected=new Set([...historical,...Object.keys(primaryHashes)]);
const roleVersions={
 'utilibre-gathio-postgres-1':'6.1.192-2',
 'utilibre-kitchenowl-app-1':'6.12.117-1',
 'utilibre-linkding-linkding-1':'6.12.117-1',
 'utilibre-simplelogin-web-1':'5.15.0-203.213',
 'utilibre-simplelogin-smtp-1':'5.15.0-203.213',
 'utilibre-simplelogin-jobs-1':'5.15.0-203.213',
};
const tokens=[...new Set([...privateTokens,'ip_sf_list','ip_check_mc_rcu','clone_mnt','MNT_UMOUNT','iova_bitmap_set'])];

function checkPrimary(id){
 if(historical.has(id)){
  const file=oldRoot+'/cna/'+id+'.json';
  const proof=verifyPrimary(id,fs.readFileSync(file),f=>fs.readFileSync(oldRoot+'/sources/'+f));
  assert(components[id]);return {id,source:file,sha256:hash(fs.readFileSync(file)),component:proof.component};
 }
 const file=currentRoot+'/'+id+'.json',body=fs.readFileSync(file);
 assert.equal(hash(body),primaryHashes[id]);
 const c=JSON.parse(body);assert.equal(c.cveMetadata.cveId,id);assert.equal(c.cveMetadata.state,'PUBLISHED');
 const data=c.containers.cna,description=data.descriptions.find(x=>x.lang==='en')?.value;
 assert(description);
 if(['CVE-2024-21963','CVE-2026-0004'].includes(id)){
  assert.equal(data.providerMetadata.shortName,'AMD');
  assert(description.includes(id==='CVE-2024-21963'?'IOMMU':'transient execution'));
  return {id,source:file,sha256:hash(body),component:'processor or hypervisor behavior, not userspace header code'};
 }
 assert.equal(data.providerMetadata.shortName,'Linux');
 const expected=id==='CVE-2026-98103'?['include/linux/igmp.h','net/ipv4/igmp.c']:
  id==='CVE-2026-98993'?['fs/namespace.c','include/linux/mount.h']:
  ['drivers/iommu/iommufd/iova_bitmap.c','include/uapi/linux/iommufd.h'];
 const files=id==='CVE-2026-99568'?
  [...new Set(data.affected.flatMap(a=>a.programFiles||[]))]:kernelComponentPaths(c,id);
 assert.deepEqual([...files].sort(),[...expected].sort());
 if(id==='CVE-2026-99568'){
  assert(data.affected.length&&data.affected.every(a=>a.vendor==='Linux'&&a.product==='Linux'&&Array.isArray(a.programFiles)));
  const patch=fs.readFileSync(here+'/CVE-2026-99568-f41d317.patch','utf8');
  assert.equal(hash(patch),'ee9ba9b2f17d9b1b7188749396e5b5a9c291995eefc72e8d3e2407a6c54bf622');
  assert(patch.startsWith('From f41d317be00767e81ce0a664fa37ab829654ab8d '));
  const marker='diff --git a/include/uapi/linux/iommufd.h b/include/uapi/linux/iommufd.h';
  assert.equal(patch.split(marker).length,2);
  const uapi=patch.split(marker)[1].split(/^diff --git |^-- $/m)[0];
  const changed=uapi.split('\n').filter(l=>/^[+-]/.test(l)&&!/^--- |^\+\+\+ /.test(l));
  assert(changed.length>=6&&changed.every(l=>/^\+ \*/.test(l)),'The exported header change must contain comments only');
  assert(patch.includes('diff --git a/drivers/iommu/iommufd/iova_bitmap.c'));
 }
 return {id,source:file,sha256:hash(body),component:expected.join(', ')};
}

const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');
assert.equal(scan.status,'checked');assert.equal(queue.status,'current');assert.equal(queue.scanDate,scan.completedAt);
assert(Date.now()-Date.parse(scan.completedAt)<86400000);
const items=queue.items.filter(i=>i.status==='needs-review'&&i.severity==='HIGH'&&i.package==='linux-libc-dev'&&selected.has(i.id));
const proofs=new Map([...new Set(items.map(i=>i.id))].map(id=>[id,checkPrimary(id)]));
const collector=fs.readFileSync(new URL('../historical-header-final/inventory.py',import.meta.url),'utf8');
const inventories=new Map(),decisions=[];
for(const item of items){
 assert(['debian','ubuntu'].includes(item.type));assert(item.targetName===item.artifact);
 assert(['runtime-image','host-os'].includes(item.scope));
 const names=item.scope==='host-os'?[null]:item.containers;
 assert(names.length>0);
 if(item.scope==='host-os')assert(item.artifact==='host-dpkg'&&item.installed==='6.12.117-1'&&item.containers.length===0&&scan.host.status==='checked');
 else assert(names.every(n=>roleVersions[n]===item.installed)&&scan.images.some(x=>x.id===item.artifact&&x.status==='checked'));
 const receipts=[];
 for(const name of names){
  const key=item.artifact+'|'+(name||'host');
  if(!inventories.has(key)){
   if(name)assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact);
   const args=['-',JSON.stringify(tokens)];
   const raw=name?run('docker',['exec','-i',name,'python3',...args],collector):run('python3',args,collector);
   const inv=JSON.parse(raw);validateInventory(inv,item.installed,tokens);
   inventories.set(key,{name,artifact:item.artifact,inventory:inv});
  }
  receipts.push(inventories.get(key).inventory.payloadSha256);
 }
 const primary=proofs.get(item.id),headerOnly='Installed package contains only checked UAPI headers and documentation, no kernel binary, module or private implementation tokens.';
 const overlap=item.id==='CVE-2026-99568'?'The upstream stable patch changes the named exported iommufd header only in a comment; bounds enforcement is in compiled kernel C files.':
  ['CVE-2026-98103','CVE-2026-98993'].includes(item.id)?'The same-named exported UAPI header lacks the affected private kernel symbols.':'';
 const reason=`Exact linux-libc-dev ${item.installed} package attribution for ${item.id}. ${headerOnly} ${overlap} Primary component: ${primary.component}; pinned CNA SHA256 ${primary.sha256}. Complete installed inventory SHA256 ${[...new Set(receipts)].join(', ')}. Evidence: security-20261122/headers-current. This does not clear the running VM or Proxmox kernel, processor, or hypervisor. Raw finding retained; only this package/image is reviewed.`;
 decisions.push(validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
}
for(const v of inventories.values())if(v.name)assert.equal(run('docker',['inspect','--format','{{.Image}}',v.name]),v.artifact);
assert.equal(read(root+'/security.json').completedAt,scan.completedAt);
const date=new Date().toISOString(),suffix=Date.now();
const evidence=JSON.stringify({date,scanDate:scan.completedAt,snapshot,primary:[...proofs.values()],inventories:[...inventories.values()],collectorSha256:hash(collector),kernelCleared:false},null,2)+'\n';
fs.writeFileSync(here+'/evidence-'+suffix+'.json',evidence,{flag:'wx',mode:0o600});
const report=here+'/review-'+suffix+'.json';
fs.writeFileSync(report,JSON.stringify({schemaVersion:1,scanDate:scan.completedAt,decisions,evidenceSha256:hash(evidence)},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({prepared:decisions.length,inventories:inventories.size,report,productionChanged:false,kernelCleared:false}));
