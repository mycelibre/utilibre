import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Individually inspected historical CNA records lack Linux's newer structured
// programFiles field. Accept only these unchanged primary records, never a
// general description/keyword heuristic. Original provider/path spelling stays.
export const legacyComponents={
 'CVE-2019-19449': ['67093bc6a17d89dd8f219485fe5ca0d0c700d08ed16f23de5491db1dd651fb39','mitre','fs/f2fs/segment.c'],
 'CVE-2024-21803': ['594a6597d25dd7c5cb769914afdd2080ee9262297be1980cb6418cb809a99451','Anolis','net/bluetooth/af_bluetooth.c'],
 'CVE-2022-3523': ['75a15c19a3e5d070ac694f5553dc45319020acf8cd22dfe4554063320dcdb479','VulDB','mm/memory.c'],
 'CVE-2022-38457': ['6a42bfd3913ea61a8f9149eb4a45f589c5c1ed8ecf3131ff9aecb1ec4ee866db','Anolis','drivers/gpu/vmxgfx/vmxgfx_execbuf.c'],
 'CVE-2022-40133': ['7b7c5d9558c1b282273fdc61253fbe6c8d0e5f7120c957f2ea80a372b1fc8378','Anolis','drivers/gpu/vmxgfx/vmxgfx_execbuf.c'],
 'CVE-2023-6610': ['111685229984340a50b26331686922a6ff9c08315a0f36c6e16857baa8fafaa3','redhat','fs/smb/client/smb2ops.c'],
};
export function historicalKernelPaths(body,id){
 const spec=legacyComponents[id];assert(spec,'Historical component was not individually reviewed');
 assert.equal(createHash('sha256').update(body).digest('hex'),spec[0],'Changed primary record needs review');
 const record=JSON.parse(body);assert.equal(record.cveMetadata.cveId,id);assert.equal(record.cveMetadata.state,'PUBLISHED');
 const cna=record.containers.cna;assert.equal(cna.providerMetadata.shortName,spec[1]);
 const description=cna.descriptions.find(d=>d.lang==='en')?.value;assert(description&&/Linux/.test(description));
 assert(description.toLowerCase().includes(spec[2].toLowerCase()));
 assert(/^(?:drivers|fs|mm|net)\/[A-Za-z0-9_./-]+\.c$/.test(spec[2])&&!spec[2].includes('..'));
 return [spec[2]];
}
export function kernelComponentPaths(record,id){
 assert.equal(record.cveMetadata.cveId,id);
 assert.equal(record.cveMetadata.state,'PUBLISHED');
 const cna=record.containers.cna;
 assert.equal(cna.providerMetadata.shortName,'Linux');
 assert(cna.affected.length&&cna.affected.every(a=>a.product==='Linux'&&a.vendor==='Linux'&&a.programFiles?.length));
 const files=[...new Set(cna.affected.flatMap(a=>a.programFiles))];
 assert(files.every(p=>/^(?:arch|block|drivers|fs|include|io_uring|kernel|lib|mm|net|security|sound|tools|virt)\/[A-Za-z0-9_./-]+\.[ch]$/.test(p)&&!p.includes('..')&&!p.includes('/uapi/')));
 return files;
}
export function headerOverlap(paths,inventory){
 return paths.some(p=>p.endsWith('.h')&&inventory.some(f=>f.endsWith('/'+p.replace(/^.*?include\//,''))));
}
// These exact Linux CNA records also name boot code, a Kconfig or explanatory
// documentation. Keep the general path allowlist strict; review only these
// immutable records, with installed UAPI overlap checks still mandatory.
export const additionalKernelRecords={
 'CVE-2025-71202':{sha256:'4dcea577e35a7412f222b410188a87ebf3a6399dde8f5dbc0474271377084442',files:['arch/x86/Kconfig','drivers/iommu/iommu-sva.c','include/linux/iommu.h','mm/pgtable-generic.c']},
 'CVE-2026-97906':{sha256:'3845a5eb7af1fc8f2962edab3698e1e36bb6d72dc31802cbae34b66ba072d57e',files:['init/main.c']},
 'CVE-2026-99056':{sha256:'b8324d3049396c66b4a415a83dd5a1c32ad9f12dccea1b57fd3e8b4861dd3cc4',files:['Documentation/networking/strparser.rst','include/net/strparser.h','net/strparser/strparser.c']},
};
export function additionalKernelPaths(body,id){
 const spec=additionalKernelRecords[id];assert(spec,'Unreviewed kernel record');
 assert.equal(createHash('sha256').update(body).digest('hex'),spec.sha256,'Changed primary record');
 const r=JSON.parse(body);assert.equal(r.cveMetadata.cveId,id);assert.equal(r.cveMetadata.state,'PUBLISHED');
 const c=r.containers.cna;assert.equal(c.providerMetadata.shortName,'Linux');
 assert(c.affected.length&&c.affected.every(a=>a.product==='Linux'&&a.vendor==='Linux'&&JSON.stringify(a.programFiles)===JSON.stringify(spec.files)));
 return [...spec.files];
}
// One individually reviewed kernel-build advisory, not a general Makefile exception.
export function gcovBuildPaths(body,id){
 assert.equal(id,'CVE-2026-63825');
 // Both inspected immutable CNA records still name only the kernel Makefile.
 // The October 21 revision expands fixed-version/scenario metadata; it does
 // not place GCOV instrumentation in the installed userspace header package.
 assert(['78b61b2f6f339988f1b63c51a5c8c16eae0036cff21efe2c574e961530e8133d',
  'bb4530be37fbc92b5edb6e15c42c5d52e1fb3b5e69bcba22f42ee6e03cebe6ab']
  .includes(createHash('sha256').update(body).digest('hex')),'Changed primary record needs review');
 const r=JSON.parse(body);assert.equal(r.cveMetadata.cveId,id);assert.equal(r.cveMetadata.state,'PUBLISHED');
 const c=r.containers.cna;assert.equal(c.providerMetadata.shortName,'Linux');
 assert(c.affected.length&&c.affected.every(a=>a.product==='Linux'&&a.vendor==='Linux'&&JSON.stringify(a.programFiles)==='["Makefile"]'));
 const d=c.descriptions.find(x=>x.lang==='en').value;
 for(const text of ['GCOV','CFLAGS_GCOV','-fprofile-update=prefer-atomic','inflate_fast()'])assert(d.includes(text));
 return ['Makefile'];
}
