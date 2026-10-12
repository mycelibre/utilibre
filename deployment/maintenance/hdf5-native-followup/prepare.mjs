// Only this disposable compiler and this followup's owned work directory change.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,s=JSON.parse(fs.readFileSync(here+'spec.json')),w=s.work;
const run=(...a)=>execFileSync(a[0],a.slice(1),{encoding:'utf8',maxBuffer:8e6,timeout:60000}).trim(),sha=b=>createHash('sha256').update(b).digest('hex');
const prior='/var/lib/utilibre-maintenance/openldap-followup-20261012/next-assessment';
const bundled=new URL('../sources/',import.meta.url).pathname;
assert(!fs.existsSync(w+'/source'));fs.mkdirSync(w+'/source',{recursive:true});
for(const[name,hash]of Object.entries(s.sourceFiles)){const b=fs.readFileSync(fs.existsSync(bundled+name)?bundled+name:prior+'/hdf5/'+name);assert.equal(sha(b),hash);fs.writeFileSync(w+'/source/'+name,b);}
for(const[suffix,hash]of [['.patch',s.upstreamPatchSha256],['-context-only.patch',s.adjustedPatchSha256]]){const name=s.commit+suffix,b=fs.readFileSync(fs.existsSync(bundled+name)?bundled+name:prior+'/'+name);assert.equal(sha(b),hash);fs.writeFileSync(w+'/source/'+name,b);}
const changed=t=>t.split('\n').filter(l=>/^[+-]/.test(l)&&!/^---|^\+\+\+/.test(l));
assert.deepEqual(changed(fs.readFileSync(w+'/source/'+s.commit+'.patch','utf8')),changed(fs.readFileSync(w+'/source/'+s.commit+'-context-only.patch','utf8')),'Code changes must be byte-for-byte upstream; context-only adaptation');
const builder=JSON.parse(run('docker','inspect',s.builder))[0];assert.equal(builder.Image,s.builderImage);assert(builder.HostConfig.NanoCpus<=2e9&&builder.HostConfig.Memory<=4*1024**3);
const disk=fs.statfsSync(w);assert(disk.bavail*disk.bsize>8*1024**3);
run('docker','exec',s.builder,'mkdir','-p',s.builderWork+'/recipe');run('docker','cp',w+'/source',s.builder+':'+s.builderWork+'/source');run('docker','cp',here+'.',s.builder+':'+s.builderWork+'/recipe');
const signature=run('docker','exec',s.builder,'gpgv','--status-fd','1','--keyring','/usr/share/keyrings/debian-keyring.gpg','--keyring','/usr/share/keyrings/debian-maintainers.gpg',s.builderWork+'/source/hdf5_1.10.8+repack1-1.dsc');assert(signature.includes('VALIDSIG '+s.sourceSigner));
fs.writeFileSync(w+'/source/authenticated.json',JSON.stringify({date:new Date().toISOString(),sourceFiles:s.sourceFiles,signature,upstreamPatchSha256:s.upstreamPatchSha256,adjustedPatchSha256:s.adjustedPatchSha256,codeChangesIdentical:true,builder:builder.Image},null,2)+'\n');
console.log('Exact authenticated native source and code-identical context adaptation prepared.');
