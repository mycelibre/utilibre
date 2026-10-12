// Additive corresponding source offer. No operational logs or user content.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const release=JSON.parse(fs.readFileSync(dir+'/gzip-release.json'));assert.equal(release.status,'passed');
const roles=[];for(const group of release.groups){assert.equal(group.status,'passed');for(const row of group.rows){assert.equal(cp.execFileSync('docker',['inspect',row.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),row.newImage);roles.push({name:row.name,image:row.newRef,imageId:row.newImage});}}
const temp=fs.mkdtempSync(dir+'/gzip-source-'),manifest=[];
const copy=(from,to)=>{assert(!to.split('/').includes('..'));const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);manifest.push({path:to,sha256:sha(dest)});};
try{
 for(const f of ['gzip_1.14.orig.tar.xz','gzip_1.14.orig.tar.xz.asc','gzip_1.14-1~deb12u1+utilibre1.debian.tar.xz','gzip_1.14-1~deb12u1+utilibre1.dsc','build-packages.lock','SHA256SUMS'])copy(dir+'/gzip-bookworm/'+f,'gzip/'+f);
 for(const f of ['gzip_1.14-1.dsc','gzip_1.14-1.debian.tar.xz'])copy(dir+'/sources/'+f,'inputs/'+f);
 for(const f of fs.readdirSync(here).filter(f=>/gzip|^README\.md$|^cache-release\.mjs$/.test(f)))copy(here+f,'recipes/closure-followup/'+f);
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),roles,files:manifest,reproduction:'Debian source authenticated through signed Sources indexes. Only local version/changelog changed beyond official Debian 1.14 packaging and its upstream security patches. Use dpkg-source on the complete native source package; build-gzip.sh reproduces it with Bookworm dependencies. Actual commands are provided in the current utilibre-integration.tar.gz. GNU gzip GPL notices retained. Ubuntu role uses the unchanged signed vendor 1.12-1ubuntu3.2 package, obtained by acquire-gzip-ubuntu.sh; vendor source: https://launchpad.net/ubuntu/+source/gzip/1.12-1ubuntu3.2. No production data or private diagnostics included.'},null,2)+'\n');
 const filename='security-gzip-followup-20261012-source.tar.gz',archive=dir+'/'+filename;assert(!fs.existsSync(archive));cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const receipt={date:new Date().toISOString(),filename,sha256:sha(archive),bytes:fs.statSync(archive).size,published:false};
 if(process.argv.includes('--publish'))for(const out of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=out+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);receipt.published=true;}
 fs.writeFileSync(dir+'/gzip-source-offer.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{assert(path.dirname(temp)===dir&&path.basename(temp).startsWith('gzip-source-'));fs.rmSync(temp,{recursive:true});}
