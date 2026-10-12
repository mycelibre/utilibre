import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {packages,version,simulationGate} from './policy.mjs';
const root='/var/lib/utilibre-maintenance/perl-ubuntu-followup-20261012',dir=root+'/input';
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:40*1024**2}).trim();
const release=dir+'/security.ubuntu.com_ubuntu_dists_noble-security_InRelease';
run('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','128m','--cpus','.5','--pids-limit','32','--log-driver','none','--mount','type=bind,src='+dir+',dst=/inputs,readonly','--entrypoint','gpgv','sha256:4a5ca3309d1d141e1f52846f48c29b854bef47e1e50c0c08c8c5574b28cb6385','--keyring','/usr/share/keyrings/ubuntu-archive-keyring.gpg','/inputs/security.ubuntu.com_ubuntu_dists_noble-security_InRelease']);
const signed=fs.readFileSync(release,'utf8');assert(signed.includes('Suite: noble-security'));
const indexes={};for(const [key,path,file]of [['packages','main/binary-amd64/Packages','main_binary-amd64_Packages'],['source','main/source/Sources','main_source_Sources']]){
 const data=cp.execFileSync('/usr/lib/apt/apt-helper',['cat-file',dir+'/security.ubuntu.com_ubuntu_dists_noble-security_'+file+'.lz4'],{maxBuffer:40*1024**2});
 const hash=sha(data);assert(new RegExp('^ '+hash+' +'+data.length+' '+path.replaceAll('.','\\.')+'$','m').test(signed),'Signed index mismatch');indexes[key]=data.toString();
}
simulationGate(fs.readFileSync(dir+'/simulation.txt','utf8'));
const rows=[];for(const name of packages){
 const entry=indexes.packages.split('\n\n').find(e=>e.startsWith('Package: '+name+'\n')&&e.includes('\nVersion: '+version+'\n'));assert(entry,name);
 const fields=Object.fromEntries(entry.split('\n').filter(l=>/^[A-Za-z]/.test(l)).map(l=>{const i=l.indexOf(': ');return[l.slice(0,i),l.slice(i+2)];}));
 const file=fields.Filename.split('/').at(-1),bytes=fs.readFileSync(dir+'/'+file);assert.equal(sha(bytes),fields.SHA256);assert.equal(bytes.length,Number(fields.Size));
 assert.equal(run('dpkg-deb',['-f',dir+'/'+file,'Package']),name);assert.equal(run('dpkg-deb',['-f',dir+'/'+file,'Version']),version);
 rows.push({name,file,version,sha256:sha(bytes),bytes:bytes.length});
}
const source=indexes.source.split('\n\n').find(e=>e.startsWith('Package: perl\n')&&e.includes('\nVersion: '+version+'\n'));assert(source);
const sums=source.match(/Checksums-Sha256:\n((?: [^\n]+\n)+)/)?.[1];assert(sums);const sources=[];
for(const line of sums.trim().split('\n')){const[h,size,file]=line.trim().split(/\s+/);const b=fs.readFileSync(dir+'/'+file);assert.equal(sha(b),h);assert.equal(b.length,Number(size));sources.push({file,sha256:h,bytes:b.length});}
const report={date:new Date().toISOString(),passed:true,authentication:'Ubuntu archive keyring from exact official-derived native image; gpgv signed InRelease → decompressed Security indexes → exact binary/source SHA256',signedReleaseSha256:sha(fs.readFileSync(release)),packages:rows,sources,sourceBytes:sources.reduce((n,r)=>n+r.bytes,0),packageBytes:rows.reduce((n,r)=>n+r.bytes,0)};
fs.writeFileSync(root+'/inputs.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
