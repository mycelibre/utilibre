import assert from 'node:assert/strict';
export const id='CVE-2026-93516';
export const commit='9442a53c137bb9eb61336c6fd39627912d50cc8d';
export const patchSha256='3188389ad52d63a9896f571992a59eabc754e263bf9d0c9fe15c19c39cd98dca';
export const sourceSha256='e132cd8b4dc90b8fecafb3681acf8965680695ade7cc1fc0b3727b4038ec463c';
// Recorded October and November SQLite overlays retain the same Xvfb package. The reviewer additionally
// requires the complete completed-release chain and exact live payload hashes.
export const exporterImages=['sha256:415f223b6b456bb5d39ad772b71ad379b21ef7bcb1c1607980f9a9dddf0264cf','sha256:913dc9b1408f34c6ff723e6068d7cbefa0840f2fc3a52317199671bd925d0020','sha256:4214c2cc778be6fe46688171acbf574593a5941be42c56398dbbfd3d89682c89','sha256:a56172fb170d7e91574401b1703e77f8e1c32e1a86694348c0a93f806ab78a13','sha256:f2ab9e2bcdafa62f693227581299b481a0184a89fc7b35cb03094902490b82f0','sha256:ce212e9343d9bb10c61ed40543bae62875f1327b1401308b4495d8544b24897c'];
export function eligible(i){
 if(i?.status!=='needs-review'||i.id!==id||i.type!=='debian'||!['xvfb','xserver-common'].includes(i.package)||!Array.isArray(i.containers)||i.targetName!==i.artifact)return false;
 if(i.scope==='host-os')return i.artifact==='host-dpkg'&&i.containers.length===0&&i.installed===(i.package==='xvfb'?'2:21.1.25-1+utilibre1':'2:21.1.25-1');
 return i.scope==='runtime-image'&&[...exporterImages,'sha256:bf748ae83b9d9e0b8ef9ddf4ea57e892cef6614a33f38e573d862f15cc3d40c4'].includes(i.artifact)&&i.containers.length===1&&i.containers[0]==='utilibre-expanded-penpot-exporter-1'&&i.installed===(i.package==='xvfb'?'2:21.1.16-1.3+deb13u4+dhi1+utilibre1':'2:21.1.16-1.3+deb13u4+dhi1');
}
export function functionBlock(source){
 const start=source.indexOf('static Bool\nGrabReferencesDevice('),end=source.indexOf('/**\n * Remove a device from the device list',start);
 assert(start>0&&end>start);const block=source.slice(start,end);
 assert(block.includes('grab->device == dev || grab->modifierDevice == dev'));
 const removalStart=source.indexOf('RemoveDevice(',end),removalEnd=source.indexOf('\n}',removalStart);
 assert(removalStart>end&&removalEnd>removalStart);
 const removal=source.slice(removalStart,removalEnd);
 assert(removal.indexOf('RemovePassiveGrabsForDevice(dev);')>0);
 const closes=[...removal.matchAll(/CloseDevice\((?:dev|tmp)\);/g)];assert(closes.length>0);
 assert(closes.every(m=>m.index>removal.indexOf('RemovePassiveGrabsForDevice(dev);')));
 return block;
}
