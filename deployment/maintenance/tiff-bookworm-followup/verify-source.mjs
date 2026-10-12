import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const root='/var/lib/utilibre-maintenance/tiff-bookworm-followup-20261012';
export const pins={
 'tiff_4.5.0-6+deb12u4.dsc':'b32082304d725936078d687303fcf771c9ecf738b505f9a66a29e8ba282c8615',
 'tiff_4.5.0-6+deb12u4.debian.tar.xz':'4ee50a8cdf74a184d94e65a04f3c9de466cb0b74ef5393fb5ca65666fccb864b',
 'tiff_4.5.0.orig.tar.bz2':'638f43d7dea33948d5dee7f39572fc0194d9cc3c74195de9dd26a4388a1f880a',
 'libtiff6_4.5.0-6+deb12u4_amd64.deb':'255cd1d9f204355c366638ee21756234a8d43c03a3de18a5af6cdd94765b5053',
 'tiff_4.7.2-1.dsc':'26ce045ca8ffdb562ff2978834f79f067a552e95276deba1dc686aaffd580ad3',
 'tiff_4.7.2-1.debian.tar.xz':'7b71ad0b032022ec533171cad96c7823845d3c09254f1c073f03853801ca1c80',
 'tiff_4.7.2.orig.tar.bz2':'c5086d8f7c5ba51ca98241f24a8bd1cb66218c399077aeccbf6a236cf3152acc',
 'ba2b04b114c5dd945107ccc613cedfcca3af73bb.patch':'a24aa5036ab13728567ae06745869928d2ee354c8958598c2d6112b238949313',
 '51fa6dfe93f20da0d38f079fbc61c7c960bcbc16.patch':'14b308069a3ae92c11b501af60d59595eab132b406f2663272dbdda4a98fd509',
 'f9bda11bf2fc819b971517582666d56f18b1bc3f.patch':'c92dca8edc92db4f5a4e6d955ee72d3be12bb811ebb147caebcc5cbdce51eb39',
 '90601d9a23382d98f3695ec14441145c37a77574.patch':'76448c75bb0174e89598403f86b02238792c2bb8ae5e41410888b6321884d722',
 'eedba405d3695b52faae65994c5904f228eca0bf.patch':'9ec349fbcc0b52fb7e2215e6dd92762b1d4a1eee3cb5996b3764702b23fb5163'
};
const sourceIndex=readFileSync(root+'/source-index.txt','utf8');
for(const [name,sha]of Object.entries(pins)){
 assert.equal(createHash('sha256').update(readFileSync(root+'/sources/'+name)).digest('hex'),sha,name);
 if(/^tiff_4\.5/.test(name))assert(sourceIndex.includes(sha),'Signed baseline source index '+name);
 if(name.endsWith('.deb'))assert(readFileSync(root+'/package-index.txt','utf8').includes('SHA256: '+sha));
}
console.log('Pinned Debian baseline, rollback, official 4.7.2 source and upstream fixes verified. Detached Debian source signature must pass inside the compiler.');
