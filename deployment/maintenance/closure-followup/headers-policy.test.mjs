import test from 'node:test';
import assert from 'node:assert/strict';
import {kernelComponentPaths,headerOverlap,historicalKernelPaths,legacyComponents} from './headers-policy.mjs';
const record=files=>({cveMetadata:{cveId:'CVE-2026-12345',state:'PUBLISHED'},containers:{cna:{providerMetadata:{shortName:'Linux'},affected:[{product:'Linux',vendor:'Linux',programFiles:files}]}}});
test('only explicit Linux CNA private compiled paths qualify',()=>{
 assert.deepEqual(kernelComponentPaths(record(['fs/example.c','include/linux/private.h']),'CVE-2026-12345'),['fs/example.c','include/linux/private.h']);
 for(const files of [[],['include/uapi/linux/types.h'],['arch/x86/include/uapi/asm/signal.h'],['fs/../../etc/passwd.c'],['https://example.invalid/a.c'],['Documentation/advisory.rst']])assert.throws(()=>kernelComponentPaths(record(files),'CVE-2026-12345'));
 const other=record(['fs/example.c']);other.containers.cna.providerMetadata.shortName='other';assert.throws(()=>kernelComponentPaths(other,'CVE-2026-12345'));
 assert.throws(()=>kernelComponentPaths(record(['fs/example.c']),'CVE-2026-99999'));
 const withdrawn=record(['fs/example.c']);withdrawn.cveMetadata.state='REJECTED';assert.throws(()=>kernelComponentPaths(withdrawn,'CVE-2026-12345'));
});
test('ambiguous installed header overlaps are retained for manual review',()=>{
 assert(headerOverlap(['include/linux/types.h'],['/usr/include/linux/types.h']));
 assert(headerOverlap(['arch/x86/include/asm/signal.h'],['/usr/include/x86_64-linux-gnu/asm/signal.h']));
 assert(!headerOverlap(['fs/example.c','include/linux/private.h'],['/usr/include/linux/types.h']));
});
test('historical CNA attribution fails closed on new records and changed content',()=>{
 assert.equal(Object.keys(legacyComponents).length,6);
 for(const id of Object.keys(legacyComponents))assert.throws(()=>historicalKernelPaths(JSON.stringify(record(['fs/example.c'])),id));
 assert.throws(()=>historicalKernelPaths('{}','CVE-2021-3847'));
});
