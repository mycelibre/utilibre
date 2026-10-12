import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {root,sha,read,version,packageSha256} from './common.mjs';
import {pins} from './verify-source.mjs';
process.umask(0o077);
assert([undefined,'--publish'].includes(process.argv[2])&&process.argv.length<=3);
const filename='security-heif-bookworm-20261012-source.tar.gz',archive=root+'/'+filename,recipe=path.dirname(new URL(import.meta.url).pathname),receipt=root+'/source-offer.json';
const originals=Object.keys(pins),modified=[`libheif_${version}.dsc`,`libheif_${version}.debian.tar.xz`];
const recipes=['README.md','prepare-build.sh','build-inner.sh','verify-source.mjs','source-scope.mjs','common.mjs','native.mjs','native.cc','overlay.cc','gdal-heif.cc','reader-probe.cc','stage.mjs','application.mjs','release.mjs','prepare-source-offer.mjs'];
if(process.argv[2]==='--publish'){
 const proof=read(receipt);assert.equal(proof.filename,filename);assert.equal(proof.sha256,sha(fs.readFileSync(archive)));assert.equal(proof.bytes,fs.statSync(archive).size);
 const allowed=new Set(['heif-bookworm/','heif-bookworm/manifest.json','heif-bookworm/sources/','heif-bookworm/recipes/',...[...originals,...modified].map(x=>'heif-bookworm/sources/'+x),...recipes.map(x=>'heif-bookworm/recipes/'+x)]);
 assert.deepEqual(new Set(execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n')),allowed);
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){
  const dest=base+'/'+filename;if(fs.existsSync(dest)){assert(fs.lstatSync(dest).isFile());assert.equal(sha(fs.readFileSync(dest)),proof.sha256);continue;}
  const stage=fs.mkdtempSync(base+'/.heif-source-');try{fs.copyFileSync(archive,stage+'/'+filename);fs.chmodSync(stage+'/'+filename,0o644);fs.renameSync(stage+'/'+filename,dest);}finally{fs.rmdirSync(stage);}
 }
 proof.published=true;proof.publishedAt=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}else{
 assert(!fs.existsSync(archive));assert.equal(read(root+'/native.json').status,'passed');assert.equal(read(root+'/application.json').status,'passed');
 const stage=fs.mkdtempSync(root+'/source-offer-'),dest=stage+'/heif-bookworm';fs.mkdirSync(dest+'/sources',{recursive:true});fs.mkdirSync(dest+'/recipes');
 for(const file of originals)fs.copyFileSync(root+'/sources/'+file,dest+'/sources/'+file);
 for(const file of modified)fs.copyFileSync(root+'/output/'+file,dest+'/sources/'+file);
 for(const file of recipes)fs.copyFileSync(recipe+'/'+file,dest+'/recipes/'+file);
 fs.writeFileSync(dest+'/manifest.json',JSON.stringify({date:'2026-10-12',version,packageSha256,sources:[...originals,...modified].map(file=>({file,sha256:sha(fs.readFileSync(dest+'/sources/'+file))})),changes:'All Debian fixes retained; two exact upstream one-line fixes with source-filename adaptation only. Full modified Debian quilt source included with original source/patches and notices.',sourceAuthentication:'Original Debian maintainer-signed .dsc verified against Debian keyring; local modified .dsc is unsigned, with SHA-pinned original provenance.'},null,2)+'\n');
 execFileSync('tar',['--sort=name','--mtime=2026-10-12T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'heif-bookworm']);
 const proof={date:new Date().toISOString(),filename,archive,bytes:fs.statSync(archive).size,sha256:sha(fs.readFileSync(archive)),published:false};fs.writeFileSync(receipt,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}
