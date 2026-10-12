import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/heif-bookworm-followup-20261012';
export const pins={
 'libheif_1.15.1-1+deb12u1.dsc':'e89ce8b9cefe4a72050d2076e0d63206eab20d7b2b8bb699ae576e89073143f3',
 'libheif_1.15.1-1+deb12u1.debian.tar.xz':'f3a042fce4231e8feddd032bf93b808a6db96614c20888b78d1042a15e378817',
 'libheif_1.15.1.orig.tar.gz':'28d5a376fe7954d2d03453f983aaa0b7486f475c27c7806bda31df9102325556',
 'b8c12a7b70f46c9516711a988483bed377b78d46.patch':'151010275d63db3e19fc72eecfaca40846a19905870494e86e33421c7e2c57b5',
 'b8c12a7b70f46c9516711a988483bed377b78d46-path-only.patch':'8f43ea824d2b350bfdb8251df4e22abc1a5bb2394b861d090b279e7458d4da35',
 '22b6266bf03a9f016f84a9b57b80e1dd7c79d64a.patch':'f6d49ea19511f6adbfbc279b2fa30f1234bf4091721227a39ddfca58612f7ddb',
 '22b6266bf03a9f016f84a9b57b80e1dd7c79d64a-path-only.patch':'c0d2673de8be42bd4103740d18d9218c5c6fc7dffd05440f4aee576a3209b7ca'
};
for(const [file,hash]of Object.entries(pins))assert.equal(createHash('sha256').update(fs.readFileSync(root+'/sources/'+file)).digest('hex'),hash,file);
for(const id of ['b8c12a7b70f46c9516711a988483bed377b78d46','22b6266bf03a9f016f84a9b57b80e1dd7c79d64a']){
 const original=fs.readFileSync(root+'/sources/'+id+'.patch','utf8'),adjusted=fs.readFileSync(root+'/sources/'+id+'-path-only.patch','utf8');
 assert.equal(adjusted,original.replaceAll('libheif/image/pixelimage.cc','libheif/heif_image.cc').replaceAll('libheif/pixelimage.cc','libheif/heif_image.cc'));
}
console.log('Exact Debian 1.15.1 source and two official filename-only fixes pinned; no changed security-code bytes.');
