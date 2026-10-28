// Reviewed kernel-private vs exported-UAPI name collisions, not a kernel waiver.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=v=>createHash('sha256').update(v).digest('hex');
export const overlapSpecs={
 'CVE-2025-71202':{commit:'9f0a7ab700f8620e433b05c57fbd26c92ea186d9',sha256:'7d94fc4da6842c807bb5038de02ff8aaa75a090a71cc83103bea5b911e942469',headers:{'include/linux/iommu.h':['iommu_mm_data','sva_domains','mm_list_elm','iommu_sva_invalidate_kva_range']}},
 'CVE-2026-64078':{commit:'b4597d5fd7d2f8cebfffd40dffb5e003cc78964c',sha256:'92aca995269a2d737dccd8b5281449b6674d3f0e7fa621dc5c2132fe7ec51767',headers:{'include/linux/netfilter/x_tables.h':['xt_unregister_table','xt_unregister_table_pre_exit','xt_unregister_table_exit']}},
 'CVE-2026-98799':{commit:'17637e1a581a22466ac3620a91e099683ff9cc6f',sha256:'66b97d978f0046e95af1ea844cf2d1d9ca9cb9b2d55b6aa5272faa41fd91af75',headers:{'include/linux/bpf.h':['bpf_tramp_skip','bpf_tramp_image','bpf_tramp_image_add_skip','arch_bpf_trampoline_skip','BPF_MAX_TRAMP_LINKS']}},
 'CVE-2026-98800':{commit:'0fb5751a6e411b1b466c06e50021818d9391df98',sha256:'6f12fb3150f5557e246c1778c15b9c4f5fc0d092e3c83daa4d61221340ad85fe',headers:{'include/linux/bpf.h':['bpf_prog_aux','tramp_linked']}},
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
