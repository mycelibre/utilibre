// Complete additive native source offer; no local operational/test logs published.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert.equal(process.argv[2],'--publish');assert.equal(process.argv.length,3);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',build=dir+'/wget-trixie',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),host=JSON.parse(fs.readFileSync(dir+'/wget-host.json'));assert.equal(host.status,'passed');assert.equal(sha('/usr/bin/wget'),host.native.binarySha256);
const temp=fs.mkdtempSync(dir+'/wget-source-'),files=[];
const copy=(from,to)=>{const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);files.push({path:to,sha256:sha(dest)});};
try{
 for(const f of ['wget_1.25.0.orig.tar.gz','wget_1.25.0-2+utilibre1.dsc','wget_1.25.0-2+utilibre1.debian.tar.xz','build-packages.lock'])copy(build+'/'+f,'wget/'+f);
 copy(dir+'/sources/wget_1.25.0.orig.tar.gz.asc','wget/wget_1.25.0.orig.tar.gz.asc');
 for(const f of ['wget_1.25.0-2.dsc','wget_1.25.0-2.debian.tar.xz','wget-c2640fe.patch','wget-dd692d9.patch','wget-f76978a.patch'])copy(dir+'/sources/'+f,'inputs/'+f);
 for(const f of fs.readdirSync(here).filter(f=>/wget|^README\.md$/.test(f)))copy(here+f,'recipes/'+f);
 fs.writeFileSync(temp+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),version:host.version,files,description:'Complete Debian native Wget source, GPL notices, original signature, three unchanged upstream security/regression commits, build inputs and isolated test/release recipes. dpkg-source -x extracts the native source; build-wget.sh uses Debian Trixie and disconnects networking before tests. All live package/binary hashes are in the private release receipt. No operational logs, credentials or user data. Use the latest utilibre-integration.tar.gz for subsequent recipe refinements.'},null,2)+'\n');
 const filename='security-wget-followup-20261012-source.tar.gz',archive=dir+'/'+filename;assert(!fs.existsSync(archive));cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const proof={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive),published:true};for(const out of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=out+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
 fs.writeFileSync(dir+'/wget-source-offer.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{fs.rmSync(temp,{recursive:true});}
