// Five stale DHI metadata records only. This is binary-subpackage attribution,
// not a source-package repair or a claim that the whole image is unaffected.
import assert from 'node:assert/strict';
export const reviewFile='dhi-binary-attribution-20261012/review.json';
export const expectedStatus='not-affected';
export const perlVersion='5.40.1-6+dhi+deb13u1+dhi2';
export const systemdVersion='257.13-1~deb13u1+dhi2';
export const archives=Object.freeze({
 'libperl5.40':{version:perlVersion,sha256:'6c04a71ed211300491d9d16fb8ad4d77c38426b99a80441d6a8500a85d877d73'},
 'perl-base':{version:perlVersion,sha256:'850d078585d4d36e2d7376f79c8248efd54c4c0be1c9c96712dde2fd9d3b529a'},
 'libsystemd0':{version:systemdVersion,sha256:'952b233681e2c55668978044d429abbf8de69bd5c878abe2a2786484a77c7cf9'},
 'libudev1':{version:systemdVersion,sha256:'61ba3217672af41972f6b76c080144c72730bae44dac2e120d6612d11ffdd501'},
});
export const rows=Object.freeze([
 ...['libperl5.40','perl-base'].map(packageName=>({package:packageName,id:'CVE-2026-9538',container:'utilibre-expanded-penpot-exporter-1',artifact:'sha256:906460df3ab8b53623a5a3a5608f2d2c96e0afc0e493abacdc58a7e179596fcc',stale:'5.40.1-6+dhi7',source:'perl'})),
 ...['libsystemd0','libudev1'].map(packageName=>({package:packageName,id:'CVE-2026-16742',container:'utilibre-expanded-penpot-frontend-1',artifact:'sha256:a78bf3c037a53febe5dbd92e8cc15bf4de6d53cb95ad7f608e0398d0d2584303',stale:'257.13-1~deb13u1+dhi1',source:'systemd'})),
 {package:'perl-base',id:'CVE-2026-9538',container:'utilibre-expanded-penpot-frontend-1',artifact:'sha256:a78bf3c037a53febe5dbd92e8cc15bf4de6d53cb95ad7f608e0398d0d2584303',stale:'5.40.1-6+dhi3',source:'perl'},
]);
export function matchingRow(i){
 if(i?.status!=='needs-review'||i.scope!=='runtime-image'||i.type!=='debian'||i.targetName!==i.artifact||!Array.isArray(i.containers)||i.containers.length!==1)return null;
 return rows.find(r=>r.package===i.package&&r.id===i.id&&r.artifact===i.artifact&&r.container===i.containers[0]&&r.stale===i.installed)||null;
}
export const eligible=i=>matchingRow(i)!==null;
export function prove(i,p){
 const row=matchingRow(i);assert(row,'Outside the exact five reviewed records');
 assert.equal(p.image,row.artifact);assert.equal(p.container,row.container);assert.equal(p.package,row.package);
 assert.equal(p.actualVersion,archives[row.package].version);assert.equal(p.archiveSha256,archives[row.package].sha256);
 assert.equal(p.residual.version,row.stale);assert.equal(p.residual.source,row.source);assert.equal(p.residual.path,'/var/lib/dpkg/status.d/'+row.package);assert.match(p.residual.sha256,/^[a-f0-9]{64}$/);
 assert.equal(p.authenticatedIndex,true);assert.equal(p.payloadExact,true);assert(p.fileCount>1);assert.match(p.inventorySha256,/^[a-f0-9]{64}$/);
 assert.equal(p.componentAbsentFromPackage,true);assert.equal(p.component,row.source==='perl'?'Archive::Tar':'systemd-homed');
 return true;
}
