import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {root,sha,read,version,packageSha256} from './common.mjs';
process.umask(0o077);
assert([undefined,'--publish'].includes(process.argv[2])&&process.argv.length<=3);
const filename='security-tiff-bookworm-20261012-source-v2.tar.gz',archive=root+'/'+filename,recipe=path.dirname(new URL(import.meta.url).pathname),receipt=root+'/source-offer-v2.json';
const sources=['tiff_4.7.2-1.dsc','tiff_4.7.2-1.debian.tar.xz','tiff_4.7.2.orig.tar.bz2'];
const recipes=['README.md','acquire.sh','prepare-build.sh','build-inner.sh','verify-source.mjs','vendor-audit.mjs','common.mjs','native.mjs','stage.mjs','application.mjs','release.mjs','prepare-source-offer.mjs'];
if(process.argv[2]==='--publish'){
 const proof=read(receipt);assert.equal(proof.filename,filename);assert.equal(proof.sha256,sha(fs.readFileSync(archive)));assert.equal(proof.bytes,fs.statSync(archive).size);
 const allowed=new Set(['tiff-bookworm/','tiff-bookworm/manifest.json','tiff-bookworm/sources/','tiff-bookworm/recipes/',...sources.map(x=>'tiff-bookworm/sources/'+x),...recipes.map(x=>'tiff-bookworm/recipes/'+x),'tiff-bookworm/recipes/tiff-native.c']);
 assert.deepEqual(new Set(execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n')),allowed);
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){
  const dest=base+'/'+filename;if(fs.existsSync(dest)){assert(fs.lstatSync(dest).isFile());assert.equal(sha(fs.readFileSync(dest)),proof.sha256);continue;}
  const stage=fs.mkdtempSync(base+'/.tiff-source-');try{fs.copyFileSync(archive,stage+'/'+filename);fs.chmodSync(stage+'/'+filename,0o644);fs.renameSync(stage+'/'+filename,dest);}finally{fs.rmdirSync(stage);}
 }
 proof.published=true;proof.publishedAt=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}else{
 assert(!fs.existsSync(archive));assert.equal(read(root+'/native.json').status,'passed');assert.equal(read(root+'/application.json').status,'passed');
 const stage=fs.mkdtempSync(root+'/source-offer-'),dest=stage+'/tiff-bookworm';fs.mkdirSync(dest+'/sources',{recursive:true});fs.mkdirSync(dest+'/recipes');
 for(const file of sources)fs.copyFileSync(root+'/sources/'+file,dest+'/sources/'+file);
 for(const file of recipes)fs.copyFileSync(recipe+'/'+file,dest+'/recipes/'+file);
 fs.copyFileSync(root+'/recipes/tiff-native.c',dest+'/recipes/tiff-native.c');
 fs.writeFileSync(dest+'/manifest.json',JSON.stringify({date:'2026-10-12',version,packageSha256,sources:sources.map(file=>({file,sha256:sha(fs.readFileSync(dest+'/sources/'+file))})),changes:'Only the Debian changelog gains the native Bookworm version via build-inner.sh. Library and test source remain the official 4.7.2 release. Includes full upstream notices and Debian packaging.',sourceAuthentication:'Debian maintainer-signed .dsc, verified with Debian keyring. No newer-release binary installed.'},null,2)+'\n');
 execFileSync('tar',['--sort=name','--mtime=2026-10-12T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'tiff-bookworm']);
 const proof={date:new Date().toISOString(),filename,archive,bytes:fs.statSync(archive).size,sha256:sha(fs.readFileSync(archive)),published:false};fs.writeFileSync(receipt,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}
