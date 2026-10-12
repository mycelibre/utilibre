// Additive source-only release. No credentials, application state or logs.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/closure-followup-20261012',here=fileURLToPath(new URL('.',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(root+'/'+p)),sha=b=>createHash('sha256').update(b).digest('hex');
for(const p of ['host-release.json','bind-release.json','expat-release.json'])assert.equal(read(p).status,'passed');
const release=read('expat-release.json');
for(const g of release.groups)assert.equal(cp.execFileSync('docker',['inspect','--format','{{.Image}}',g.name],{encoding:'utf8'}).trim(),g.newImage);
const temp=fs.mkdtempSync(root+'/public-source-'),filename='security-native-followup-20261012-source.tar.gz';
const manifest=[];
function copy(source,relative){assert(!relative.split('/').includes('..'));const dest=path.join(temp,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);manifest.push({path:relative,sha256:sha(fs.readFileSync(dest))});}
try{
 for(const file of fs.readdirSync(root+'/sources'))if(/^(?:bind9|expat|vim)_[A-Za-z0-9.+~_-]+\.(?:dsc|(?:orig|debian)\.tar\.(?:gz|xz)(?:\.asc)?)$/.test(file)||/^Python-3\.(?:11\.17|13\.16|14\.6)\.tar\.xz$/.test(file))copy(root+'/sources/'+file,'upstream/'+file);
 for(const file of ['rules','bind9.install','changelog'])copy(root+'/sources/bind9-9.20.29/debian/'+file,'bind9-modified-debian/'+file);
 for(const file of fs.readdirSync(here)){assert(fs.statSync(here+file).isFile());copy(here+file,'recipes/'+file);}
 const info={date:new Date().toISOString(),applications:release.groups.map(g=>({application:g.key,image:g.newRef,imageId:g.newImage})),host:{vim:'2:9.2.0858-1',expat:'2.9.0-1',bind:'1:9.20.29-1~deb13u1+utilibre1'},files:manifest,instructions:'Use the recipes with the existing complete application source offers and utilibre-integration.tar.gz. Only CPython pyexpat is rebuilt; no interpreter or app source is changed. BIND uses upstream --without-lmdb; the modified Debian packaging files are included. Original licenses remain in the full source archives.',limits:'This source addendum is not a claim of zero vulnerabilities. No production secrets, logs or user content are included.'};
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify(info,null,2)+'\n');
 const archive=root+'/'+filename;cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const receipt={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(fs.readFileSync(archive)),published:false};
 if(process.argv.includes('--publish')){
  for(const directory of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=directory+'/'+filename;assert(!fs.existsSync(dest),'Do not overwrite a release offer');fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}receipt.published=true;
 }
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{assert(path.dirname(temp)===root&&path.basename(temp).startsWith('public-source-'));fs.rmSync(temp,{recursive:true});}
