// Download four exact payloads using the retained signed DHI index. No APT,
// runtime metadata, application, package install or user data changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readIndexes} from '../xserver-followup/authenticate-dhi.mjs';
import {archives} from './policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/dhi-binary-attribution-20261012';
fs.mkdirSync(root+'/packages',{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const index=readIndexes().find(x=>x.name==='main/binary-amd64/Packages');assert(index);
const parse=s=>Object.fromEntries(s.split('\n').filter(l=>/^[\w-]+: /.test(l)).map(l=>[l.slice(0,l.indexOf(':')),l.slice(l.indexOf(':')+2)]));
const stanzas=index.text.split(/\n\s*\n/).map(parse),evidence=[];
for(const [name,pin]of Object.entries(archives)){
 const matches=stanzas.filter(s=>s.Package===name&&s.Version===pin.version);assert.equal(matches.length,1);const s=matches[0];assert.equal(s.SHA256,pin.sha256);
 assert(/^pool\/trixie\/main\/[a-z0-9/_.+~:-]+_amd64\.deb$/.test(s.Filename));assert(!s.Filename.split('/').includes('..'));assert(Number(s.Size)<6*1024**2);
 const file=s.Filename.split('/').at(-1),destination=root+'/packages/'+file;
 if(!fs.existsSync(destination)){const r=await fetch('https://dhi.io/deb/debian/main/'+s.Filename,{signal:AbortSignal.timeout(30000),redirect:'error'});assert(r.ok);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,Number(s.Size));assert.equal(sha(b),pin.sha256);fs.writeFileSync(destination,b,{flag:'wx'});}
 const b=fs.readFileSync(destination);assert.equal(sha(b),pin.sha256);assert.equal(b.length,Number(s.Size));evidence.push({package:name,version:pin.version,file,sha256:pin.sha256,bytes:b.length});
}
const receipt={date:new Date().toISOString(),status:'passed',signedIndexSha256:index.hash,method:'Reverified pinned DHI key and clear-signed InRelease, matching compressed Packages SHA256, exact package stanza and complete archive SHA256',archives:evidence,productionChanged:false};
fs.writeFileSync(root+'/acquisition.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:'passed',archives:evidence.length,bytes:evidence.reduce((n,a)=>n+a.bytes,0),productionChanged:false}));
