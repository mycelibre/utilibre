import assert from 'node:assert/strict';
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
