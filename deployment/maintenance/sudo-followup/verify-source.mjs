import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const task='/var/lib/utilibre-maintenance/sudo-followup-20261012';
const pins={
 'sudo_1.9.13p3-1+deb12u4.debian.tar.xz':'4c6c7ca0894b431c4d22f8bfd6f032cc0651c60b0cd50f098dee154c11ff4b2d',
 'sudo_1.9.13p3-1+deb12u4.dsc':'48308278bfbef2070b1f47492e39f9e7ac8ff9705aa6c390cd174b5e214c1089',
 'sudo_1.9.13p3-1+deb12u4_amd64.deb':'ea9987f92630be504998516e1ed9c821c483131d0576ff35a09d6e7f8deff10f',
 'sudo_1.9.13p3.orig.tar.gz':'92334a12bb93e0c056b09f53e255ccb7d6f67c6350e2813cd9593ceeca78560b',
 'sudo_1.9.13p3.orig.tar.gz.asc':'f0220d3d78c06b50213d3363c14f0eee65ebdbce49f7870a22b651374f23bd92',
 'sudo_1.9.16p2-3+deb13u2.debian.tar.xz':'4479f56745559b879a5ef1a29d3bd41d6b44644888212169eea8c3a363a9b99c',
 'sudo_1.9.16p2-3+deb13u2.dsc':'43ba6f6bad19d018e277d6a5a6cdc5245f16d58082f997fc29897081a632bfce',
 'sudo_1.9.16p2-3+deb13u2_amd64.deb':'4f926f8f0704575158a90135713977f98f7d50d185969d9a8a405cdce5e3e50c',
 'sudo_1.9.16p2.orig.tar.gz':'976aa56d3e3b2a75593307864288addb748c9c136e25d95a9cc699aafa77239c',
 'sudo_1.9.16p2.orig.tar.gz.asc':'52f2a33420ffe6cc2e150f056e51fccf9f3abb6e82c094c7b7b89401ffb62c01',
 'db669167ca599f2a94cd8a4c5fae9e473c81a2fd.patch':'25e63d068d9008c0cacc1b0bcb6d220a9c807a71704047758440caa01aa6428b',
 '1820a349687522f51023d1ae5925125f59679a8c.patch':'6190bc974ed4aa09d9f9e3d39502c246959a5d62da2ff8f9addd1c61e968673d'
};
const sourceIndex=readFileSync(task+'/source-index.txt','utf8');
for(const [file,hash] of Object.entries(pins)){
 assert.equal(createHash('sha256').update(readFileSync(task+'/sources/'+file)).digest('hex'),hash,file);
 if(file.startsWith('sudo_')&&!file.endsWith('.deb')) assert(sourceIndex.includes(hash),`Authenticated APT source index: ${file}`);
 if(file.endsWith('.deb')){const version=file.match(/^sudo_(.*)_amd64.deb$/)[1];assert(readFileSync(`${task}/package-${version}.txt`,'utf8').includes('SHA256: '+hash));}
}
console.log('Both native sudo sources/rollback packages match signed APT indexes; both official fixes match pinned checksums.');
