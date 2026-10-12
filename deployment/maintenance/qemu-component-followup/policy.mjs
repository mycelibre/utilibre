import assert from 'node:assert/strict';
export const reviewFile='qemu-component-followup-20261012/review.json';
export const version='1:10.0.13+ds-0+deb13u1';
export const derivedVersion=version+'+utilibre1';
export const derivedPin={archive:'e3c0c19978a72070bbe08f4f0ea7912bb757c9ae1c0c66f88652d6143d6d58bb',binary:'d4f3b4cd1c71e7beada128608882eb41206509d411da8c46811fcbe2c0375cce',source:'ff3d6d2eca202b838663058d2ec419e50d8154a7c833a0c07b1eab487b1862fd'};
export const emulatorCves=['CVE-2022-3872','CVE-2023-1386','CVE-2026-81627','CVE-2026-93834'];
export const pins={'qemu-guest-agent':'7d7d6be6a52d6ea21eabdb78f686e4bb886f933171d33f5f3cf3cf2390343abd','qemu-utils':'6d31339b1630153fe7c5f8a51426b8fa6ce35731aeb015a84f2d333c4e4dca30'};
export const executables={'qemu-guest-agent':['/usr/sbin/qemu-ga'],'qemu-utils':['/usr/bin/qemu-img','/usr/bin/qemu-io','/usr/bin/qemu-nbd','/usr/bin/qemu-storage-daemon']};
export const sources={
 'meson.build':'eeb49783b87f3e1c53df4fe7d58d13983dfda2af995bbc8f63263db824161cc1',
 'qga/meson.build':'578eeb1f6eee2fe86c9faee96e2d55bc603614953b0053d1104746bcc03fe5a6',
 'storage-daemon/meson.build':'699f984c95cec7c25baa7984ab590b1aa602f430257b8ecb390f980ab3b6500c',
 'debian/qemu-utils.install':'5496c0eb5210ca169cee0bf871ee2059ef6d25937bd02bdec9d2712dc1ca9429',
 'debian/qemu-guest-agent.install':'ceff585135cfa397b8528486af8150a8de45e5ef7d02277ea3bd300a3b7cc0dc',
 'hw/sd/meson.build':'2a63186b1c321e152e383d291fa281abed458115459f5d432904cfe1fbf55792',
 'hw/i386/meson.build':'69d8cd8a6cda1f32eea1d627243d7e832f4289dacae82956da08880b86f65452',
 'hw/9pfs/meson.build':'a8b36c63efdb0b90cf999628f1d97d7f240570ae68616b56830b9436533606a5'
};
export function eligible(i){return i?.status==='needs-review'&&i.scope==='host-os'&&i.artifact==='host-dpkg'&&i.type==='debian'&&i.containers?.length===0&&(i.installed===version||(i.installed===derivedVersion&&i.package==='qemu-guest-agent'))&&Object.hasOwn(pins,i.package)&&(emulatorCves.includes(i.id)||(i.package==='qemu-utils'&&i.id==='CVE-2026-12080'));}
export function prove(item,evidence){assert(eligible(item));assert.equal(evidence.package,item.package);assert.equal(evidence.installed,item.installed);assert.equal(evidence.archiveSha256,pins[item.package]);assert(evidence.signedSourceBuildSeparation);if(item.installed===derivedVersion){assert(evidence.exactNativeRelease&&evidence.controlPlaneConfirmed&&evidence.nativeSourceOnlyExpectedPatch);assert.equal(evidence.candidateArchiveSha256,derivedPin.archive);assert.equal(evidence.candidateBinarySha256,derivedPin.binary);assert.equal(evidence.patchedSourceSha256,derivedPin.source);}else assert(evidence.everyFileMatchesSignedArchive);assert.equal(evidence.fileCount,item.package==='qemu-utils'?16:12);assert.deepEqual(evidence.elfFiles,executables[item.package]);assert.deepEqual(evidence.sourceHashes,sources);}
