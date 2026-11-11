// No secrets or saved data enter source offers. Archive only pinned Git trees.
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,copyFileSync,writeFileSync,existsSync,readFileSync,chmodSync,statSync} from 'node:fs';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const repo='/home/ubuntu/freetools';
if(!process.argv.slice(2).length||process.argv.slice(2).includes('candlr'))throw Error('Retired Candlr source recipe: use deployment/maintenance/security-20261109/publish-application-sources.py candlr --held-nov11; publish Bookplate separately');
const out='/opt/utilibre/records/public';mkdirSync(out,{recursive:true});
const items=[['candlr','c8ac0eb11703e92c6daa3ad7908f2f219265e1a3'],['bookplate','47e53a7aec56aa9e76d4cf425deb48102e4a2fd7']];
const nov4=process.argv.includes('--candlr-nov4'),evidence='/var/lib/utilibre-maintenance/security-20261103/candlr';
const selected=process.argv.slice(2).filter(a=>a!=='--candlr-nov4');if(nov4){assert.deepEqual(selected,['candlr']);for(const n of ['build','native','browser','dependencies'])assert(JSON.parse(readFileSync(evidence+'/'+n+'.json')).passed);assert.equal(createHash('sha256').update(readFileSync(repo+'/deployment/candlr/security-package-lock.json')).digest('hex'),JSON.parse(readFileSync(evidence+'/client-build.json')).lockSha256);}if(selected.some(id=>!items.some(([key])=>key===id)))throw Error('Unknown source offer');
for(const [id,revision] of items.filter(([id])=>!selected.length||selected.includes(id))){
 const source='/opt/utilibre/evaluation-src/'+id+'-20261011';
 if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!==revision)throw Error('Source mismatch');
 const stage=mkdtempSync('/opt/utilibre/records-source-');
 execFileSync('git',['archive','--format=tar','--prefix='+id+'/', '--output='+stage+'/source.tar',revision],{cwd:source});
 execFileSync('tar',['-xf',stage+'/source.tar','-C',stage]);
 mkdirSync(stage+'/'+id+'/utilibre');
 copyFileSync(repo+'/deployment/'+id+'/prepare.mjs',stage+'/'+id+'/utilibre/prepare.mjs');
 if(id==='bookplate')copyFileSync(repo+'/deployment/bookplate/security-package-lock.json',stage+'/'+id+'/utilibre/security-package-lock.json');
 if(id==='candlr'){copyFileSync(repo+'/deployment/candlr/Dockerfile',stage+'/'+id+'/utilibre/Dockerfile');copyFileSync(repo+'/deployment/candlr/security-package-lock.json',stage+'/'+id+'/utilibre/security-package-lock.json');}
 writeFileSync(stage+'/'+id+'/utilibre/BUILD.txt',`Upstream ${revision}. Utilibre privacy packaging, 11 October 2026.\nRun prepare.mjs against a Git checkout at this exact commit, then use ${id==='candlr'?'utilibre/Dockerfile':'Dockerfile'} to build. The original tree is included; prepare.mjs records all modifications. Production secrets and saved content are not build inputs.\n`);
 if(nov4){
  for(const [family,names] of [['security-20261022',['build-dom-client.mjs','build-dom-client.sh']],['security-20261103',['candlr-inputs.json','candlr-privacy.patch','check-markmap-dependencies.mjs','check-candlr-browser.mjs']]]){
   const dest=stage+'/'+id+'/utilibre/maintenance/'+family;mkdirSync(dest,{recursive:true});for(const n of names)copyFileSync(repo+'/deployment/maintenance/'+family+'/'+n,dest+'/'+n);
  }
  writeFileSync(stage+'/'+id+'/utilibre/BUILD.txt',`Upstream ${revision}, Candlr 2.0.0. The 4 November build pins Sharp 0.35.5, source-map-js 1.2.2, Undici 8.12.2 and Vite 8.3.3, with the complete npm integrity lock. Use prepare.mjs on this exact Git checkout before the original Dockerfile. The deployed candidate instead overlays only the rebuilt dist and unchanged-version DOMPurify on the exact already-hardened image in candlr-inputs.json; the original Dockerfile alone does NOT reproduce those runtime repairs. The maintained build-dom-client.mjs candlr --nov4 profile verifies every source file, performs separate explicit acquisition and offline building, and supports --replay. Repository/retained-cache paths are operator inputs. Previous runtime repairs and their source supplements remain required. No production configurations, keys or user data are build inputs.\n`);
 }
 if(existsSync(out+'/'+id+'-utilibre.tar.gz'))copyFileSync(out+'/'+id+'-utilibre.tar.gz',stage+'/previous-source.tar.gz');
 execFileSync('tar',['-czf',out+'/'+id+'-utilibre.tar.gz','-C',stage,id]);
 if(nov4){
  const file='candlr-inputs-20261104-source.tar.gz',bytes=readFileSync(out+'/'+id+'-utilibre.tar.gz'),sha256=createHash('sha256').update(bytes).digest('hex');assert(!existsSync(out+'/'+file));writeFileSync(out+'/'+file,bytes,{flag:'wx',mode:0o644});chmodSync(out+'/'+file,0o644);chmodSync(out+'/'+id+'-utilibre.tar.gz',0o644);
  const url='https://candlr.utilibre.org/utilibre-source/'+file,response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),sha256);
  writeFileSync(evidence+'/source-offer.json',JSON.stringify({date:new Date().toISOString(),imageId:JSON.parse(readFileSync(evidence+'/build.json')).imageId,published:true,publicHashVerified:true,url,sha256,bytes:statSync(out+'/'+file).size,previousArchive:stage+'/previous-source.tar.gz'},null,2)+'\n');
 }

}
if(!selected.length)writeFileSync(out+'/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="description" content="Source code and privacy packaging for Utilibre records services."><title>Source code · Utilibre</title><h1>Source code / Código fuente</h1><p>Upstream notices and build instructions are included. No account data is included.</p><ul><li><a href="candlr-utilibre.tar.gz">Candlr 2.0.0 + privacy patch (GPL-3.0)</a></li><li><a href="bookplate-utilibre.tar.gz">Bookplate 1.1.0 + privacy patch (Apache-2.0)</a></li></ul><p><a href="https://utilibre.org/">Utilibre</a></p>');
console.log('Published source offers without secrets or saved data.');
