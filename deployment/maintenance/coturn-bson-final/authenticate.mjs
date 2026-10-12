import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/coturn-bson-final-20261012';
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(c,a)=>cp.execFileSync(c,a,{encoding:'utf8',timeout:30000,maxBuffer:64e6,stdio:['ignore','pipe','pipe']});
const key=root+'/output/debian-archive-keyring.pgp',proof=[];
for(const stem of ['deb.debian.org_debian_dists_trixie','deb.debian.org_debian-security_dists_trixie-security']){
 const dir=root+'/output/apt-lists',release=dir+'/'+stem+'_InRelease',temp=fs.mkdtempSync(root+'/signed-release-');
 run('sqv',['--keyring',key,'--cleartext','--output',temp+'/verified',release]);
 const text=fs.readFileSync(temp+'/verified','utf8'),sources=Buffer.from(run('/usr/lib/apt/apt-helper',['cat-file',dir+'/'+stem+'_main_source_Sources.lz4']));
 const line=text.split('\nSHA256:\n')[1]?.split('\n').find(l=>l.trim().endsWith(' main/source/Sources'));assert(line);
 const [hash,size]=line.trim().split(/\s+/);assert.equal(sha(sources),hash);assert.equal(sources.length,Number(size));
 const stanza=sources.toString().split('\n\n').find(s=>s.startsWith('Package: mongo-c-driver\n')&&s.includes('\nVersion: 1.30.4-1+deb13u3\n'));
 if(stanza){const files=stanza.split('Checksums-Sha256:\n')[1].split(/\n\S/)[0].trim().split('\n').map(l=>l.trim().split(/\s+/));for(const [h,n,file]of files){assert(/^mongo-c-driver_[A-Za-z0-9.+~-]+\.(?:dsc|tar\.(?:gz|xz))$/.test(file));const b=fs.readFileSync(root+'/input/'+file);assert.equal(sha(b),h);assert.equal(b.length,Number(n));}proof.push({releaseSha256:sha(fs.readFileSync(release)),sourcesSha256:hash,sourceFiles:files.map(([sha256,bytes,file])=>({file,sha256,bytes:Number(bytes)}))});}
}
assert.equal(proof.length,1);
assert.deepEqual(Object.fromEntries(proof[0].sourceFiles.map(f=>[f.file,f.sha256])),{
 'mongo-c-driver_1.30.4-1+deb13u3.dsc':'79b5a04b92980bd52490a04294011b2ba318ebfaa407fdc210bffca99073b603',
 'mongo-c-driver_1.30.4.orig.tar.gz':'2883a6d61251b881530566d79cedc48de9694ff88f01bf2452306434d18cc74c',
 'mongo-c-driver_1.30.4-1+deb13u3.debian.tar.xz':'887ac73a6096ec28c0e14968aa8c312fa78d3d0df868e190cd32adbdfe94dbc7',
});
const commit='7e4c66515a46abaf2f488ed0fe5a5c21887b6e1d',file=root+'/input/'+commit+'.patch';
if(!fs.existsSync(file)){const r=await fetch('https://github.com/mongodb/mongo-c-driver/commit/'+commit+'.patch',{signal:AbortSignal.timeout(30000)});assert(r.ok);const patch=await r.text();assert(patch.startsWith('From '+commit+' '));assert(patch.includes('CDRIVER-6409 fix OCSP double free'));fs.writeFileSync(file,patch,{flag:'wx'});}
assert.equal(sha(fs.readFileSync(file)),'8db858ba069173e7de8e9b78fed1fb9334a895107f0b2b27d6ba3f8b185360f6');
const record={date:new Date().toISOString(),status:'passed',version:'1.30.4-1+deb13u3',keySha256:sha(fs.readFileSync(key)),...proof[0],commit,patchSha256:sha(fs.readFileSync(file)),method:'Debian archive-key verified InRelease → complete Sources hash → exact DSC/original/Debian archives; upstream stable 1.30 commit downloaded by exact hash',productionChanged:false};
fs.writeFileSync(root+'/authenticated.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
