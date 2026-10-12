import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const input='/var/lib/utilibre-maintenance/qemu-component-followup-20261012',root='/var/lib/utilibre-maintenance/qga-native-followup-20261012';
const files={
 'sources/qemu_10.0.13+ds-0+deb13u1.dsc':'a426c892e5369058c3423816c8625bc8010bb5a58ece57261f62b64ee4d765ad',
 'sources/qemu_10.0.13+ds.orig.tar.xz':'6a0888e806c2ffc0c5f0733e974f9aea55491950d3c47c98669c8b236dde59ae',
 'sources/qemu_10.0.13+ds-0+deb13u1.debian.tar.xz':'da73c092f5684c551b0334d675eb16a3dec91e1edea94759cfb1102fa4a0364e',
 'packages/qemu-guest-agent_10.0.13+ds-0+deb13u1_amd64.deb':'7d7d6be6a52d6ea21eabdb78f686e4bb886f933171d33f5f3cf3cf2390343abd',
 'guest-agent-332ab334bc6b0b43bc17c90820fec068b63a666b.patch':'8b7b122ef83e47078e0f31188405ca1d7dc86f8ba941b2f886abf81295b7e21e'
};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [file,digest]of Object.entries(files)){const dest=root+'/inputs/'+path.basename(file);fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(input+'/'+file)){assert.equal(sha(input+'/'+file),digest);if(!fs.existsSync(dest))fs.copyFileSync(input+'/'+file,dest);}else if(!fs.existsSync(dest)){const url=file.endsWith('.patch')?'https://github.com/qemu/qemu/commit/332ab334bc6b0b43bc17c90820fec068b63a666b.patch':'https://deb.debian.org/debian/pool/main/q/qemu/'+path.basename(file);const response=await fetch(url,{signal:AbortSignal.timeout(60000)});assert(response.ok);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),digest);fs.writeFileSync(dest,bytes,{flag:'wx'});}assert.equal(sha(dest),digest);}
console.log(JSON.stringify({authenticatedNativeInputs:true,upstreamStablePatch:true,files:Object.keys(files).length}));
