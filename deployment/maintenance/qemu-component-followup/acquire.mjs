// Read-only signed native archive/source inspection; no installation or service control.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const root='/var/lib/utilibre-maintenance/qemu-component-followup-20261012';fs.mkdirSync(root+'/sources',{recursive:true});fs.mkdirSync(root+'/packages',{recursive:true});
const version='1:10.0.13+ds-0+deb13u1',opts=['-o','Dir::Etc::sourcelist=/home/ubuntu/freetools/deployment/maintenance/xserver-followup/review.sources','-o','Dir::Etc::sourceparts=-','-o','Dir::State::lists=/var/lib/utilibre-maintenance/xserver-followup-20261012/apt-lists'];
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const apt=(...args)=>cp.execFileSync('apt-cache',[...opts,...args],{encoding:'utf8',maxBuffer:8*1024**2});
async function get(remote,local,hash){assert(remote.startsWith('pool/main/q/qemu/')&&!remote.includes('..'));if(!fs.existsSync(local)){const response=await fetch('https://deb.debian.org/debian/'+remote,{signal:AbortSignal.timeout(60000)});assert(response.ok);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);fs.writeFileSync(local,bytes,{flag:'wx'});}assert.equal(sha(local),hash);}
const sourceIndex=apt('showsrc','qemu').split(/\n\s*\n/).find(s=>s.startsWith('Package: qemu\n')&&s.includes('\nVersion: '+version+'\n'));assert(sourceIndex);
const sourceFiles=sourceIndex.match(/^Checksums-Sha256:\n((?: .+\n?)+)/m)[1].trim().split('\n').map(s=>s.trim().split(/\s+/)).map(([sha256,bytes,file])=>({sha256,bytes:Number(bytes),file}));
assert.equal(sourceFiles.find(f=>f.file.endsWith('.dsc')).sha256,'a426c892e5369058c3423816c8625bc8010bb5a58ece57261f62b64ee4d765ad');
for(const f of sourceFiles)await get('pool/main/q/qemu/'+f.file,root+'/sources/'+f.file,f.sha256);
fs.writeFileSync(root+'/sources/source-index.txt',sourceIndex+'\n');const packages=[];
for(const name of ['qemu-guest-agent','qemu-utils']){
 const index=apt('show',name+'='+version).trim(),remote=index.match(/^Filename: (.+)$/m)[1],hash=index.match(/^SHA256: (.+)$/m)[1],file=remote.split('/').at(-1);await get(remote,root+'/packages/'+file,hash);packages.push({name,version,file,sha256:hash});fs.writeFileSync(root+'/packages/'+name+'-index.txt',index+'\n');
}
if(!fs.existsSync(root+'/source'))cp.execFileSync('dpkg-source',['-x',root+'/sources/qemu_10.0.13+ds-0+deb13u1.dsc',root+'/source'],{stdio:'pipe',timeout:60000});
fs.writeFileSync(root+'/acquisition.json',JSON.stringify({date:new Date().toISOString(),version,sourceFiles,packages,hostChanged:false},null,2)+'\n');console.log(JSON.stringify({sourceArchives:sourceFiles.length,binaryArchives:packages.length,hostChanged:false}));
