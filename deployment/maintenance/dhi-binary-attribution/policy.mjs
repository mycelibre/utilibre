// Five stale DHI metadata records only. This is binary-subpackage attribution,
// not a source-package repair or a claim that the whole image is unaffected.
import assert from 'node:assert/strict';
import {exporterBinding} from '../xvfb-single-screen-final/release-binding.mjs';
export const reviewFile='dhi-binary-attribution-20261012/review.json';
export const expectedStatus='not-affected';
export const perlVersion='5.40.1-6+dhi+deb13u1+dhi2';
export const systemdVersion='257.13-1~deb13u1+dhi2';
export const exporterBefore='sha256:906460df3ab8b53623a5a3a5608f2d2c96e0afc0e493abacdc58a7e179596fcc';
export const exporterAfter='sha256:415f223b6b456bb5d39ad772b71ad379b21ef7bcb1c1607980f9a9dddf0264cf';
export const exporterCurrent='sha256:913dc9b1408f34c6ff723e6068d7cbefa0840f2fc3a52317199671bd925d0020';
export const restrictedXvfb='620f43dd4999c7602e86730c208e2c78f0007170451669fb9220f1a0a32c4891';
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
 const original=rows.find(r=>r.package===i.package&&r.id===i.id&&r.container===i.containers[0]&&r.stale===i.installed);if(!original)return null;
 if(original.artifact===i.artifact)return original;
 // Only the separately proved one-screen transition; never arbitrary descendants.
 if(original.artifact===exporterBefore&&[exporterAfter,exporterCurrent].includes(i.artifact))return {...original,artifact:i.artifact,predecessor:exporterBefore};
 return null;
}
export const eligible=i=>matchingRow(i)!==null;
export function exporterAncestry(stage,release,verified,scan){
 assert.equal(stage.container,'utilibre-expanded-penpot-exporter-1');assert.equal(stage.base,exporterBefore);assert.equal(stage.image,exporterAfter);
 assert(stage.passed&&stage.allOtherApplicationLibraryConfigBytesUnchanged&&stage.allOtherPackagesUnchanged&&stage.configurationUnchanged);
 exporterBinding(release,stage);assert(Date.parse(release.completedAt)<=Date.parse(scan.date),'Fresh scan must follow exporter release');
 // verified is produced by completed("dhi", scan), which rechecks the full
 // source/native/application gates and live Xvfb/common-package payloads.
 assert.equal(verified.role,'dhi');assert([exporterAfter,exporterCurrent].includes(verified.image));assert.equal(verified.binarySha256,restrictedXvfb);assert.equal(verified.completedAt,release.completedAt);assert.match(verified.receiptSha256,/^[a-f0-9]{64}$/);
 return {predecessor:exporterBefore,...verified};
}
export function prove(i,p){
 const row=matchingRow(i);assert(row,'Outside the exact five reviewed records');
 assert.equal(p.image,row.artifact);assert.equal(p.container,row.container);assert.equal(p.package,row.package);
 assert.equal(p.actualVersion,archives[row.package].version);assert.equal(p.archiveSha256,archives[row.package].sha256);
 assert.equal(p.residual.version,row.stale);assert.equal(p.residual.source,row.source);assert.equal(p.residual.path,'/var/lib/dpkg/status.d/'+row.package);assert.match(p.residual.sha256,/^[a-f0-9]{64}$/);
 assert.equal(p.authenticatedIndex,true);assert.equal(p.payloadExact,true);assert(p.fileCount>1);assert.match(p.inventorySha256,/^[a-f0-9]{64}$/);
 assert.equal(p.componentAbsentFromPackage,true);assert.equal(p.component,row.source==='perl'?'Archive::Tar':'systemd-homed');
 if(row.predecessor){assert.equal(p.ancestry?.predecessor,exporterBefore);assert.equal(p.ancestry?.role,'dhi');assert.equal(p.ancestry?.image,row.artifact);assert.equal(p.ancestry?.binarySha256,restrictedXvfb);assert.match(p.ancestry?.receiptSha256||'',/^[a-f0-9]{64}$/);assert(Number.isFinite(Date.parse(p.ancestry?.completedAt)));}
 return true;
}
