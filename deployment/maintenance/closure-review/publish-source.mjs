// Additive matching source offer; never traverses runtime settings or user data.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {packages,specs,output} from '../js-closure/specs.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',publicRoot='/opt/utilibre/toolbox-public';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const release=read('closure-release-20261012.json');assert.equal(release.status,'passed');assert.equal(release.groups.length,10);
for(const g of release.groups)for(const r of g.rows)assert.equal(cp.execFileSync('docker',['inspect','--format','{{.Image}}',r.name],{encoding:'utf8'}).trim(),g.newImage);
const stage=fs.mkdtempSync(root+'/closure-public-source-'),filename='security-closure-20261012-source.tar.gz';
const copy=(source,destination)=>{fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);};
function untar(file,dest){fs.mkdirSync(dest,{recursive:true});const list=cp.execFileSync('tar',['-tzf',file],{encoding:'utf8',maxBuffer:8*1024**2}).trim().split('\n');assert(list.every(x=>!path.isAbsolute(x)&&!x.split('/').includes('..')));cp.execFileSync('tar',['--no-same-owner','-xzf',file,'-C',dest]);}
try{
 const apps=release.groups.map(g=>({application:g.key,image:g.newRef,imageId:g.newImage,baseImageId:g.oldImage}));
 // Original complete Anubis source + frontend assets; update exact tested locks.
 const anubis=publicRoot+'/anubis-utilibre.tar.gz';assert.equal(sha(fs.readFileSync(anubis)),'ff3d0031905fe52f6c5649af14d821d8a1313ac326a8f747c1e8db843e6d1f1e');untar(anubis,stage+'/anubis');
 for(const file of ['go.mod','go.sum'])copy(root+'/go-closure-20261012/anubis/anubis-'+file,stage+'/anubis/'+file);
 fs.writeFileSync(stage+'/anubis/UTILIBRE-SECURITY.json',JSON.stringify({...apps.find(x=>x.application==='anubis'),sourceCommit:'d39e26cedcc96bea5e4915297c756e7eec74aaf7',compiler:'go1.26.9',build:'Use included UTILIBRE-REBUILD.sh with these exact go.mod/go.sum; the original precompiled frontend assets remain unchanged.'},null,2)+'\n');
 const ferret=root+'/ferretdb-libraries-20261011/source.tar.gz';assert.equal(sha(fs.readFileSync(ferret)),'7f17d04d55e272365208291473045cbc3d8e460033a94b8085c373b22a57f5c1');untar(ferret,stage+'/ferretdb');
 const source=stage+'/ferretdb/FerretDB-0d5eb3343a50b800634cc08ace608bb6f3a3f74b';
 cp.execFileSync('patch',['--batch','--fuzz=0','-p1','-i',new URL('../go-closure/ferretdb-mcp-v1.patch',import.meta.url).pathname],{cwd:source,stdio:['ignore','ignore','pipe']});
 for(const file of ['go.mod','go.sum'])copy(root+'/go-closure-20261012/ferretdb/ferretdb-'+file,source+'/'+file);
 for(const name of ['version','commit','branch','package'])copy(new URL('../ferretdb-libraries/'+name+'.txt',import.meta.url),source+'/build/version/'+name+'.txt');
 copy(new URL('../go-closure/mcp_contract_test.go',import.meta.url),source+'/internal/mcp/utilibre_contract_test.go');
 fs.writeFileSync(source+'/UTILIBRE-REBUILD.sh','#!/bin/sh\nset -eu\ntest "$(go version)" = "go version go1.26.9 linux/amd64"\nexport GOTOOLCHAIN=local GOTELEMETRY=off CGO_ENABLED=0 GOAMD64=v1\ngo mod verify\nmkdir -p .git utilibre-output\ngo test -p 1 -mod=readonly ./internal/mcp -run "^TestUtilibre" -count=1\ngo build -p 1 -mod=readonly -trimpath -o utilibre-output/ferretdb ./cmd/ferretdb\n',{mode:0o755});
 // Exact dependency packages include the licenses delivered by their authors.
 for(const [name,pin]of Object.entries(packages)){
  const receipt=specs.map(s=>read('js-closure-20261012/'+s.key+'/build.json')).flatMap(x=>x.packages).find(x=>x.name===name);assert(receipt);
  const response=await fetch(receipt.tarball);assert(response.ok);const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length<4*1024**2);assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),pin.integrity);assert.equal(sha(bytes),receipt.archiveSha256);
  fs.mkdirSync(stage+'/javascript',{recursive:true});fs.writeFileSync(stage+'/javascript/'+name+'-'+pin.version+'.tgz',bytes);
 }
 for(const record of read('python-closure-20261012/sources.json')){const file=root+'/python-closure-20261012/'+record.file;assert.equal(sha(fs.readFileSync(file)),record.sha256);copy(file,stage+'/python/'+record.file);}
 for(const [directory,files]of [
  ['ssh-closure-20261012',['openssh_10.0p1.orig.tar.gz','openssh_10.0p1-7+deb13u4.debian.tar.xz','openssh_10.0p1-7+deb13u4.dsc','client-lifetime-backport.patch']],
  ['fips-closure-20261012',['openssl_3.5.7.orig.tar.gz','openssl_3.5.7-1~deb13u3.debian.tar.xz','openssl_3.5.7-1~deb13u3.dsc']],
 ])for(const file of files)copy(root+'/'+directory+'/'+file,stage+'/'+directory+'/'+file);
 for(const name of ['closure-review','js-closure','python-closure','go-closure']){
  const from=new URL('../'+name+'/',import.meta.url).pathname;
  for(const file of fs.readdirSync(from)){const p=from+file;assert(fs.lstatSync(p).isFile(),'Only reviewed flat recipe files');copy(p,stage+'/recipes/'+name+'/'+file);}
 }
 const manifest={date:new Date().toISOString(),kind:'Source addendum to unchanged application/privacy archives',applications:apps,repository:'https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/closure-review',instructions:'See recipes/closure-review/README.md. Pair with the existing complete application archives and utilibre-integration.tar.gz for runtime parents and shared test/release helpers. Anubis and FerretDB complete patched application trees are included. No production environment, logs, account records or secrets are included.',limits:'Dependency repairs are not a zero-vulnerability certification. Upstream notices/licenses are retained in the complete source and package archives.'};
 fs.writeFileSync(stage+'/SOURCES.json',JSON.stringify(manifest,null,2)+'\n');
 const archive=root+'/'+filename;cp.execFileSync('tar',['-czf',archive,'-C',stage,'.']);
 const receipt={date:new Date().toISOString(),filename,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,applications:apps,published:false};
 if(process.argv.includes('--publish')){
  for(const d of [publicRoot,'/opt/utilibre/records/public']){const dest=d+'/'+filename;assert(!fs.existsSync(dest),'Do not replace an existing distinct release offer');fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}receipt.published=true;
 }
 fs.writeFileSync(root+'/closure-source-offer-20261012.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({filename,sha256:receipt.sha256,bytes:receipt.bytes,published:receipt.published}));
}finally{assert(path.dirname(stage)===root&&path.basename(stage).startsWith('closure-public-source-'));fs.rmSync(stage,{recursive:true});}
