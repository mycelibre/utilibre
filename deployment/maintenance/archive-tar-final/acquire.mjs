// Pinned upstream module release; no interpreter upgrade or live installation.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/archive-tar-final-20261012';
fs.mkdirSync(root,{recursive:true});
const url='https://cpan.metacpan.org/authors/id/B/BI/BINGOS/Archive-Tar-3.14.tar.gz';
const expected='177ce0506124afbe3ef95836761fb0799c941b87b79bac489bddc6cda860d904';
const hash=b=>createHash('sha256').update(b).digest('hex');
const metadata=await fetch('https://fastapi.metacpan.org/v1/release/Archive-Tar',{signal:AbortSignal.timeout(30000)});assert(metadata.ok);
const current=await metadata.json();assert.equal(current.version,'3.14');assert.equal(current.download_url,url);assert.equal(current.checksum_sha256,expected);assert.deepEqual(current.license,['perl_5']);
const archive=root+'/Archive-Tar-3.14.tar.gz';
if(!fs.existsSync(archive)){const r=await fetch(url,{signal:AbortSignal.timeout(30000),redirect:'error'});assert(r.ok);const b=Buffer.from(await r.arrayBuffer());assert(b.length<1024**2);assert.equal(hash(b),expected);fs.writeFileSync(archive,b,{flag:'wx'});}
assert.equal(hash(fs.readFileSync(archive)),expected);
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',maxBuffer:4e6}).trim();
const members=run('tar',['-tzf',archive]).split('\n');assert(members.every(p=>p.startsWith('Archive-Tar-3.14/')&&!p.split('/').includes('..')));
if(!fs.existsSync(root+'/Archive-Tar-3.14'))run('tar',['-xzf',archive,'-C',root,'--no-same-owner']);
const source=root+'/Archive-Tar-3.14';
assert(run('tar',['-tvzf',archive]).split('\n').every(l=>l.startsWith('-')||l.startsWith('d')),'No source symlinks');
const body=fs.readFileSync(source+'/lib/Archive/Tar.pm','utf8');assert(body.includes('$MAX_FILE_SIZE')&&body.includes('refusing to allocate'));assert(body.includes('$VERSION')&&body.includes('3.14'));
const receipt={date:new Date().toISOString(),status:'passed',version:'3.14',url,archiveSha256:expected,bytes:fs.statSync(archive).size,license:'perl_5',authentication:'HTTPS official CPAN archive with matching independently retrieved MetaCPAN release SHA256; not a claim of a detached signature',upstreamRegression:'https://github.com/jib/archive-tar-new/issues/47 remains open; no universal DoS safety claim'};
fs.writeFileSync(root+'/source.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
