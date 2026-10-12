// Additive source offer. Never publish build logs, configuration or user data.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert.deepEqual(process.argv.slice(2),['--publish']);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012';
const build=dir+'/python-system/build',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(read(dir+'/python-system-release.json').status,'passed');
assert.equal(read(dir+'/python-system-host.json').status,'passed');
assert.equal(read(dir+'/urllib3-release.json').status,'passed');
assert.equal(read(dir+'/urllib3-host.json').status,'passed');
assert.equal(sha(build+'/python3.13_3.13.16.orig.tar.xz'),'f4b1bfb3c79b5bb11b8d228a12504163b4c0dab4d679828d8f5f26b6cb6ab35d');
const temp=fs.mkdtempSync(dir+'/python-source-'),files=[];
const copy=(from,to)=>{const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);files.push({path:to,sha256:sha(dest)});};
try{
 for(const f of ['python3.13_3.13.16.orig.tar.xz','python3.13_3.13.16-1~deb13u1+utilibre1.dsc','python3.13_3.13.16-1~deb13u1+utilibre1.debian.tar.xz','build-packages.lock'])copy(build+'/'+f,'python/'+f);
 for(const f of ['python3.13_3.13.15-1.dsc','python3.13_3.13.15-1.debian.tar.xz','python-urllib3_2.8.0-2.dsc','python-urllib3_2.8.0-2.debian.tar.xz','python-urllib3_2.8.0.orig.tar.gz','expat_2.9.0-1.dsc','expat_2.9.0-1.debian.tar.xz','expat_2.9.0.orig.tar.gz'])copy(dir+'/sources/'+f,'inputs/'+f);
 for(const f of fs.readdirSync(here).filter(f=>/python|urllib3|^README\.md$|^cache-release\.mjs$|^advisory-rebind-patch\.mjs$/.test(f)))copy(here+f,'recipes/'+f);
 fs.writeFileSync(temp+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),version:'3.13.16-1~deb13u1+utilibre1',files,description:'Native CPython 3.13.16 source and modified Debian source package, upstream licence notices, source inputs, Expat and urllib3 source, bounded native build/test/release recipes. Extract python/*.dsc with dpkg-source -x; build-python-system.sh uses the pinned Debian Trixie build environment and disconnects network before compilation/tests. Signed Debian Requests remains unmodified and includes its Python source in the installed package. Shared helpers and subsequent recipe changes are in the Utilibre integration source archive. No operational logs, private configuration or user data.'},null,2)+'\n');
 const filename='security-python-followup-20261012-source.tar.gz',archive=dir+'/'+filename;
 assert(!fs.existsSync(archive));cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const proof={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive),published:true};
 for(const out of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=out+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
 fs.writeFileSync(dir+'/python-source-offer.json',JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify(proof));
}finally{fs.rmSync(temp,{recursive:true});}
