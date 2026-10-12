// Reviewed kernel-private vs exported-UAPI name collisions, not a kernel waiver.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=v=>createHash('sha256').update(v).digest('hex');
export const overlapSpecs={
 'CVE-2026-53118':{commit:'654ef9c33e138ede6734ac286282df9faf83cd11',sha256:'22c53808ff657b9749dd619984ae458fa211044657e2c82827ba158486cadc23',headers:{'include/linux/vdpa.h':['driver_override']}},
 'CVE-2026-53120':{commit:'dfe950d9464cad609f3b118c6203e2708055bc61',sha256:'27ac8780be5e385e9a8d7674469fefd2ddcbd7d254e9397ed16cc887edcaf4e4',headers:{'include/linux/pci.h':['driver_override']}},
 'CVE-2024-35839':{commit:'9874808878d9eed407e3977fd11fee49de1e1d86',sha256:'b005150d5d924b19aa0872efb4a2f68092e3a8af602e270639167b6579637769',headers:{'include/linux/netfilter_bridge.h':['nf_bridge_get_physinif','nf_bridge_get_physindev']}},
 'CVE-2024-49861':{commit:'32556ce93bc45c730829083cb60f95a2728ea48b',sha256:'eb5e4314a43b6fa6fbcaa3ceaca665e2372b731bf8b95b26d2d66da2e506dc1b',headers:{'include/linux/bpf.h':['ARG_PTR_TO_INT','ARG_PTR_TO_LONG','MEM_ALIGNED']}},
 'CVE-2024-58100':{commit:'81f6d0530ba031b5f038a091619bf2ff29568852',sha256:'9cd6442af5dba7d032fe16ef2128bb8aa2659082e1e4d7ac61b16f6aadba7ee9',headers:{'include/linux/bpf.h':['changes_pkt_data']}},
 'CVE-2025-21812':{commit:'95fc45d1dea8e1253f8ec58abc5befb71553d666',sha256:'3af15b8796b44182ab8827f7cae5d0be58f76c3ab6e48b312b6c0a32ef2d6592',headers:{'include/linux/netdevice.h':['ax25_ptr']}},
};
export function validateExportedHeader(body,tokens){
 assert(body.length>100&&body.length<1024**2);
 assert(body.includes('WITH Linux-syscall-note'),'Expected exported syscall header');
 for(const token of tokens){assert(/^[A-Za-z_][A-Za-z_0-9]*$/.test(token));assert(!new RegExp('\\b'+token+'\\b').test(body),'Kernel-private member/function present');}
 return sha(body);
}
export function verifyOverlap(id,primaryFiles,inventory,patch,readHeader){
 const spec=overlapSpecs[id];assert(spec,'Unreviewed overlap remains open');
 assert.equal(sha(patch),spec.sha256,'Upstream patch changed');
 assert(patch.startsWith('From '+spec.commit+' '));
 const changed=[...patch.matchAll(/^diff --git a\/([^\s]+) b\/\1$/gm)].map(m=>m[1]);
 assert(changed.length&&!changed.some(p=>p.includes('/uapi/')));
 assert.deepEqual([...changed].sort(),[...primaryFiles].sort(),'Primary component list must match actual patch');
 const overlaps=primaryFiles.flatMap(p=>p.endsWith('.h')?inventory.filter(f=>f.endsWith('/'+p.replace(/^.*?include\//,''))).map(f=>({source:p,path:f})):[]);
 assert(overlaps.length);
 return overlaps.map(({source,path})=>{
  const tokens=spec.headers[source];assert(tokens,'Additional header collision needs review');
  return {source,path,sha256:validateExportedHeader(readHeader(path),tokens),absentPrivateTokens:tokens};
 });
}
