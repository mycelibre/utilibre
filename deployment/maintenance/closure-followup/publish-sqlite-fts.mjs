// Additive complete corresponding source, excluding diagnostics and user data.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert(process.argv.length<=3);assert([undefined,'--publish'].includes(process.argv[2]));
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',build=dir+'/sqlite-fts-bookworm',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const release=read(dir+'/sqlite-fts-release.json');assert.equal(release.status,'passed');const roles=[];
for(const group of release.groups){assert.equal(group.status,'passed');for(const row of group.rows){assert.equal(cp.execFileSync('docker',['inspect',row.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),row.newImage);roles.push({name:row.name,image:row.newRef,imageId:row.newImage});}}
const temp=fs.mkdtempSync(dir+'/sqlite-fts-source-'),manifest=[];
const copy=(from,to)=>{assert(!to.split('/').includes('..'));const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);manifest.push({path:to,sha256:sha(dest)});};
try{
 for(const f of ['sqlite3_3.40.1.orig.tar.xz','sqlite3_3.40.1.orig-www.tar.xz','sqlite3_3.40.1-2+deb12u2+utilibre2.debian.tar.xz','sqlite3_3.40.1-2+deb12u2+utilibre2.dsc','build-packages.lock','fts-upstream.patch'])copy(build+'/'+f,'sqlite/'+f);
 for(const f of ['sqlite3_3.46.1-7+deb13u2.dsc','sqlite3_3.46.1-7+deb13u2.debian.tar.xz'])copy(dir+'/sources/'+f,'inputs/'+f);
 for(const f of fs.readdirSync(here).filter(f=>/sqlite|^README\.md$|^cache-release\.mjs$/.test(f)))copy(here+f,'recipes/closure-followup/'+f);
 for(const f of fs.readdirSync(here+'../sqlite-final').filter(f=>fs.statSync(here+'../sqlite-final/'+f).isFile()))copy(here+'../sqlite-final/'+f,'recipes/sqlite-final/'+f);
 fs.writeFileSync(temp+'/SHA256SUMS',manifest.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),roles,files:manifest,reproduction:'Extract the complete native Debian source package with dpkg-source. It includes the original DISTINCT repair and the unchanged upstream FTS bound patch from authenticated Trixie source. Native Bookworm packaging/ABI retained; no replacement glibc. SQLite public-domain declaration and Debian packaging notices retained in sources. The optional FTS test compatibility patch changes only test-local unhex and older error wording, not shipped library functionality. Follow build-sqlite-fts.sh and the recipes in the current utilibre-integration.tar.gz. 87 DISTINCT and seven compatible FTS tests plus native consumers/restore passed. No ASan claim, production content or private diagnostic logs included.'},null,2)+'\n');
 const filename='security-sqlite-fts-followup-20261012-source.tar.gz',archive=dir+'/'+filename;assert(!fs.existsSync(archive));cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const receipt={date:new Date().toISOString(),filename,sha256:sha(archive),bytes:fs.statSync(archive).size,published:false};
 if(process.argv.includes('--publish'))for(const out of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=out+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);receipt.published=true;}
 fs.writeFileSync(dir+'/sqlite-fts-source-offer.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{assert(path.dirname(temp)===dir&&path.basename(temp).startsWith('sqlite-fts-source-'));fs.rmSync(temp,{recursive:true});}
