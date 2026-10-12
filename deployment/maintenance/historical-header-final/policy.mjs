// Five individually reviewed historical records; never an actual-kernel waiver.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const reviewFile='historical-header-final-20261012/review.json';
export const expectedStatus='not-affected';
export const cnaCommit='20d9248c60fe62803efade3177e8b82b586d154c';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const documents=Object.freeze({
 'CVE-2019-19814-report.txt':{url:'https://raw.githubusercontent.com/bobfuzzer/CVE/master/CVE-2019-19814/README.md',sha256:'71aecd45322db930495ed037d933bec244275683298a4c588073ef0cacfac351',tokens:['fs/f2fs/segment.c','__remove_dirty_segment']},
 'CVE-2021-3847-report.html':{url:'https://www.openwall.com/lists/oss-security/2021/10/14/3',sha256:'e1ef9e49a61b8c68cc6f714310cf5d6b04a3b6eaeca05af550f23920b3c6e23c',tokens:['CVE-2021-3847','overlayFS driver','copy_up','nosuid']},
 'CVE-2021-3864-report.html':{url:'https://www.openwall.com/lists/oss-security/2021/10/20/2',sha256:'309685294f7ca71e3cda484dff6354215c5d1cf09b66f5114610416517f12946',tokens:['begin_new_exec','fs/exec.c']},
 'CVE-2022-1205-report.html':{url:'https://www.openwall.com/lists/oss-security/2022/04/02/4',sha256:'158fb127272995dcd0d7dd55aab6cea61b14456291564e0d2ffac8d4566ba6d3',tokens:['net/ax25/ax25_timer.c','ax25_heartbeat_expiry','ax25_t1timer_expiry']},
 'drm-mm-v6.12.rst':{url:'https://raw.githubusercontent.com/torvalds/linux/v6.12/Documentation/gpu/drm-mm.rst',sha256:'bb7e1e8ec424932c5ab0039a7aaf0b0e8a212825f897d693ea63fb7ee4d65f9a',tokens:['drm_gem_object_init','shmem_read_mapping_page_gfp','drivers/gpu/drm/drm_gem.c']},
 'overlayfs-copy-up-v5.14.c':{url:'https://raw.githubusercontent.com/torvalds/linux/v5.14/fs/overlayfs/copy_up.c',sha256:'55839462e965edf93cd3295e4ef3f56965a1085f0e9683f836097bb38c6b6c68',tokens:['int ovl_copy_xattr','int ovl_copy_up','ovl_copy_up_inode']},
});
export const components=Object.freeze({
 'CVE-2013-7445':{sha256:'fab83444f88cad8d2387ad47b98704d2e27f0c17ae40919594eec575592d6ea2',provider:'certcc',description:['Linux kernel','Direct Rendering Manager','Graphics Execution Manager','memory consumption'],reference:'https://bugzilla.kernel.org/show_bug.cgi?id=60533',documents:['drm-mm-v6.12.rst'],component:'kernel DRM/GEM object and backing-memory allocation (CNA subsystem attribution; kernel documentation identifies its implementation)',tokens:['drm_gem_object_init','shmem_read_mapping_page_gfp']},
 'CVE-2019-19814':{sha256:'d127d393bbe1979182422143f8807cca79e285c8bcbe4421ee925e0a7eb5c7cc',provider:'mitre',description:['Linux','__remove_dirty_segment'],reference:'https://github.com/bobfuzzer/CVE/tree/master/CVE-2019-19814',documents:['CVE-2019-19814-report.txt'],component:'fs/f2fs/segment.c: __remove_dirty_segment, identified by the CNA-linked original report',tokens:['__remove_dirty_segment']},
 'CVE-2021-3847':{sha256:'fd849a8ec1abaf5078c5ef5c37bb7e4e2fe746f1d70e02f0f0ee6c6f11dabfbc',provider:'redhat',description:['Linux','OverlayFS','nosuid'],reference:'https://www.openwall.com/lists/oss-security/2021/10/14/3',documents:['CVE-2021-3847-report.html','overlayfs-copy-up-v5.14.c'],component:'kernel OverlayFS copy_up capability-copying, identified by the CNA-linked report and upstream fs/overlayfs/copy_up.c',tokens:['ovl_copy_xattr','ovl_copy_up','ovl_copy_up_inode']},
 'CVE-2021-3864':{sha256:'31f166d9908a73adb5e7288f6a2b6aab5de018feb2e511d87c9e5fd0ec4bcf26',provider:'redhat',description:['dumpable','SUID','core_pattern'],product:'kernel',reference:'https://www.openwall.com/lists/oss-security/2021/10/20/2',documents:['CVE-2021-3864-report.html'],component:'fs/exec.c: begin_new_exec, identified by the CNA-linked original report',tokens:['begin_new_exec']},
 'CVE-2022-1205':{sha256:'d3dac0ee9466fc18bb07df9eb8dc2b1cef79761543db0b12a7453577d0f8197b',provider:'redhat',description:['Linux','AX.25'],reference:'https://www.openwall.com/lists/oss-security/2022/04/02/4',documents:['CVE-2022-1205-report.html'],component:'net/ax25/ax25_timer.c: AX.25 expiry callbacks, identified by the CNA-linked original report',tokens:['ax25_heartbeat_expiry','ax25_t1timer_expiry']},
});
export const privateTokens=[...new Set(Object.values(components).flatMap(s=>s.tokens))];
const roles={
 'utilibre-gathio-postgres-1':['debian','6.1.187-1'],
 'utilibre-kitchenowl-app-1':['debian','6.12.111-1'],
 'utilibre-linkding-linkding-1':['debian','6.12.111-1'],
 'utilibre-simplelogin-web-1':['ubuntu','5.15.0-198.208'],
 'utilibre-simplelogin-smtp-1':['ubuntu','5.15.0-198.208'],
 'utilibre-simplelogin-jobs-1':['ubuntu','5.15.0-198.208'],
};
export function eligible(i){
 if(i?.status!=='needs-review'||i.package!=='linux-libc-dev'||!components[i.id]||!Array.isArray(i.containers))return false;
 if(i.scope==='host-os')return i.artifact==='host-dpkg'&&i.targetName==='host-dpkg'&&i.type==='debian'&&i.installed==='6.12.111-1'&&i.containers.length===0;
 return i.scope==='runtime-image'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.targetName===i.artifact&&i.containers.length>0&&i.containers.every(n=>roles[n]?.[0]===i.type&&roles[n]?.[1]===i.installed);
}
export function verifyPrimary(id,body,readDocument){
 const s=components[id];assert(s,'Unreviewed historical identifier');assert.equal(sha(body),s.sha256,'Primary CNA changed');
 const r=JSON.parse(body);assert.equal(r.cveMetadata.cveId,id);assert.equal(r.cveMetadata.state,'PUBLISHED');
 const c=r.containers.cna;assert.equal(c.providerMetadata.shortName,s.provider);
 if(s.product)assert(c.affected.some(a=>a.product===s.product),'Expected original product');
 const description=c.descriptions.find(d=>d.lang==='en')?.value;assert(description);
 for(const token of s.description)assert(description.includes(token),`Missing CNA attribution: ${token}`);
 assert(c.references.some(v=>v.url===s.reference),'Original reference missing from CNA');
 const proof=s.documents.map(file=>{const d=documents[file],b=readDocument(file);assert.equal(sha(b),d.sha256,'Primary supporting document changed');for(const token of d.tokens)assert(b.toString().includes(token));return {file,url:d.url,sha256:d.sha256};});
 return {id,provider:s.provider,cnaSha256:s.sha256,originalReference:s.reference,component:s.component,documents:proof,absentPrivateTokens:s.tokens};
}
export function validateInventory(inv,installed){
 assert.equal(inv.package,'linux-libc-dev');assert.equal(inv.installed,installed);assert.equal(inv.status,'install ok installed');
 assert(inv.headers>100&&inv.records.length>100&&inv.bytes>10000&&inv.bytes<=64*1024**2);
 assert.deepEqual(inv.checkedPrivateTokens,privateTokens);assert.deepEqual(inv.presentPrivateTokens,[]);
 assert(inv.records.every(r=>{
  const allowed=['/.','/usr','/usr/include','/usr/share','/usr/share/doc','/usr/lib','/usr/lib/linux','/usr/lib/linux/uapi'].includes(r.path)||/^\/usr\/(?:include|share\/doc|lib\/linux\/uapi)\//.test(r.path);
  return allowed&&!r.path.includes('/../')&&!/\.(?:c|ko|so|a)$|vmlinuz/.test(r.path)&&['directory','header','document','symlink','missing-document'].includes(r.type)&&
   (r.type!=='missing-document'||r.path.startsWith('/usr/share/doc/'))&&
   (r.type!=='header'||(!r.path.startsWith('/usr/share/doc/')&&r.path.endsWith('.h')))&&
   (['directory','symlink','missing-document'].includes(r.type)||(/^[a-f0-9]{64}$/.test(r.sha256)&&Number.isSafeInteger(r.bytes)&&r.bytes>=0&&r.bytes<=2*1024**2));
 }),'Non-header/docs package content');
 assert.equal(inv.headers,inv.records.filter(r=>r.type==='header').length);
 assert.equal(inv.bytes,inv.records.reduce((n,r)=>n+(r.bytes??0),0));
 assert.equal(inv.payloadSha256,sha(JSON.stringify(inv.records)),'Inventory receipt mismatch');
 return true;
}
