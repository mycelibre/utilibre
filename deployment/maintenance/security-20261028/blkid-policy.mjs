import fs from 'node:fs';
export const reviewFile='security-20261028/blkid/review.json';
export const librarySha256='e7c8ba644880df7594fef438046a271b389bc8e02688c72d58692928e1be854e';
const specs=JSON.parse(fs.readFileSync(new URL('./blkid-inputs.json',import.meta.url))).rows;
const packages=new Set(['bsdutils','libblkid1','libmount1','libsmartcols1','libuuid1','mount','util-linux','util-linux-extra','libfdisk1']);
export function eligible(i){
 if(i?.status!=='needs-review'||i.scope!=='runtime-image'||i.type!=='debian'||i.id!=='CVE-2026-53615'||!packages.has(i.package))return false;
 const version=i.package==='bsdutils'?'1:2.38.1-5+deb12u3':['libmount1','mount'].includes(i.package)?'2.38.1-5+deb12u3+utilibre1':'2.38.1-5+deb12u3';
 return i.installed===version&&/^sha256:[a-f0-9]{64}$/.test(i.artifact||'')&&i.containers?.length===1&&specs.some(s=>s.containers[0]===i.containers[0]);
}
