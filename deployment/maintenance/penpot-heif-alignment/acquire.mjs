// Authenticate exact existing system payload through signed Debian indexes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,sha,run,docker,current} from './stage.mjs';
process.umask(0o077);assert(!fs.existsSync(root+'/source.json'));
const dir=root+'/sources',origin='https://deb.debian.org/debian-security',version='1.23.4-1~deb13u1';
const get=async(url,file)=>{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});assert(r.ok);const b=Buffer.from(await r.arrayBuffer());assert(b.length<10*1024**2);fs.writeFileSync(dir+'/'+file,b);return b;};
docker('cp',dir+'/InRelease','maintenance-sudo-bookworm-build:/tmp/heif-alignment-InRelease');
const signature=docker('exec','maintenance-sudo-bookworm-build','gpgv','--status-fd','1','--keyring','/usr/share/keyrings/debian-archive-keyring.gpg','/tmp/heif-alignment-InRelease');
assert.match(signature,/VALIDSIG 89C87ACEA5DD6B8E6A7068808E9F831205B4BA95/);
const release=fs.readFileSync(dir+'/InRelease','utf8'),block=release.split('SHA256:\n')[1].split('\nSHA')[0];
async function index(path,file){const b=fs.existsSync(dir+'/'+file)?fs.readFileSync(dir+'/'+file):await get(origin+'/dists/trixie-security/'+path,file);const line=block.split('\n').find(l=>l.trim().endsWith(' '+path));assert(line);const [hash,size]=line.trim().split(/\s+/);assert.equal(sha(b),hash);assert.equal(b.length,Number(size));return run('xz',['-dc',dir+'/'+file]);}
const sources=await index('main/source/Sources.xz','Sources.xz'),packages=await index('main/binary-amd64/Packages.xz','Packages.xz');
const source=sources.split('\n\n').find(p=>p.startsWith('Package: libheif\n')&&p.includes('\nVersion: '+version+'\n'));assert(source);
const checks=source.split('Checksums-Sha256:\n')[1].split(/\n\S/)[0].trim().split('\n').map(l=>l.trim().split(/\s+/));
for(const[hash,size,file]of checks){assert(/^libheif_[a-z0-9.+~_-]+\.(dsc|tar\.(gz|xz))$/.test(file));let b=fs.existsSync(dir+'/'+file)?fs.readFileSync(dir+'/'+file):await get(origin+'/pool/updates/main/libh/libheif/'+file,file);assert.equal(sha(b),hash);assert.equal(b.length,Number(size));}
const pkg=packages.split('\n\n').find(p=>p.startsWith('Package: libheif1\n')&&p.includes('\nVersion: '+version+'\n'));assert(pkg);
const file=pkg.match(/^Filename: (.+)$/m)[1];assert(/^pool\/updates\/main\/libh\/libheif\/libheif1_[a-z0-9.+~_-]+_amd64\.deb$/.test(file));const name=file.split('/').at(-1),b=await get(origin+'/'+file,name);assert.equal(sha(b),pkg.match(/^SHA256: ([a-f0-9]{64})$/m)[1]);
const extracted=fs.mkdtempSync(root+'/authenticated-payload-');run('dpkg-deb',['-x',dir+'/'+name,extracted]);assert.equal(sha(fs.readFileSync(extracted+'/usr/lib/x86_64-linux-gnu/libheif.so.1')),current);
const record={date:new Date().toISOString(),status:'passed',version,method:'Debian archive-signed InRelease → SHA256 Sources/Packages indexes → complete source and exact binary payload',signature,sourceFiles:checks.map(([sha256,size,file])=>({file,sha256,bytes:Number(size)})),binary:{file:name,sha256:sha(b),librarySha256:current},sourceDscIndividualMaintainerKeyUnavailable:true,archiveAuthenticationPassed:true};fs.writeFileSync(root+'/source.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:'passed',version,librarySha256:current,completeSourceFiles:checks.length}));
