// Publish only an explicit source allowlist after a passed exact native release.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);assert.deepEqual(process.argv.slice(2),['--publish']);
const root='/var/lib/utilibre-maintenance/host-python-vendor-followup-20261012',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const release=JSON.parse(fs.readFileSync(root+'/release.json'));assert.equal(release.status,'passed');
cp.execFileSync(process.execPath,[here+'verify-source.mjs'],{stdio:'pipe'});
const sums=new Map(fs.readFileSync(root+'/build/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
const temp=fs.mkdtempSync(root+'/source-offer-'),files=[];
const copy=(from,to)=>{assert(!path.isAbsolute(to)&&!to.split('/').includes('..'));assert(fs.lstatSync(from).isFile());const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);files.push({path:to,sha256:sha(dest)});};
try{
 for(const f of ['setuptools_78.1.1.orig.tar.gz','setuptools_78.1.1-0.1+utilibre1.dsc','setuptools_78.1.1-0.1+utilibre1.debian.tar.xz']){assert.equal(sha(root+'/build/'+f),sums.get(f));copy(root+'/build/'+f,'native/'+f);}
 copy(root+'/build/build-packages.lock','native/build-packages.lock');
 for(const f of ['setuptools_78.1.1-0.1.dsc','setuptools_78.1.1-0.1.debian.tar.xz','upstream-3b16eec9.patch'])copy(root+'/sources/'+f,'inputs/'+f);
 for(const f of ['README.md','review.sources','acquire.sh','context.patch','verify-source.mjs','inner.sh','build.sh','check.py','compare.py','release.mjs','review.mjs','publish-source.mjs'])copy(here+f,'recipes/'+f);
 fs.writeFileSync(temp+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),version:'78.1.1-0.1+utilibre1',files,reproduction:'Complete native stable setuptools source with exact upstream jaraco.context extraction-filter repair, notices and reproducible recipes. Extract native/*.dsc with dpkg-source -x and rebuild with the included Trixie dependency lock; original archives are under native/, authentic original packaging and upstream patch under inputs/. Read README for bounded original-input build and native tests. Current shared scanner/protection helpers are in the existing Utilibre integration source offer. No package binary, operational log, secret or user data included.'},null,2)+'\n');
 const filename='security-host-python-vendor-20261012-source.tar.gz',archive=root+'/'+filename;assert(!fs.existsSync(archive));
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert(!fs.existsSync(base+'/'+filename));
 cp.execFileSync('tar',['-czf',archive,'-C',temp,'.'],{timeout:60000});
 const proof={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive),published:true};
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=base+'/'+filename;fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{assert(path.dirname(temp)===root&&path.basename(temp).startsWith('source-offer-'));fs.rmSync(temp,{recursive:true});}
