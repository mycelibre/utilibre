// Code-only library supplement; full Penpot sources remain in their existing offers.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {proveGuava} from './guava-policy.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261103/guava';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputs=read(here+'guava-inputs.json'),b=read(root+'/penpot/build.json');
proveGuava(inputs.rows[0],b,read(root+'/penpot/native.json'),read(root+'/penpot/application.json'));
const filename='security-penpot-guava-20261104-source.tar.gz',archive=root+'/'+filename,destination='/opt/utilibre/toolbox-public/'+filename;
if(fs.existsSync(root+'/source-offer.json')){const r=read(root+'/source-offer.json');assert.equal(sha(destination),r.sha256);assert.equal(sha(archive),r.sha256);console.log('Existing source supplement unchanged.');process.exit(0);}
assert(!fs.existsSync(archive)&&!fs.existsSync(destination));const temp=fs.mkdtempSync(root+'/source-offer-');
try{
 fs.mkdirSync(temp+'/input');fs.mkdirSync(temp+'/recipe');
 for(const [file,pin]of Object.entries(inputs.files)){assert.equal(sha(root+'/input/'+file),pin.sha256);fs.copyFileSync(root+'/input/'+file,temp+'/input/'+file);}
 for(const file of ['guava-inputs.json','guava-build.py','GuavaSerializationCheck.java','guava-policy.mjs','guava-policy.test.mjs','check-guava-application.mjs'])fs.copyFileSync(here+file,temp+'/recipe/'+file);
 fs.writeFileSync(temp+'/REBUILD.txt',`Guava 33.7.2-jre (Apache-2.0) replaces both the primary copy and Closure Compiler v20250820's shaded copy. JarJar 1.14.1 (Apache-2.0) applies that compiler's exact upstream relocation rules. All inputs and hashes are in recipe/guava-inputs.json. Guava sources and embedded license notices are included. This is a library supplement, not the complete Penpot source archive. Existing Penpot 2.18.3 sources, earlier patches and runtime recipes remain necessary and separately available from Utilibre's software/source page.
Run the recipe from the repository with the exact recorded original Penpot JAR and immutable image present. It requires the declared local compiler image and downloaded input bytes; it does not resolve dependencies or refresh advisory data. Native serialization checks use networkless containers, synthetic data and a 128 MiB Java heap. Application checks use the existing isolated Penpot roundtrip suite. Docker is needed for isolated builds; never run unreviewed build code with a production management socket. Candidate preparation does not authorize deployment. No database schema or application configuration changes are part of this repair.
The recipe preserves every unrelated JAR entry and image layer. Its input SHA checks deliberately reject future upstream revisions. Repeated preparation recognizes the exact finished candidate. This is deterministic input validation, not a claim of byte-for-byte compiler or image reproducibility. Future rebuilds must either replay this overlay on its exact baseline or review a newly supported baseline; merely updating the unshaded Guava dependency does not repair the shaded copy.
`);
 cp.execFileSync('tar',['--sort=name','--mtime=2026-11-04T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',temp,'.'],{timeout:60000});
 fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);
 const r={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive),published:true};fs.writeFileSync(root+'/source-offer.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
}finally{fs.rmSync(temp,{recursive:true});}
