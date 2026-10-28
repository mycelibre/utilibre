import assert from 'node:assert/strict';
export const binarySha256='35b5bc637a1a2df68a119d38d04ffd6b77ef06bef7c810242f5cca3da2d61239';
export const changedFiles=['/usr/local/share/licenses/nginx-1.30.6/copyright','/usr/sbin/nginx'];
export function eligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&
 ['CVE-2026-15176','CVE-2026-93479','CVE-2026-97205'].includes(i.id)&&['nginx','nginx-common'].includes(i.package)&&
 i.installed==='1.22.1-9+deb12u10'&&i.containers?.length===1&&i.containers[0]==='utilibre-community-rssbridge-1';}
export function prove(b,a,v,scan){
 assert(b.passed&&b.configurationUnchanged&&b.packageMetadataPreserved&&b.version==='1.30.6');
 assert.equal(b.base,'sha256:b540fb1d954f85cd6bb1ee8e69c8b935db30ecbbc4e7ab8408687b27a47b3914');
 assert.equal(b.binarySha256,binarySha256);assert.equal(b.pin.sha256,'8e505dccb99697371eb72fe1c58d29d82f7a3c4f0f8eb57d65df72d44edb676f');
 assert.deepEqual(b.changedFiles,changedFiles);assert(v.passed&&v.imageId===b.imageId);assert.deepEqual(v.changedPaths,changedFiles);
 assert(a.passed&&a.imageId===b.imageId&&a.consumerUnchanged&&a.rows.length===2);
 assert.deepEqual(a.rows.map(r=>r.imageId),[b.base,b.imageId]);
 assert(a.rows.every(r=>r.passed&&r.checks===14&&r.nativeNginxPhp&&r.privatePathsDenied&&r.boundedRateLimit));
 assert(scan.passed&&scan.imageId===b.imageId&&scan.primarySourceFixVerified&&scan.newHighCritical===0);
}
