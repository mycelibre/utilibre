// Read-only vendor acquisition: authenticated cached Ubuntu security indexes.
import fs from 'node:fs';import assert from 'node:assert/strict';import cp from 'node:child_process';
import {root,sha,run,docker,limits} from './common.mjs';
process.umask(0o077);
const input='/var/lib/utilibre-maintenance/perl-ubuntu-followup-20261012/input',out=root+'/ubuntu-input';fs.mkdirSync(out,{recursive:true});
const release=input+'/security.ubuntu.com_ubuntu_dists_noble-security_InRelease';
docker('run',...limits,'--read-only','--mount','type=bind,src='+input+',dst=/inputs,readonly','--entrypoint','gpgv','sha256:4a5ca3309d1d141e1f52846f48c29b854bef47e1e50c0c08c8c5574b28cb6385','--keyring','/usr/share/keyrings/ubuntu-archive-keyring.gpg','/inputs/security.ubuntu.com_ubuntu_dists_noble-security_InRelease');
const signed=fs.readFileSync(release,'utf8'),indexes={};
for(const [kind,path]of [['source','main/source/Sources'],['binary','main/binary-amd64/Packages']]){
 const bytes=cp.execFileSync('/usr/lib/apt/apt-helper',['cat-file',input+'/security.ubuntu.com_ubuntu_dists_noble-security_'+path.replaceAll('/','_')+'.lz4'],{maxBuffer:40*1024**2});
 assert(new RegExp('^ '+sha(bytes)+' +'+bytes.length+' '+path.replaceAll('.','\\.')+'$','m').test(signed));indexes[kind]=bytes.toString();
}
const version='2.39.3-9ubuntu6.6',entry=indexes.source.split('\n\n').find(e=>e.startsWith('Package: util-linux\n')&&e.includes('\nVersion: '+version+'\n'));assert(entry);
const directory=entry.match(/^Directory: (.+)$/m)?.[1];assert(directory?.startsWith('pool/main/u/util-linux'));
const sums=entry.match(/Checksums-Sha256:\n((?: [^\n]+\n)+)/)?.[1];assert(sums);
const files=[];
for(const line of sums.trim().split('\n')){
 const[hash,size,name]=line.trim().split(/\s+/);assert(/^util-linux_[A-Za-z0-9.+~_-]+\.(?:tar\.(?:xz|gz)|dsc|debian\.tar\.xz)$/.test(name));
 const path=out+'/'+name;if(!fs.existsSync(path)){const response=await fetch('https://security.ubuntu.com/ubuntu/'+directory+'/'+name,{signal:AbortSignal.timeout(60000)});assert(response.ok);fs.writeFileSync(path,Buffer.from(await response.arrayBuffer()));}
 const bytes=fs.readFileSync(path);assert.equal(bytes.length,Number(size));assert.equal(sha(bytes),hash);files.push({name,sha256:hash,bytes:bytes.length});
}
fs.writeFileSync(out+'/source-authentication.json',JSON.stringify({date:new Date().toISOString(),passed:true,version,releaseSha256:sha(fs.readFileSync(release)),entry,files},null,2)+'\n');
console.log('Exact Ubuntu Noble 2.39.3-9ubuntu6.6 vendor source authenticated; no installation.');
